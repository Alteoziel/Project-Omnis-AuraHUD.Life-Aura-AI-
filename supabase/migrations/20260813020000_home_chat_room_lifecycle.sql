-- Home Chat rooms are pairing records only. Refresh / leave often kills the
-- async close RPC before it lands, so leftover rooms hit the host cap.
-- Starting a new chat now replaces this user's previous rooms.

alter table public.home_chat_rooms
  alter column expires_at set default (now() + interval '15 minutes');

create or replace function public.close_my_home_chat_rooms()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  delete from public.home_chat_rooms
  where host_user_id = auth.uid()
     or guest_user_id = auth.uid();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.close_my_home_chat_rooms()
  from public, anon;
grant execute on function public.close_my_home_chat_rooms()
  to authenticated, service_role;

create or replace function public.create_home_chat_room(
  p_code text,
  p_public_key text
)
returns public.home_chat_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.home_chat_rooms;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if p_code is null or p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    raise exception 'Invalid Home Chat code.';
  end if;
  if p_public_key is null or char_length(p_public_key) < 40 or char_length(p_public_key) > 200 then
    raise exception 'Invalid pairing key.';
  end if;

  perform public.purge_expired_home_chat_rooms();

  delete from public.home_chat_rooms
  where host_user_id = auth.uid();

  insert into public.home_chat_rooms (
    code,
    host_user_id,
    host_public_key
  ) values (
    p_code,
    auth.uid(),
    p_public_key
  )
  returning * into room;

  return room;
end;
$$;
