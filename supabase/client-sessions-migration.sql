-- Adds in-person client session tracking for existing Supabase projects.
-- Run this once in the Supabase SQL editor, or through psql with a database owner connection.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_session_status') then
    create type public.client_session_status as enum ('active', 'completed', 'cancelled');
  end if;
end $$;

alter table public.clients
  add column if not exists package_session_limit int check (package_session_limit is null or package_session_limit >= 0);

create table if not exists public.client_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status public.client_session_status not null default 'active',
  location text,
  notes text,
  duration_minutes int check (duration_minutes is null or duration_minutes >= 0),
  created_by public.app_role not null default 'trainer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_sessions_client_idx
  on public.client_sessions(client_id, status, started_at desc);

alter table public.client_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_sessions'
      and policyname = 'client sessions visible'
  ) then
    create policy "client sessions visible" on public.client_sessions
      for select
      using (
        client_id = public.current_client_id()
        or exists (
          select 1 from public.clients c
          where c.id = client_id
            and c.trainer_id = public.current_trainer_id()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_sessions'
      and policyname = 'client sessions trainer writes'
  ) then
    create policy "client sessions trainer writes" on public.client_sessions
      for all
      using (
        exists (
          select 1 from public.clients c
          where c.id = client_id
            and c.trainer_id = public.current_trainer_id()
        )
      )
      with check (
        exists (
          select 1 from public.clients c
          where c.id = client_id
            and c.trainer_id = public.current_trainer_id()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_sessions'
      and policyname = 'client sessions client starts own'
  ) then
    create policy "client sessions client starts own" on public.client_sessions
      for insert
      with check (
        client_id = public.current_client_id()
        and created_by = 'client'
      );
  end if;
end $$;
