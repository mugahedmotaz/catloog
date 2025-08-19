-- Ensure unique custom domains per store with a normalized generated column
-- Normalization: lowercase, strip protocol (http/https), strip leading www., trim spaces
-- Then create a partial UNIQUE index so multiple NULLs are allowed but any non-null is unique

-- 1) Optional: drop old expression index if it exists (migrating to the new generated column approach)
DROP INDEX IF EXISTS public.stores_unique_custom_domain;

-- 2) Add generated column (normalized) if not exists
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS custom_domain text
  GENERATED ALWAYS AS (
    NULLIF(
      lower(
        regexp_replace(
          regexp_replace(
            regexp_replace(coalesce((settings->>'customDomain')::text, ''), '^https?://', '', 'i'),
            '^www\.',
            '',
            'i'
          ),
          '/$',''
        )
      ),
      ''
    )
  ) STORED;

-- 3) Create partial UNIQUE index on the normalized column
CREATE UNIQUE INDEX IF NOT EXISTS stores_unique_custom_domain_normalized
  ON public.stores (custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Note:
-- - Keep writing the source domain to settings->>'customDomain' from the app layer.
-- - The generated column keeps a normalized mirror used for uniqueness and fast lookups.
