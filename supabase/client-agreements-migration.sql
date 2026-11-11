-- Private, individually offered agreement snapshots. Apply before enabling agreement workflows.
create extension if not exists pgcrypto;
create table if not exists public.client_agreement_offers (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id),
  client_id uuid not null references public.clients(id),
  training_package_id uuid not null references public.training_packages(id),
  approved_by uuid not null references public.profiles(id),
  approved_at timestamptz not null default now(),
  version_label text not null check (length(trim(version_label)) > 0),
  package_snapshot jsonb not null,
  pdf_base64 text not null,
  pdf_sha256 text not null,
  status text not null default 'offered' check (status in ('offered', 'withdrawn', 'accepted')),
  created_at timestamptz not null default now()
);
create unique index if not exists client_agreement_one_pending_per_client on public.client_agreement_offers(client_id) where status = 'offered';
create index if not exists client_agreement_offers_client_idx on public.client_agreement_offers(client_id, created_at desc);
create table if not exists public.client_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.client_agreement_offers(id),
  client_id uuid not null references public.clients(id),
  profile_id uuid not null references public.profiles(id),
  full_name text not null check (length(trim(full_name)) > 0),
  acknowledgment text not null,
  electronic_consent text not null,
  method text not null default 'typed_name_and_checkbox' check (method = 'typed_name_and_checkbox'),
  accepted_at timestamptz not null default now()
);
alter table public.client_agreement_offers enable row level security;
alter table public.client_agreement_acceptances enable row level security;
-- Only server-side service-role operations are allowed; routes check ownership.

create or replace function public.protect_agreement_records() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Agreement records cannot be deleted'; end if;
  if tg_table_name = 'client_agreement_acceptances' then raise exception 'Acceptance records are immutable'; end if;
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') or old.status <> 'offered' or new.status not in ('withdrawn', 'accepted') then
    raise exception 'Agreement snapshots are immutable';
  end if;
  return new;
end $$;
drop trigger if exists protect_agreement_offers on public.client_agreement_offers;
create trigger protect_agreement_offers before update or delete on public.client_agreement_offers for each row execute function public.protect_agreement_records();
drop trigger if exists protect_agreement_acceptances on public.client_agreement_acceptances;
create trigger protect_agreement_acceptances before update or delete on public.client_agreement_acceptances for each row execute function public.protect_agreement_records();

create or replace function public.accept_client_agreement(p_offer uuid, p_client uuid, p_profile uuid, p_name text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_offer public.client_agreement_offers%rowtype; v_time timestamptz;
begin
  select * into v_offer from public.client_agreement_offers where id = p_offer for update;
  if not found or v_offer.status <> 'offered' or v_offer.client_id <> p_client then raise exception 'Agreement is unavailable'; end if;
  if not exists (select 1 from public.clients where id = p_client and profile_id = p_profile) then raise exception 'Client is unavailable'; end if;
  if not exists (select 1 from public.training_package_members where client_id = p_client and training_package_id = v_offer.training_package_id) then raise exception 'Package is unavailable'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Full name is required'; end if;
  if not exists (select 1 from public.training_packages where id = v_offer.training_package_id and trainer_id = v_offer.trainer_id and status in ('pending', 'active')) then raise exception 'Package is no longer available'; end if;
  insert into public.client_agreement_acceptances(offer_id, client_id, profile_id, full_name, acknowledgment, electronic_consent)
    values (p_offer, p_client, p_profile, trim(p_name), 'I have read and agree to the terms.', 'I agree to receive this agreement electronically and can access and retain a copy.') returning accepted_at into v_time;
  update public.client_agreement_offers set status = 'accepted' where id = p_offer;
  return v_time;
end $$;
revoke all on function public.accept_client_agreement(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_client_agreement(uuid, uuid, uuid, text) to service_role;
