-- Home Chat: ephemeral nearby pairing rooms (SDP/ICE + public keys only).
-- Message bodies and photos never land in this table — they travel encrypted
-- on the device-to-device data channel after pairing.

create table if not exists public.home_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null
    check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'),
  host_user_id uuid not null references auth.users (id) on delete cascade,
  guest_user_id uuid references auth.users (id) on delete cascade,
  host_public_key text
    check (host_public_key is null or char_length(host_public_key) between 40 and 200),
  guest_public_key text
    check (guest_public_key is null or char_length(guest_public_key) between 40 and 200),
  host_signal jsonb not null default '[]'::jsonb,
  guest_signal jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  constraint home_chat_rooms_host_signal_size
    check (pg_column_size(host_signal) < 120000),
  constraint home_chat_rooms_guest_signal_size
    check (pg_column_size(guest_signal) < 120000)
);

create unique index if not exists home_chat_rooms_code_uidx
  on public.home_chat_rooms (code);

create index if not exists home_chat_rooms_host_idx
  on public.home_chat_rooms (host_user_id, expires_at desc);

alter table public.home_chat_rooms enable row level security;

drop policy if exists "home_chat_rooms_select_members" on public.home_chat_rooms;
create policy "home_chat_rooms_select_members"
on public.home_chat_rooms for select
to authenticated
using (
  auth.uid() = host_user_id
  or auth.uid() = guest_user_id
);

revoke all on table public.home_chat_rooms from public, anon;
grant select on table public.home_chat_rooms to authenticated;
grant all on table public.home_chat_rooms to service_role;

create or replace function public.purge_expired_home_chat_rooms()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.home_chat_rooms
  where expires_at < pg_catalog.now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_home_chat_rooms()
  from public, anon;
grant execute on function public.purge_expired_home_chat_rooms()
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
  active_count integer;
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

  select count(*) into active_count
  from public.home_chat_rooms r
  where r.host_user_id = auth.uid()
    and r.expires_at > pg_catalog.now();
  if active_count >= 3 then
    raise exception 'Too many active Home Chat rooms. Close one and try again.';
  end if;

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

revoke all on function public.create_home_chat_room(text, text)
  from public, anon;
grant execute on function public.create_home_chat_room(text, text)
  to authenticated, service_role;

