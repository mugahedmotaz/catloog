-- Admin, Plans, Subscriptions schema for Catloog
-- Execute in Supabase SQL Editor

-- Ensure uuid generator is available
create extension if not exists pgcrypto;

-- Admins table to mark platform administrators
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Subscription plans (managed by admins)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_monthly numeric(12,2) not null default 0,
  price_yearly numeric(12,2),
  currency text not null default 'USD',
  product_limit int, -- null means unlimited
  variant_limit int,
  storage_mb int,
  features text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_active_idx on public.plans(is_active);

-- Stores assumed to exist: public.stores(id uuid primary key, merchant_id uuid references auth.users)
-- Subscriptions per store
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  period text not null check (period in ('monthly','yearly')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subs_store_idx on public.subscriptions(store_id);
create index if not exists subs_active_idx on public.subscriptions(is_active);

-- Helper function to set updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Re-create trigger for plans updated_at
drop trigger if exists trg_plans_updated on public.plans;
create trigger trg_plans_updated
before update on public.plans
for each row execute function public.set_updated_at();

-- Re-create trigger for subscriptions updated_at
drop trigger if exists trg_subs_updated on public.subscriptions;
create trigger trg_subs_updated
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.admins enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

-- Policies
-- admins: users can only read their own admin record
create policy if not exists admins_select_self on public.admins
for select to authenticated
using (user_id = auth.uid());

-- Only admins can manage plans
create policy if not exists plans_select_public on public.plans
for select to anon, authenticated
using (is_active = true);

create policy if not exists plans_mutate_admin on public.plans
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Subscriptions: store owners can read and manage their store subscriptions; admins can read all
create policy if not exists subs_select_owner_or_admin on public.subscriptions
for select to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = subscriptions.store_id and (s.merchant_id = auth.uid() or exists (select 1 from public.admins a where a.user_id = auth.uid()))
  )
);

create policy if not exists subs_mutate_owner on public.subscriptions
for all to authenticated
using (
  exists (
    select 1 from public.stores s
    
    where s.id = subscriptions.store_id and s.merchant_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = subscriptions.store_id and s.merchant_id = auth.uid()
  )
);
