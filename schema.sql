-- Aqua Link: production-minded starter schema for Supabase/Postgres
-- Keep learner profiles minimal. Do not store DOB, home address, phone number,
-- school ID numbers, or other unnecessary sensitive information.

create extension if not exists pgcrypto;

create type public.user_role as enum ('learner','teacher','mentor','admin');
create type public.report_status as enum ('Reported','Under investigation','Resolved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  school_name text not null default 'Riverside High School',
  role public.user_role not null default 'learner',
  xp integer not null default 170 check (xp >= 0),
  level integer not null default 3 check (level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id text primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  issue_type text not null check (char_length(issue_type) between 2 and 80),
  location text not null check (char_length(location) between 2 and 120),
  status public.report_status not null default 'Reported',
  note text not null check (char_length(note) between 2 and 1000),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  xp integer not null check (xp > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.mission_completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can read/update their own profile.
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Reports: authenticated users may create reports as themselves and read reports
-- for the network. Status changes should be restricted to staff in a future
-- admin/mentor policy rather than allowing learners to close their own reports.
create policy "reports_select_authenticated" on public.reports
for select to authenticated using (true);
create policy "reports_insert_own" on public.reports
for insert to authenticated with check (reporter_id = auth.uid());

-- Missions are public-to-authenticated and completions belong to the current user.
create policy "missions_select_authenticated" on public.missions
for select to authenticated using (active = true);
create policy "completions_select_own" on public.mission_completions
for select to authenticated using (user_id = auth.uid());
create policy "completions_insert_own" on public.mission_completions
for insert to authenticated with check (user_id = auth.uid());

create policy "notifications_select_own" on public.notifications
for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.missions (title,description,category,xp) values
('Leak Detective','Find one water point that needs attention and record what you see.','FIELD',50),
('Five Point Audit','Inspect five school water points and note their condition.','FIELD',80),
('Water Minute','Observe one routine and identify one avoidable water-use habit.','SCIENCE',40),
('Community Water Story','Ask a community member about a local water challenge.','COMMUNITY',60),
('Map the Flow','Trace where water enters, moves through and leaves your school.','SCIENCE',70)
on conflict do nothing;
