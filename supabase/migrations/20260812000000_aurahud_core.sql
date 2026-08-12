-- AuraHUD core: privacy settings, tasks, correction memory, AI receipts, stream events
-- RLS: users only access their own rows. Cloud AI defaults OFF.

create table if not exists public.aura_privacy_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cloud_ai_enabled boolean not null default false,
  motivation_style text not null default 'encouraging'
    check (motivation_style in ('encouraging', 'direct', 'humorous')),
  onboarding_preset text
    check (onboarding_preset is null or onboarding_preset in (
      'household_money', 'focus_tasks', 'calm_defaults'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aura_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text not null default '',
  due_on date,
  priority int not null default 3 check (priority between 1 and 5),
  status text not null default 'open'
    check (status in ('open', 'done', 'cancelled')),
  source text not null default 'manual'
    check (source in ('manual', 'voice', 'text', 'budget', 'system')),
  sort_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aura_tasks_user_open_idx
  on public.aura_tasks (user_id, status, sort_score desc, due_on nulls last);

create table if not exists public.aura_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_snippet text not null default '',
  rejected_output jsonb not null default '{}'::jsonb,
  action_type text not null,
  entities jsonb not null default '{}'::jsonb,
  status text not null default 'rejected_unspecified'
    check (status in ('rejected_unspecified', 'corrected', 'resolved_later')),
  negative_constraints jsonb not null default '[]'::jsonb,
  open_question text,
  before_after jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists aura_corrections_user_idx
  on public.aura_corrections (user_id, created_at desc);

create table if not exists public.aura_ai_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null,
  word_count int not null default 0 check (word_count >= 0),
  provider text not null default 'none'
    check (provider in ('none', 'local_rules', 'cloud')),
  created_at timestamptz not null default now()
);

create index if not exists aura_ai_receipts_user_idx
  on public.aura_ai_receipts (user_id, created_at desc);

create table if not exists public.aura_stream_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in ('now', 'next', 'captured', 'nudge')),
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  feedback text
    check (feedback is null or feedback in ('confirmed', 'rejected', 'edited')),
  related_task_id uuid references public.aura_tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists aura_stream_events_user_idx
  on public.aura_stream_events (user_id, created_at desc);

alter table public.aura_privacy_settings enable row level security;
alter table public.aura_tasks enable row level security;
alter table public.aura_corrections enable row level security;
alter table public.aura_ai_receipts enable row level security;
alter table public.aura_stream_events enable row level security;

create policy aura_privacy_settings_own
  on public.aura_privacy_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy aura_tasks_own
  on public.aura_tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy aura_corrections_own
  on public.aura_corrections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy aura_ai_receipts_own
  on public.aura_ai_receipts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy aura_stream_events_own
  on public.aura_stream_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.aura_privacy_settings to authenticated;
grant select, insert, update, delete on public.aura_tasks to authenticated;
grant select, insert, update, delete on public.aura_corrections to authenticated;
grant select, insert, update, delete on public.aura_ai_receipts to authenticated;
grant select, insert, update, delete on public.aura_stream_events to authenticated;
