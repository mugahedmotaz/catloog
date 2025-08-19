-- Ensure unique custom domains per store by indexing the JSON path
-- Create an expression index on (settings->>customDomain) and enforce uniqueness for non-null values

-- Recommended: run on your Supabase project
-- This creates a partial unique index so multiple NULLs are allowed, but any non-null value is unique
CREATE UNIQUE INDEX IF NOT EXISTS stores_unique_custom_domain
ON public.stores ((settings->>('customDomain')))
WHERE (settings->>('customDomain')) IS NOT NULL;
