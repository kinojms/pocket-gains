-- M2 follow-up: a recommended weekly plan remembers the experience it was based on,
-- so editing Experience in Profile never rewrites past streak days.
alter table public.weekly_plan add column if not exists experience text;
