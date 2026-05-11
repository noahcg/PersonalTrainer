do $$ begin
  create type training_package_kind as enum ('one_on_one', 'partner_training');
exception when duplicate_object then null; end $$;

do $$ begin
  create type training_package_status as enum ('pending', 'active', 'paused', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type package_appointment_status as enum ('completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type package_attendance_status as enum ('attending', 'absent', 'late_cancelled', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type package_debit_policy as enum ('charged', 'not_charged', 'converted_to_one_on_one');
exception when duplicate_object then null; end $$;

create table if not exists public.training_packages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  kind training_package_kind not null default 'one_on_one',
  title text not null,
  total_sessions int check (total_sessions is null or total_sessions >= 0),
  status training_package_status not null default 'pending',
  price_cents int check (price_cents is null or price_cents >= 0),
  currency text not null default 'USD',
  billing_terms text,
  shared_location text,
  shared_schedule text,
  policy_notes text,
  internal_notes text,
  started_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_packages add column if not exists price_cents int check (price_cents is null or price_cents >= 0);
alter table public.training_packages add column if not exists currency text not null default 'USD';
alter table public.training_packages add column if not exists billing_terms text;

create table if not exists public.training_package_types (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  kind training_package_kind not null default 'one_on_one',
  name text not null,
  session_count int check (session_count is null or session_count >= 0),
  price_cents int check (price_cents is null or price_cents >= 0),
  currency text not null default 'USD',
  billing_terms text,
  policy_notes text,
  internal_notes text,
  default_location text,
  default_schedule text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_package_members (
  id uuid primary key default gen_random_uuid(),
  training_package_id uuid not null references public.training_packages(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (training_package_id, client_id)
);

create table if not exists public.package_appointments (
  id uuid primary key default gen_random_uuid(),
  training_package_id uuid not null references public.training_packages(id) on delete cascade,
  status package_appointment_status not null default 'completed',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  location text,
  notes text,
  debit_policy package_debit_policy not null default 'charged',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.package_appointment_attendance (
  id uuid primary key default gen_random_uuid(),
  package_appointment_id uuid not null references public.package_appointments(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status package_attendance_status not null default 'attending',
  created_at timestamptz not null default now(),
  unique (package_appointment_id, client_id)
);

create index if not exists training_packages_trainer_idx on public.training_packages(trainer_id, status, created_at desc);
create index if not exists training_package_types_trainer_idx on public.training_package_types(trainer_id, active, created_at desc);
create index if not exists package_members_client_idx on public.training_package_members(client_id);
create index if not exists package_appointments_package_idx on public.package_appointments(training_package_id, started_at desc);

alter table public.training_packages enable row level security;
alter table public.training_package_types enable row level security;
alter table public.training_package_members enable row level security;
alter table public.package_appointments enable row level security;
alter table public.package_appointment_attendance enable row level security;

create or replace function public.package_belongs_to_current_trainer(package_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_packages tp
    where tp.id = package_id
      and tp.trainer_id = public.current_trainer_id()
  );
$$;

create or replace function public.package_visible_to_current_client(package_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_package_members tpm
    where tpm.training_package_id = package_id
      and tpm.client_id = public.current_client_id()
  );
$$;

create or replace function public.package_appointment_visible_to_current_user(appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.package_appointments pa
    join public.training_packages tp on tp.id = pa.training_package_id
    where pa.id = appointment_id
      and (
        tp.trainer_id = public.current_trainer_id()
        or exists (
          select 1
          from public.training_package_members tpm
          where tpm.training_package_id = tp.id
            and tpm.client_id = public.current_client_id()
        )
      )
  );
$$;

drop policy if exists "training packages visible" on public.training_packages;
drop policy if exists "training packages trainer writes" on public.training_packages;
drop policy if exists "training package types visible" on public.training_package_types;
drop policy if exists "training package types trainer writes" on public.training_package_types;
drop policy if exists "package members visible" on public.training_package_members;
drop policy if exists "package members trainer writes" on public.training_package_members;
drop policy if exists "package appointments visible" on public.package_appointments;
drop policy if exists "package appointments trainer writes" on public.package_appointments;
drop policy if exists "package attendance visible" on public.package_appointment_attendance;
drop policy if exists "package attendance trainer writes" on public.package_appointment_attendance;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_packages' and policyname = 'training packages visible') then
    create policy "training packages visible" on public.training_packages for select using (
      trainer_id = public.current_trainer_id()
      or public.package_visible_to_current_client(id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_packages' and policyname = 'training packages trainer writes') then
    create policy "training packages trainer writes" on public.training_packages for all using (trainer_id = public.current_trainer_id()) with check (trainer_id = public.current_trainer_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_package_types' and policyname = 'training package types visible') then
    create policy "training package types visible" on public.training_package_types for select using (trainer_id = public.current_trainer_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_package_types' and policyname = 'training package types trainer writes') then
    create policy "training package types trainer writes" on public.training_package_types for all using (trainer_id = public.current_trainer_id()) with check (trainer_id = public.current_trainer_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_package_members' and policyname = 'package members visible') then
    create policy "package members visible" on public.training_package_members for select using (
      public.package_belongs_to_current_trainer(training_package_id)
      or client_id = public.current_client_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_package_members' and policyname = 'package members trainer writes') then
    create policy "package members trainer writes" on public.training_package_members for all using (
      public.package_belongs_to_current_trainer(training_package_id)
    ) with check (
      public.package_belongs_to_current_trainer(training_package_id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'package_appointments' and policyname = 'package appointments visible') then
    create policy "package appointments visible" on public.package_appointments for select using (
      public.package_belongs_to_current_trainer(training_package_id)
      or public.package_visible_to_current_client(training_package_id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'package_appointments' and policyname = 'package appointments trainer writes') then
    create policy "package appointments trainer writes" on public.package_appointments for all using (
      public.package_belongs_to_current_trainer(training_package_id)
    ) with check (
      public.package_belongs_to_current_trainer(training_package_id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'package_appointment_attendance' and policyname = 'package attendance visible') then
    create policy "package attendance visible" on public.package_appointment_attendance for select using (
      public.package_appointment_visible_to_current_user(package_appointment_id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'package_appointment_attendance' and policyname = 'package attendance trainer writes') then
    create policy "package attendance trainer writes" on public.package_appointment_attendance for all using (
      exists (select 1 from public.package_appointments pa where pa.id = package_appointment_id and public.package_belongs_to_current_trainer(pa.training_package_id))
    ) with check (
      exists (select 1 from public.package_appointments pa where pa.id = package_appointment_id and public.package_belongs_to_current_trainer(pa.training_package_id))
    );
  end if;
end $$;
