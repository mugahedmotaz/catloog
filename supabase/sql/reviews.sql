-- Reviews schema for Catloog
-- Execute in Supabase SQL Editor

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  content text,
  helpful_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, user_id)
);

create index if not exists reviews_product_idx on public.reviews(product_id);
create index if not exists reviews_user_idx on public.reviews(user_id);
create index if not exists reviews_rating_idx on public.reviews(rating);

-- Optional: helpful votes table to prevent multi-vote by same user
create table if not exists public.review_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(review_id, user_id)
);

create index if not exists review_votes_review_idx on public.review_votes(review_id);
create index if not exists review_votes_user_idx on public.review_votes(user_id);

-- RLS
alter table public.reviews enable row level security;
alter table public.review_votes enable row level security;

-- Public can read reviews
create policy if not exists reviews_select_public on public.reviews
for select to anon, authenticated
using (true);

-- Only the author can insert/update/delete their review
create policy if not exists reviews_insert_self on public.reviews
for insert to authenticated
with check (user_id = auth.uid());

create policy if not exists reviews_update_self on public.reviews
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy if not exists reviews_delete_self on public.reviews
for delete to authenticated
using (user_id = auth.uid());

-- Votes: users can insert/delete their own vote
create policy if not exists votes_select_public on public.review_votes
for select to anon, authenticated
using (true);

create policy if not exists votes_insert_self on public.review_votes
for insert to authenticated
with check (user_id = auth.uid());

create policy if not exists votes_delete_self on public.review_votes
for delete to authenticated
using (user_id = auth.uid());

-- Updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger if not exists trg_reviews_updated
before update on public.reviews
for each row execute function public.set_updated_at();
