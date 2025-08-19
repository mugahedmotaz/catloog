import { supabaseAdmin } from './supabaseAdmin';

function normalizeDomain(input: string): string {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return '';
  // Remove scheme and trailing slash
  let d = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  // Remove leading www.
  d = d.replace(/^www\./, '');
  return d;
}

export type SimpleStore = {
  id: string;
  name: string;
  slug: string;
  settings: any | null;
};

export type PersistedDomainStatus = {
  domain?: string;
  verified?: boolean;
  needsDNS?: boolean;
  instructions?: string;
  verification?: any[];
  error?: string;
  ok?: boolean;
  success?: boolean;
};

export async function listStores(limit = 100): Promise<SimpleStore[]> {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, slug, settings')
    .limit(limit);
  if (error) throw error;
  return (data || []) as SimpleStore[];
}

export async function listStoresWithDomain(limit = 500): Promise<SimpleStore[]> {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, slug, settings')
    .not('settings->>customDomain', 'is', null)
    .limit(limit);
  if (error) throw error;
  return (data || []) as SimpleStore[];
}

export async function findStoreByCustomDomain(domain: string): Promise<SimpleStore | null> {
  const d = normalizeDomain(domain);
  if (!d) return null;
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, slug, settings')
    .eq('settings->>customDomain', d)
    .maybeSingle();
  if (error) return null;
  return data as SimpleStore;
}

export async function setStoreCustomDomain(storeId: string, domain: string, verified = false): Promise<boolean> {
  const d = normalizeDomain(domain);
  // fetch current settings
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single();
  if (fetchErr) throw fetchErr;
  const next = {
    ...(current?.settings || {}),
    customDomain: d,
    domainVerified: Boolean(verified),
  };
  const { error } = await supabaseAdmin
    .from('stores')
    .update({ settings: next })
    .eq('id', storeId);
  if (error) throw error;
  return true;
}

export async function clearStoreCustomDomain(storeId: string): Promise<boolean> {
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single();
  if (fetchErr) throw fetchErr;
  const s = { ...(current?.settings || {}) } as any;
  delete s.customDomain;
  delete s.domainVerified;
  const { error } = await supabaseAdmin
    .from('stores')
    .update({ settings: s })
    .eq('id', storeId);
  if (error) throw error;
  return true;
}

export async function markDomainVerifiedForStore(storeId: string, verified = true): Promise<boolean> {
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single();
  if (fetchErr) throw fetchErr;
  const s = { ...(current?.settings || {}) } as any;
  s.domainVerified = Boolean(verified);
  const { error } = await supabaseAdmin
    .from('stores')
    .update({ settings: s })
    .eq('id', storeId);
  if (error) throw error;
  return true;
}

// Persist latest fetched domain status for the store that owns the domain
export async function persistDomainStatusForDomain(domain: string, status: PersistedDomainStatus): Promise<void> {
  const owner = await findStoreByCustomDomain(domain);
  if (!owner) return;
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', owner.id)
    .single();
  if (fetchErr) throw fetchErr;
  const s = { ...(current?.settings || {}) } as any;
  s.domainStatus = status || null;
  s.domainLastCheckedAt = new Date().toISOString();
  if (typeof status?.verified === 'boolean') {
    s.domainVerified = Boolean(status.verified);
  }
  const { error } = await supabaseAdmin
    .from('stores')
    .update({ settings: s })
    .eq('id', owner.id);
  if (error) throw error;
}

// Ensure unique domain ownership: clear previous owners of the same domain, then assign to the target store.
export async function linkDomainUniquelyToStore(storeId: string, domain: string, verified = false): Promise<boolean> {
  const d = normalizeDomain(domain);
  if (!d) throw new Error('Invalid domain');
  // find all stores that currently have this domain
  const { data: owners, error: ownersErr } = await supabaseAdmin
    .from('stores')
    .select('id, settings')
    .eq('settings->>customDomain', d);
  if (ownersErr) throw ownersErr;

  // clear for others
  for (const row of owners || []) {
    if (row.id === storeId) continue;
    const s = { ...(row.settings || {}) } as any;
    delete s.customDomain;
    delete s.domainVerified;
    const { error: clrErr } = await supabaseAdmin.from('stores').update({ settings: s }).eq('id', row.id);
    if (clrErr) throw clrErr;
  }

  // set for target
  await setStoreCustomDomain(storeId, d, verified);
  return true;
}

// Clear store link if it matches domain (helper for remove flow)
export async function clearDomainLinkIfMatches(domain: string): Promise<void> {
  const owner = await findStoreByCustomDomain(normalizeDomain(domain));
  if (owner) {
    await clearStoreCustomDomain(owner.id);
  }
}
