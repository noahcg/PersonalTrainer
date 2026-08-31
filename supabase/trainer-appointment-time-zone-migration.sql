-- Adds the appointment timezone selected by the trainer.
-- Existing appointments fall back to America/Los_Angeles, matching the previous app default.

alter table public.trainer_appointments
  add column if not exists time_zone text not null default 'America/Los_Angeles';
