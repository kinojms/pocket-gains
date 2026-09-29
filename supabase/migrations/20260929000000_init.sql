-- Lock In M1 schema. Single owner per row; RLS restricts every table to auth.uid().

create table public.profile (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  goal text not null check (goal in ('muscle_strength')),
  experience text not null check (experience in ('new', 'returning', 'consistent')),
  onboarded_at timestamptz not null,
  equipment text[] not null,
  pet_name text not null,
  timezone text not null,
  updated_at timestamptz not null default now()
);

create table public.session (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  deck_id text not null,
  settings jsonb not null,
  hand jsonb not null,
  status text not null check (status in ('in_progress', 'complete', 'partial', 'abandoned')),
  end_reason text check (end_reason in ('tired', 'no_time', 'too_hard', 'other')),
  updated_at timestamptz not null default now()
);

create table public.set_log (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.session (id) on delete cascade,
  exercise_id text not null,
  set_no int not null check (set_no >= 1),
  reps int not null check (reps >= 0),
  weight_kg numeric(5, 2),
  stopped_for_pain boolean not null default false,
  logged_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index set_log_session_id_idx on public.set_log (session_id);

create table public.soreness_checkin (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.session (id) on delete cascade,
  rating smallint not null check (rating between 1 and 3),
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.profile enable row level security;
alter table public.session enable row level security;
alter table public.set_log enable row level security;
alter table public.soreness_checkin enable row level security;

create policy "owner only" on public.profile
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner only" on public.session
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner only" on public.set_log
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner only" on public.soreness_checkin
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
