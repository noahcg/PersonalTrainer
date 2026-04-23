-- Aurelian Coach Supabase schema
-- Run in the Supabase SQL editor or with `supabase db push`.

create extension if not exists "pgcrypto";

create type app_role as enum ('trainer', 'client');
create type client_status as enum ('active', 'needs_attention', 'paused', 'archived');
create type difficulty_level as enum ('beginner', 'intermediate', 'advanced');
create type message_kind as enum ('message', 'coaching_note', 'reminder');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text,
  coaching_bio text,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  profile_photo_url text,
  goals text,
  fitness_level text,
  injuries_limitations text,
  notes text,
  preferred_training_style text,
  availability text,
  start_date date,
  status client_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.trainers(id) on delete cascade,
  name text not null,
  category text not null,
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  movement_pattern text,
  difficulty difficulty_level not null default 'beginner',
  instructions text,
  coaching_cues text[] not null default '{}',
  mistakes_to_avoid text[] not null default '{}',
  substitutions text[] not null default '{}',
  regressions text[] not null default '{}',
  progressions text[] not null default '{}',
  demo_url text,
  is_global boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercise_tags (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  tag text not null,
  unique (exercise_id, tag)
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  title text not null,
  description text,
  duration_weeks int,
  goal text,
  weekly_structure text,
  notes text,
  is_template boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  training_plan_id uuid references public.training_plans(id) on delete set null,
  name text not null,
  phase_label text,
  scheduled_day int,
  warmup text,
  cooldown text,
  coach_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  label text not null,
  intent text,
  position int not null default 0
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_block_id uuid not null references public.workout_blocks(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null default 0,
  sets int,
  reps text,
  tempo text,
  rest_time text,
  rpe_target text,
  load_guidance text,
  distance text,
  duration text,
  notes text,
  grouping_key text,
  grouping_type text check (grouping_type in ('superset', 'circuit') or grouping_type is null)
);

create table public.plan_assignments (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid not null references public.training_plans(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  status text not null default 'active',
  assigned_at timestamptz not null default now(),
  unique (training_plan_id, client_id, starts_on)
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  plan_assignment_id uuid references public.plan_assignments(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'planned',
  feedback text,
  perceived_effort int check (perceived_effort between 1 and 10),
  created_at timestamptz not null default now()
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number int not null,
  reps numeric,
  weight numeric,
  duration_seconds int,
  distance numeric,
  tempo text,
  rpe numeric,
  notes text,
  completed boolean not null default false
);

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entry_date date not null,
  body_weight numeric,
  measurements jsonb not null default '{}',
  personal_records jsonb not null default '[]',
  progress_photos jsonb not null default '[]',
  adherence_percent numeric,
  milestone_notes text,
  created_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  energy int check (energy between 1 and 10),
  soreness int check (soreness between 1 and 10),
  sleep int check (sleep between 1 and 10),
  stress int check (stress between 1 and 10),
  motivation int check (motivation between 1 and 10),
  mood text,
  notes text,
  reviewed_at timestamptz,
  trainer_response text
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  kind message_kind not null default 'message',
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  title text not null,
  description text,
  resource_type text not null,
  url text,
  content text,
  tags text[] not null default '{}',
  audience text not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_trainer_idx on public.clients(trainer_id, status);
create index exercises_trainer_idx on public.exercises(trainer_id, is_global);
create index workouts_plan_idx on public.workouts(training_plan_id);
create index plan_assignments_client_idx on public.plan_assignments(client_id, status);
create index workout_logs_client_idx on public.workout_logs(client_id, status);
create index check_ins_client_idx on public.check_ins(client_id, submitted_at desc);
create index messages_thread_idx on public.messages(trainer_id, client_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.trainers enable row level security;
alter table public.clients enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_tags enable row level security;
alter table public.training_plans enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_blocks enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.plan_assignments enable row level security;
alter table public.workout_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.progress_entries enable row level security;
alter table public.check_ins enable row level security;
alter table public.messages enable row level security;
alter table public.resources enable row level security;

create or replace function public.current_trainer_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.trainers where profile_id = auth.uid()
$$;

create or replace function public.current_client_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.clients where profile_id = auth.uid()
$$;

create policy "profiles self" on public.profiles for select using (id = auth.uid());
create policy "trainers own row" on public.trainers for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "clients trainer or self" on public.clients for select using (trainer_id = public.current_trainer_id() or id = public.current_client_id());
create policy "clients trainer writes" on public.clients for all using (trainer_id = public.current_trainer_id()) with check (trainer_id = public.current_trainer_id());
create policy "exercises trainer or global" on public.exercises for select using (is_global or trainer_id = public.current_trainer_id());
create policy "exercises trainer writes" on public.exercises for all using (trainer_id = public.current_trainer_id()) with check (trainer_id = public.current_trainer_id());
create policy "exercise tags visible" on public.exercise_tags for select using (exists (select 1 from public.exercises e where e.id = exercise_id and (e.is_global or e.trainer_id = public.current_trainer_id())));
create policy "plans trainer select" on public.training_plans for select using (trainer_id = public.current_trainer_id() or id in (select training_plan_id from public.plan_assignments where client_id = public.current_client_id()));
create policy "plans trainer writes" on public.training_plans for all using (trainer_id = public.current_trainer_id()) with check (trainer_id = public.current_trainer_id());
create policy "workouts visible" on public.workouts for select using (trainer_id = public.current_trainer_id() or training_plan_id in (select training_plan_id from public.plan_assignments where client_id = public.current_client_id()));
create policy "workouts trainer writes" on public.workouts for all using (trainer_id = public.current_trainer_id()) with check (trainer_id = public.current_trainer_id());
create policy "blocks visible" on public.workout_blocks for select using (exists (select 1 from public.workouts w where w.id = workout_id and (w.trainer_id = public.current_trainer_id() or w.training_plan_id in (select training_plan_id from public.plan_assignments where client_id = public.current_client_id()))));
create policy "blocks trainer writes" on public.workout_blocks for all using (exists (select 1 from public.workouts w where w.id = workout_id and w.trainer_id = public.current_trainer_id())) with check (exists (select 1 from public.workouts w where w.id = workout_id and w.trainer_id = public.current_trainer_id()));
create policy "workout exercises visible" on public.workout_exercises for select using (exists (select 1 from public.workout_blocks b join public.workouts w on w.id = b.workout_id where b.id = workout_block_id and (w.trainer_id = public.current_trainer_id() or w.training_plan_id in (select training_plan_id from public.plan_assignments where client_id = public.current_client_id()))));
create policy "workout exercises trainer writes" on public.workout_exercises for all using (exists (select 1 from public.workout_blocks b join public.workouts w on w.id = b.workout_id where b.id = workout_block_id and w.trainer_id = public.current_trainer_id())) with check (exists (select 1 from public.workout_blocks b join public.workouts w on w.id = b.workout_id where b.id = workout_block_id and w.trainer_id = public.current_trainer_id()));
create policy "assignments visible" on public.plan_assignments for select using (client_id = public.current_client_id() or exists (select 1 from public.training_plans p where p.id = training_plan_id and p.trainer_id = public.current_trainer_id()));
create policy "logs client trainer visible" on public.workout_logs for select using (client_id = public.current_client_id() or exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = public.current_trainer_id()));
create policy "logs client writes own" on public.workout_logs for all using (client_id = public.current_client_id()) with check (client_id = public.current_client_id());
create policy "set logs visible" on public.set_logs for select using (exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and (wl.client_id = public.current_client_id() or exists (select 1 from public.clients c where c.id = wl.client_id and c.trainer_id = public.current_trainer_id()))));
create policy "set logs client writes" on public.set_logs for all using (exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.client_id = public.current_client_id())) with check (exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.client_id = public.current_client_id()));
create policy "progress visible" on public.progress_entries for select using (client_id = public.current_client_id() or exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = public.current_trainer_id()));
create policy "checkins visible" on public.check_ins for select using (client_id = public.current_client_id() or exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = public.current_trainer_id()));
create policy "checkins client insert" on public.check_ins for insert with check (client_id = public.current_client_id());
create policy "messages visible" on public.messages for select using (client_id = public.current_client_id() or trainer_id = public.current_trainer_id());
create policy "messages participants write" on public.messages for insert with check (client_id = public.current_client_id() or trainer_id = public.current_trainer_id());
create policy "resources visible" on public.resources for select using (trainer_id = public.current_trainer_id() or exists (select 1 from public.clients c where c.trainer_id = resources.trainer_id and c.id = public.current_client_id()));
create policy "resources trainer writes" on public.resources for all using (trainer_id = public.current_trainer_id()) with check (trainer_id = public.current_trainer_id());

-- Demo domain seed with deterministic ids for local Supabase projects.
insert into public.exercises (id, name, category, muscle_groups, equipment, movement_pattern, difficulty, instructions, coaching_cues, mistakes_to_avoid, substitutions, demo_url, is_global)
values
  ('00000000-0000-0000-0000-000000000101', 'Goblet Squat', 'Strength', array['Quads','Glutes','Core'], array['Dumbbell','Kettlebell'], 'Squat', 'beginner', 'Hold the weight high against the chest, sit between the hips, and drive the floor away.', array['Ribs stacked over pelvis','Knees track over mid-foot'], array['Collapsing knees','Rushing the bottom'], array['Box squat','Front squat'], 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3', true),
  ('00000000-0000-0000-0000-000000000102', 'Romanian Deadlift', 'Strength', array['Hamstrings','Glutes','Back'], array['Barbell','Dumbbells'], 'Hinge', 'intermediate', 'Soften knees, push hips back, keep load close, and stand tall by squeezing glutes.', array['Reach hips to the wall','Armpits tight'], array['Squatting the hinge','Load drifting forward'], array['Kickstand RDL','Hip thrust'], 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1', true)
on conflict (id) do nothing;
