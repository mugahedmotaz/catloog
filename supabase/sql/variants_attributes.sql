-- Variants & Attributes schema for Catloog
-- Execute in Supabase SQL Editor

-- 1) Variant options per product (e.g., Size with values [S,M,L])
create table if not exists public.variant_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  values text[] not null default '{}',
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists variant_options_product_idx on public.variant_options(product_id);

-- 2) Product variants (a concrete combination)
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  selections jsonb not null default '{}'::jsonb, -- { "Size": "M", "Color": "Red" }
  sku text,
  price numeric(12,2), -- optional override; fallback to products.price
  compare_at_price numeric(12,2),
  stock int not null default 0,
  images text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants(product_id);
create index if not exists product_variants_stock_idx on public.product_variants(stock);

-- 3) Attributes (structured specs used for filtering and PDP details)
create table if not exists public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('text','number','boolean','select','multiselect')),
  allowed_values text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Product <-> Attribute value mapping
create table if not exists public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, attribute_id)
);

create index if not exists product_attributes_product_idx on public.product_attributes(product_id);
create index if not exists product_attributes_attribute_idx on public.product_attributes(attribute_id);

-- Enable RLS
alter table public.variant_options enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_attributes enable row level security;
alter table public.attributes enable row level security;

-- Policies
-- Only allow merchants (store owners) to manage rows related to their products.
-- We assume a table `stores` with `id` and `merchant_id`, and `products.store_id` references stores(id).

-- SELECT policies: public can read variant options/variants for storefront, but only if product exists.
create policy if not exists vo_select_public on public.variant_options
for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = variant_options.product_id));

create policy if not exists pv_select_public on public.product_variants
for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_variants.product_id));

create policy if not exists pa_select_public on public.product_attributes
for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_attributes.product_id));

create policy if not exists attr_select_public on public.attributes
for select to anon, authenticated
using (true);

-- INSERT/UPDATE/DELETE: only store owner
create policy if not exists vo_mutate_owner on public.variant_options
for all to authenticated
using (
  exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = variant_options.product_id and s.merchant_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = variant_options.product_id and s.merchant_id = auth.uid()
  )
);

create policy if not exists pv_mutate_owner on public.product_variants
for all to authenticated
using (
  exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_variants.product_id and s.merchant_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_variants.product_id and s.merchant_id = auth.uid()
  )
);

create policy if not exists pa_mutate_owner on public.product_attributes
for all to authenticated
using (
  exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_attributes.product_id and s.merchant_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.products p join public.stores s on s.id = p.store_id
    where p.id = product_attributes.product_id and s.merchant_id = auth.uid()
  )
);

create policy if not exists attr_mutate_admin on public.attributes
for all to authenticated
using (true)
with check (true);

-- Triggers to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger if not exists trg_vo_updated
before update on public.variant_options
for each row execute function public.set_updated_at();

create trigger if not exists trg_pv_updated
before update on public.product_variants
for each row execute function public.set_updated_at();

create trigger if not exists trg_pa_updated
before update on public.product_attributes
for each row execute function public.set_updated_at();

create trigger if not exists trg_attr_updated
before update on public.attributes
for each row execute function public.set_updated_at();
