-- Add seconds-based, completion-only hold prescriptions.
alter table public.exercises drop constraint if exists exercises_prescription_type_check;
alter table public.exercises add constraint exercises_prescription_type_check
  check (prescription_type in ('strength', 'duration', 'distance', 'intervals', 'stretch'));

alter table public.workout_exercises drop constraint if exists workout_exercises_prescription_type_check;
alter table public.workout_exercises add constraint workout_exercises_prescription_type_check
  check (prescription_type in ('strength', 'duration', 'distance', 'intervals', 'stretch'));

update public.exercises
set prescription_type = 'stretch'
where prescription_type in ('strength', 'duration')
  and (lower(movement_pattern) in ('stretch', 'mobility') or name ilike '%stretch%');

update public.workout_exercises as item
set prescription_type = 'stretch',
    duration = case when item.duration ~* '^\s*[0-9]+\s*(s|sec|seconds)\s*$' then item.duration else '30 sec' end,
    reps = null, tempo = null, rest_time = null, rpe_target = null, load_guidance = null,
    distance = null, sets = 0
from public.exercises as exercise
where item.exercise_id = exercise.id
  and exercise.prescription_type = 'stretch'
  and item.prescription_type in ('strength', 'duration');
