export type BasicUser = {
  email?: string | null;
  user_metadata?: Record<string, any> | null;
} | null | undefined;

/**
 * Returns a nice display name for a Supabase user using common metadata fields.
 * Order: full_name → name → user_name → email local-part → 'User'.
 */
export function getDisplayName(user: BasicUser): string {
  const meta = user?.user_metadata || {};
  const byMeta = meta.full_name || meta.name || meta.user_name;
  if (typeof byMeta === 'string' && byMeta.trim().length > 0) return byMeta.trim();
  const email = user?.email || '';
  if (email) return email.split('@')[0];
  return 'User';
}
