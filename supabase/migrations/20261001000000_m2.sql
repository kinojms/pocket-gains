-- M2: weekly plans, reminder settings, push subscriptions, reminder bookkeeping, scheduler extensions.

alter table public.profile
  add column reminder_enabled boolean not null default false,
  add column reminder_time time not null default '18:00',
  add column nudge_enabled boolean not null default false,
  add column reminder_days text[] not null default '{}';

create table public.weekly_plan (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  effective_from date not null,
  saved_at timestamptz not null,
  days jsonb not null,
  is_custom boolean not null,
  updated_at timestamptz not null default now()
);
alter table public.weekly_plan enable row level security;
create policy "owner only" on public.weekly_plan
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.push_subscription (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscription enable row level security;
create policy "owner only" on public.push_subscription
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Written only by the send-reminders Edge Function (secret key); no client policies on purpose.
create table public.reminder_state (
  user_id uuid primary key references auth.users on delete cascade,
  last_reminded_on date,
  last_nudged_on date
);
alter table public.reminder_state enable row level security;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
