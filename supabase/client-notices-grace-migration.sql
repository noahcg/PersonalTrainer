-- Trainer-only records; balances are not changed by recording a notice or grace.
create table if not exists public.client_notice_records (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id),
  client_id uuid not null references public.clients(id),
  training_package_id uuid not null references public.training_packages(id),
  scheduled_at timestamptz not null,
  notice_received_at timestamptz,
  notice_details text not null,
  grace_granted boolean not null default false,
  grace_reason text,
  created_at timestamptz not null default now(),
  check (not grace_granted or nullif(trim(grace_reason), '') is not null)
);
create unique index if not exists client_notice_one_grace_per_package
  on public.client_notice_records(training_package_id, client_id) where grace_granted;
create index if not exists client_notice_records_client_idx on public.client_notice_records(trainer_id, client_id, created_at desc);
alter table public.client_notice_records enable row level security;
-- No direct browser policies: authenticated trainer ownership is checked by the server route.
