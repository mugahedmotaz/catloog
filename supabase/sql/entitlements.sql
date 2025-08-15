-- Entitlements schema: plans, features, plan_features, subscriptions, and view store_entitlements
-- Safe to run multiple times with IF NOT EXISTS guards where possible.

begin;

-- Plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Features
create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  type text not null check (type in ('boolean','number','string')),
  default_value jsonb,
  created_at timestamp with time zone default now()
);

-- Plan -> Features mapping (value overrides default)
create table if not exists public.plan_features (
  plan_id uuid references public.plans(id) on delete cascade,
  feature_id uuid references public.features(id) on delete cascade,
  value jsonb not null,
  primary key(plan_id, feature_id)
);

-- Subscriptions: can be linked to a store or a user; here we use store_id for merchant stores
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active', -- active, past_due, canceled, trialing
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- View: effective entitlements per store as key/value
-- Produces rows: (store_id, feature_key, value)
create or replace view public.store_entitlements as
select s.store_id,
       f.key as feature_key,
       coalesce(pf.value, f.default_value) as value
from (
  -- pick latest active subscription for a store
  select distinct on (store_id) store_id, plan_id
  from public.subscriptions
  where status = 'active'
  order by store_id, created_at desc
) s
join public.plans p on p.id = s.plan_id
join public.features f on true
left join public.plan_features pf on pf.plan_id = p.id and pf.feature_id = f.id;

-- Seed minimal data if empty
insert into public.plans(key, name)
select * from (values ('free','Free'),('pro','Pro'),('business','Business')) v(key,name)
where not exists (select 1 from public.plans);

insert into public.features(key, name, type, default_value)
select * from (
  values
    ('stores.maxCount','Max stores','number','1'::jsonb),
    ('products.maxCount','Max products','number','50'::jsonb),
    ('themes.advanced','Advanced themes','boolean','false'::jsonb),
    ('themes.customization','Theme customization','boolean','false'::jsonb),
    ('reports.advanced','Advanced reports','boolean','false'::jsonb),
    ('channels.social','Social channels','boolean','false'::jsonb),
    ('team.members','Team members','number','1'::jsonb),
    ('audit.logs','Audit logs','boolean','false'::jsonb)
) v(key,name,type,default_value)
where not exists (select 1 from public.features);

-- Set plan feature overrides
-- Map helper CTEs
with p as (
  select key, id from public.plans
), f as (
  select key, id from public.features
)
-- Pro overrides
insert into public.plan_features(plan_id, feature_id, value)
select p.id, f.id, v.value
from (values
  ('pro','stores.maxCount','3'::jsonb),
  ('pro','products.maxCount','10000'::jsonb),
  ('pro','themes.advanced','true'::jsonb),
  ('pro','themes.customization','true'::jsonb),
  ('pro','reports.advanced','true'::jsonb),
  ('pro','channels.social','true'::jsonb),
  ('pro','team.members','5'::jsonb)
) v(plan_key, feature_key, value)
join p on p.key = v.plan_key
join f on f.key = v.feature_key
on conflict (plan_id, feature_id) do update set value = excluded.value;

-- Business overrides
with p as (
  select key, id from public.plans
), f as (
  select key, id from public.features
)
insert into public.plan_features(plan_id, feature_id, value)
select p.id, f.id, v.value
from (values
  ('business','stores.maxCount','10'::jsonb),
  ('business','products.maxCount','100000'::jsonb),
  ('business','themes.advanced','true'::jsonb),
  ('business','themes.customization','true'::jsonb),
  ('business','reports.advanced','true'::jsonb),
  ('business','channels.social','true'::jsonb),
  ('business','team.members','25'::jsonb),
  ('business','audit.logs','true'::jsonb)
) v(plan_key, feature_key, value)
join p on p.key = v.plan_key
join f on f.key = v.feature_key
on conflict (plan_id, feature_id) do update set value = excluded.value;

-- RLS policies (adjust to your stores ownership model)
-- Enable RLS
alter table public.subscriptions enable row level security;
alter table public.plans enable row level security;
alter table public.features enable row level security;
alter table public.plan_features enable row level security;

-- Basic read policies (you may tighten further)
-- Typically, plans/features are public-readable; plan_features read-only; subscriptions only by store owner.
create policy if not exists plans_read on public.plans for select using (true);
create policy if not exists features_read on public.features for select using (true);
create policy if not exists plan_features_read on public.plan_features for select using (true);

-- You need a stores table with merchant_id to scope subscriptions.
-- Replace references accordingly if your schema differs.
create policy if not exists subscriptions_owner_read on public.subscriptions for select using (
  exists (
    select 1 from public.stores s
    where s.id = subscriptions.store_id
      and s.merchant_id = auth.uid()
  )
);

commit;
