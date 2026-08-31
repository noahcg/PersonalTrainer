-- Adds standalone trainer-scheduled appointments for the calendar view.
-- Run this once in the Supabase SQL editor, or through psql with a database owner connection.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'trainer_appointment_status') then
    create type public.trainer_appointment_status as enum ('scheduled', 'completed', 'cancelled');
  end if;
end $$;

create table if not exists public.trainer_appointments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  location text,
  notes text,
  reminder_offsets_minutes int[] not null default '{}'::int[],
  status public.trainer_appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trainer_appointments
  add column if not exists reminder_offsets_minutes int[] not null default '{}'::int[];

alter table public.trainer_appointments
  add column if not exists time_zone text not null default 'America/Los_Angeles';

create index if not exists trainer_appointments_trainer_idx
  on public.trainer_appointments(trainer_id, starts_at);

alter table public.trainer_appointments enable row level security;

do $$
begin
  drop policy if exists "trainer appointments owner access" on public.trainer_appointments;
  drop policy if exists "trainer appointments trainer writes" on public.trainer_appointments;
  drop policy if exists "trainer appointments visible" on public.trainer_appointments;

  create policy "trainer appointments visible" on public.trainer_appointments
    for select
    using (trainer_id = public.current_trainer_id() or client_id = public.current_client_id());

  create policy "trainer appointments trainer writes" on public.trainer_appointments
    for all
    using (trainer_id = public.current_trainer_id())
    with check (trainer_id = public.current_trainer_id());
end $$;
