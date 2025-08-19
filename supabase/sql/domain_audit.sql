-- Domain audit log table
create table if not exists public.domain_audit (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  action text not null,
  domain text,
  store_id uuid,
  ok boolean,
  message text
);

-- Optional index for recent queries
create index if not exists domain_audit_created_at_idx on public.domain_audit (created_at desc);
create index if not exists domain_audit_domain_idx on public.domain_audit (domain);
create index if not exists domain_audit_store_idx on public.domain_audit (store_id);
