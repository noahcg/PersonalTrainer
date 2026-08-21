-- Allows clients to see trainer-created appointments assigned to them.
-- Run this once in the Supabase SQL editor after trainer-appointments-migration.sql.

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
