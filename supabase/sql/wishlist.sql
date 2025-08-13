-- Wishlist schema for Catloog
-- Execute in Supabase SQL Editor

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create index if not exists wishlists_user_idx on public.wishlists(user_id);
create index if not exists wishlists_product_idx on public.wishlists(product_id);

alter table public.wishlists enable row level security;

-- Users can read their own wishlist
create policy if not exists wl_select_own on public.wishlists
for select to authenticated
using (user_id = auth.uid());

-- Users can insert for themselves
create policy if not exists wl_insert_own on public.wishlists
for insert to authenticated
with check (user_id = auth.uid());

-- Users can delete their own rows
create policy if not exists wl_delete_own on public.wishlists
for delete to authenticated
using (user_id = auth.uid());
