-- Adds direct client workout assignments for standalone workouts outside training plans.

create table if not exists public.workout_assignments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_by_trainer_id uuid not null references public.trainers(id) on delete cascade,
  assigned_on date not null default current_date,
  scheduled_for date,
  due_on date,
  assignment_notes text,
  ends_on date,
  status text not null default 'active',
  assigned_at timestamptz not null default now(),
  unique (workout_id, client_id, assigned_on)
);

alter table public.workout_assignments add column if not exists scheduled_for date;
alter table public.workout_assignments add column if not exists due_on date;
alter table public.workout_assignments add column if not exists assignment_notes text;

create index if not exists workout_assignments_client_idx on public.workout_assignments(client_id, status);
create index if not exists workout_assignments_workout_idx on public.workout_assignments(workout_id, status);

alter table public.workout_assignments enable row level security;

drop policy if exists "workouts visible" on public.workouts;
create policy "workouts visible" on public.workouts for select using (
  trainer_id = public.current_trainer_id()
  or training_plan_id in (select training_plan_id from public.plan_assignments where client_id = public.current_client_id())
  or id in (select workout_id from public.workout_assignments where client_id = public.current_client_id() and status = 'active')
);

drop policy if exists "blocks visible" on public.workout_blocks;
create policy "blocks visible" on public.workout_blocks for select using (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_id
      and (
        w.trainer_id = public.current_trainer_id()
        or w.training_plan_id in (select training_plan_id from public.plan_assignments where client_id = public.current_client_id())
        or w.id in (select workout_id from public.workout_assignments where client_id = public.current_client_id() and status = 'active')
      )
  )
);

drop policy if exists "workout exercises visible" on public.workout_exercises;
create policy "workout exercises visible" on public.workout_exercises for select using (
  exists (
    select 1
    from public.workout_blocks b
    join public.workouts w on w.id = b.workout_id
    where b.id = workout_block_id
      and (
        w.trainer_id = public.current_trainer_id()
        or w.training_plan_id in (select training_plan_id from public.plan_assignments where client_id = public.current_client_id())
        or w.id in (select workout_id from public.workout_assignments where client_id = public.current_client_id() and status = 'active')
      )
  )
);

drop policy if exists "workout assignments visible" on public.workout_assignments;
create policy "workout assignments visible" on public.workout_assignments for select using (
  client_id = public.current_client_id()
  or exists (select 1 from public.workouts w where w.id = workout_id and w.trainer_id = public.current_trainer_id())
);

drop policy if exists "workout assignments trainer writes" on public.workout_assignments;
create policy "workout assignments trainer writes" on public.workout_assignments for all using (
  exists (select 1 from public.workouts w where w.id = workout_id and w.trainer_id = public.current_trainer_id())
) with check (
  assigned_by_trainer_id = public.current_trainer_id()
  and exists (select 1 from public.workouts w where w.id = workout_id and w.trainer_id = public.current_trainer_id())
  and exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = public.current_trainer_id())
);
