-- Adds Web Push subscriptions and delivery tracking for trainer appointment reminders.
-- Run this once in the Supabase SQL editor, or through psql with a database owner connection.

create table if not exists public.trainer_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trainer_push_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  appointment_id uuid not null references public.trainer_appointments(id) on delete cascade,
  reminder_offset_minutes int not null check (reminder_offset_minutes >= 0),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (appointment_id, reminder_offset_minutes)
);

create index if not exists trainer_push_subscriptions_trainer_idx
  on public.trainer_push_subscriptions(trainer_id)
  where disabled_at is null;

create index if not exists trainer_push_reminder_deliveries_trainer_idx
  on public.trainer_push_reminder_deliveries(trainer_id, sent_at desc);

alter table public.trainer_push_subscriptions enable row level security;
alter table public.trainer_push_reminder_deliveries enable row level security;

do $$
begin
  drop policy if exists "trainer push subscriptions own row" on public.trainer_push_subscriptions;
  drop policy if exists "trainer push deliveries own row" on public.trainer_push_reminder_deliveries;

  create policy "trainer push subscriptions own row" on public.trainer_push_subscriptions
    for all
    using (trainer_id = public.current_trainer_id())
    with check (trainer_id = public.current_trainer_id());

  create policy "trainer push deliveries own row" on public.trainer_push_reminder_deliveries
    for select
    using (trainer_id = public.current_trainer_id());
end $$;
