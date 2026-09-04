-- Run after the existing schema/migrations to support cardio-specific workout prescriptions.

alter table public.exercises
  add column if not exists prescription_type text;

update public.exercises
set prescription_type = case
  when lower(category) in ('cardio / conditioning', 'warm up', 'cool down') then 'duration'
  else 'strength'
end
where prescription_type is null;

alter table public.exercises
  alter column prescription_type set default 'strength',
  alter column prescription_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'exercises_prescription_type_check'
  ) then
    alter table public.exercises
      add constraint exercises_prescription_type_check
      check (prescription_type in ('strength', 'duration', 'distance', 'intervals'));
  end if;
end $$;

alter table public.workout_exercises
  add column if not exists prescription_type text;

update public.workout_exercises as workout_exercise
set prescription_type = exercise.prescription_type
from public.exercises as exercise
where workout_exercise.exercise_id = exercise.id
  and workout_exercise.prescription_type is null;

update public.workout_exercises
set prescription_type = 'strength'
where prescription_type is null;

alter table public.workout_exercises
  alter column prescription_type set default 'strength',
  alter column prescription_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workout_exercises_prescription_type_check'
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_prescription_type_check
      check (prescription_type in ('strength', 'duration', 'distance', 'intervals'));
  end if;
end $$;
