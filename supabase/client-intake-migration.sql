alter table public.clients
  add column if not exists intake_completed_at timestamptz;

create table if not exists public.client_intakes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  emergency_contact jsonb not null default '{}',
  goals jsonb not null default '{}',
  training jsonb not null default '{}',
  readiness jsonb not null default '{}',
  lifestyle jsonb not null default '{}',
  metrics jsonb not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_intakes_client_idx on public.client_intakes(client_id, completed_at desc);

alter table public.client_intakes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_intakes'
      and policyname = 'client intakes visible'
  ) then
    create policy "client intakes visible" on public.client_intakes
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
      and tablename = 'client_intakes'
      and policyname = 'client intakes client writes own'
  ) then
    create policy "client intakes client writes own" on public.client_intakes
      for all
      using (client_id = public.current_client_id())
      with check (client_id = public.current_client_id());
  end if;
end $$;