create or replace function public.join_home_chat_room(
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

  select * into room
  from public.home_chat_rooms r
  where r.code = p_code
    and r.expires_at > pg_catalog.now()
  for update;

  if room.id is null then
    raise exception 'That Home Chat code is not active.';
  end if;

  if room.guest_user_id is not null and room.guest_user_id <> auth.uid() then
    raise exception 'That Home Chat is already in use.';
  end if;

  update public.home_chat_rooms
  set
    guest_user_id = auth.uid(),
    guest_public_key = p_public_key
  where id = room.id
  returning * into room;

  return room;
end;
$$;

revoke all on function public.join_home_chat_room(text, text)
  from public, anon;
grant execute on function public.join_home_chat_room(text, text)
  to authenticated, service_role;

create or replace function public.home_chat_append_signal(
  p_room_id uuid,
  p_role text,
  p_signal jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.home_chat_rooms;
  payload text;
  next_signals jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if p_role not in ('host', 'guest') then
    raise exception 'Invalid Home Chat role.';
  end if;
  if p_signal is null or jsonb_typeof(p_signal) <> 'object' then
    raise exception 'Invalid pairing signal.';
  end if;
  payload := p_signal ->> 'payload';
  if payload is null or char_length(payload) > 8000 then
    raise exception 'Pairing signal is too large.';
  end if;
  if coalesce(p_signal ->> 'from', '') <> p_role then
    raise exception 'Pairing signal role mismatch.';
  end if;

  select * into room
  from public.home_chat_rooms r
  where r.id = p_room_id
    and r.expires_at > pg_catalog.now()
  for update;

  if room.id is null then
    raise exception 'Home Chat is not active.';
  end if;

  if p_role = 'host' then
    if room.host_user_id <> auth.uid() then
      raise exception 'Not the Home Chat host.';
    end if;
    next_signals := coalesce(room.host_signal, '[]'::jsonb) || jsonb_build_array(p_signal);
    while jsonb_array_length(next_signals) > 40 loop
      next_signals := next_signals - 0;
    end loop;
    update public.home_chat_rooms
    set host_signal = next_signals
    where id = room.id;
  else
    if room.guest_user_id is distinct from auth.uid() then
      raise exception 'Not the Home Chat guest.';
    end if;
    next_signals := coalesce(room.guest_signal, '[]'::jsonb) || jsonb_build_array(p_signal);
    while jsonb_array_length(next_signals) > 40 loop
      next_signals := next_signals - 0;
    end loop;
    update public.home_chat_rooms
    set guest_signal = next_signals
    where id = room.id;
  end if;
end;
$$;

revoke all on function public.home_chat_append_signal(uuid, text, jsonb)
  from public, anon;
grant execute on function public.home_chat_append_signal(uuid, text, jsonb)
  to authenticated, service_role;

create or replace function public.close_home_chat_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  delete from public.home_chat_rooms
  where id = p_room_id
    and (host_user_id = auth.uid() or guest_user_id = auth.uid());
end;
$$;

revoke all on function public.close_home_chat_room(uuid)
  from public, anon;
grant execute on function public.close_home_chat_room(uuid)
  to authenticated, service_role;

create or replace function public.can_access_home_chat_realtime_topic(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_chat_rooms r
    where r.expires_at > pg_catalog.now()
      and p_topic = 'home-chat:' || r.id::text
      and (
        r.host_user_id = auth.uid()
        or r.guest_user_id = auth.uid()
      )
  );
$$;

revoke all on function public.can_access_home_chat_realtime_topic(text)
  from public, anon;
grant execute on function public.can_access_home_chat_realtime_topic(text)
  to authenticated, service_role;

-- Home Chat + budget-live broadcast auth. Do not statically call
-- can_access_budget_realtime_topic(): that helper only exists after the
-- older Alte’ security migration, so AuraHUD-only projects would fail
-- CREATE FUNCTION (SQL functions are bound at create time).
create or replace function public.can_access_private_realtime_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  allowed boolean := false;
begin
  if public.can_access_home_chat_realtime_topic(p_topic) then
    return true;
  end if;

  if to_regprocedure('public.can_access_budget_realtime_topic(text)') is not null then
    execute 'select public.can_access_budget_realtime_topic($1)'
      into allowed
      using p_topic;
    return coalesce(allowed, false);
  end if;

  if to_regclass('public.budget_members') is null then
    return false;
  end if;

  execute
    'select exists (
       select 1
       from public.budget_members m
       where m.user_id = auth.uid()
         and $1 = ''budget-live:'' || m.budget_id::text
     )'
    into allowed
    using p_topic;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.can_access_private_realtime_topic(text)
  from public, anon;
grant execute on function public.can_access_private_realtime_topic(text)
  to authenticated, service_role;

do $$
begin
  if to_regclass('realtime.messages') is null then
    raise notice 'Skipping Home Chat realtime policies: realtime.messages is not available.';
    return;
  end if;

  execute 'drop policy if exists "budget members read private realtime" on realtime.messages';
  execute $policy$
    create policy "budget members read private realtime"
    on realtime.messages for select
    to authenticated
    using (
      realtime.messages.extension in ('broadcast', 'presence')
      and public.can_access_private_realtime_topic(
        (select realtime.topic())
      )
    )
  $policy$;

  execute 'drop policy if exists "budget members write private realtime" on realtime.messages';
  execute $policy$
    create policy "budget members write private realtime"
    on realtime.messages for insert
    to authenticated
    with check (
      realtime.messages.extension in ('broadcast', 'presence')
      and public.can_access_private_realtime_topic(
        (select realtime.topic())
      )
    )
  $policy$;
end $$;
