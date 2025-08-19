import { useEffect, useMemo, useState } from 'react';
import { addDomain, getDomainStatus, removeDomain, DomainStatus } from '../../services/domains';
import {
  listStores,
  listStoresWithDomain,
  findStoreByCustomDomain,
  clearStoreCustomDomain,
  markDomainVerifiedForStore,
  linkDomainUniquelyToStore,
  clearDomainLinkIfMatches,
  persistDomainStatusForDomain,
  saveStoreContactEmail,
  type SimpleStore,
} from '../../services/domainsDb';

export default function AdminDomainsPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState<'add' | 'status' | 'remove' | null>(null);
  const [result, setResult] = useState<DomainStatus | null>(null);
  const [stores, setStores] = useState<SimpleStore[]>([]);
  const [storesWithDomain, setStoresWithDomain] = useState<SimpleStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [owner, setOwner] = useState<SimpleStore | null>(null);
  const [domainStatuses, setDomainStatuses] = useState<Record<string, DomainStatus | null>>({});
  const [contactEmail, setContactEmail] = useState<string>('');

  const canSubmit = useMemo(() => domain.trim().length > 3, [domain]);

  const onAdd = async () => {
    if (!canSubmit) return;
    setLoading('add');
    try {
      const d = domain.trim();
      const res = await addDomain(d);
      setResult(res);
      // Auto-link to selected store uniquely if provided
      if (selectedStoreId) {
        await linkDomainUniquelyToStore(selectedStoreId, d, Boolean(res?.verified));
        const o = await findStoreByCustomDomain(d);
        setOwner(o);
      }
      await reloadDomains();
    } finally {
      setLoading(null);
    }
  };

  const onSaveStoreEmail = async () => {
    const sid = selectedStoreId || owner?.id || '';
    const email = contactEmail.trim().toLowerCase();
    if (!sid || !email) { alert('Select a store and enter an email'); return; }
    try {
      await saveStoreContactEmail(sid, email);
      alert('Store email saved');
      await reloadDomains();
    } catch (e: any) {
      alert(e?.message || 'Failed to save email');
    }
  };

  const onStatus = async (override?: unknown) => {
    const d = (typeof override === 'string' ? override : domain).trim();
    if (!d) return;
    setLoading('status');
    try {
      const res = await getDomainStatus(d);
      setResult(res);
      setDomainStatuses((m) => ({ ...m, [d]: res }));
      // persist to DB for the owner store if any
      try { await persistDomainStatusForDomain(d, res); } catch {}
    } finally {
      setLoading(null);
    }
  };

  const onRemove = async (override?: unknown) => {
    const d = (typeof override === 'string' ? override : domain).trim();
    if (!d) return;
    if (!confirm('Are you sure you want to remove this domain?')) return;
    setLoading('remove');
    try {
      const res = await removeDomain(d);
      setResult(res);
      // Also clear any DB link for this domain
      await clearDomainLinkIfMatches(d);
      const o = await findStoreByCustomDomain(d);
      setOwner(o);
      await reloadDomains();
      setDomainStatuses((m) => ({ ...m, [d]: null }));
    } finally {
      setLoading(null);
    }
  };

  // Load stores once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listStores(200);
        if (active) setStores(list);
        const linked = await listStoresWithDomain(500);
        if (active) setStoresWithDomain(linked);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load stores', e);
      }
    })();
    return () => { active = false; };
  }, []);

  const reloadDomains = async () => {
    try {
      const linked = await listStoresWithDomain(500);
      setStoresWithDomain(linked);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to reload domains list', e);
    }
  };

  const refreshStatusFor = async (d: string) => {
    const res = await getDomainStatus(d);
    setDomainStatuses((m) => ({ ...m, [d]: res }));
    try { await persistDomainStatusForDomain(d, res); } catch {}
  };

  const refreshAllStatuses = async () => {
    const domains = storesWithDomain.map((s) => String((s.settings || {}).customDomain || '')).filter(Boolean);
    await Promise.all(domains.map((d) => refreshStatusFor(d)));
  };

  // Lookup owner by domain
  useEffect(() => {
    let active = true;
    const d = domain.trim();
    if (!d) { setOwner(null); return; }
    (async () => {
      const o = await findStoreByCustomDomain(d);
      if (active) setOwner(o);
    })();
    return () => { active = false; };
  }, [domain]);

  const onLinkToStore = async () => {
    const d = domain.trim();
    if (!d || !selectedStoreId) return;
    await linkDomainUniquelyToStore(selectedStoreId, d, Boolean(result?.verified));
    const o = await findStoreByCustomDomain(d);
    setOwner(o);
    alert('Domain linked to the selected store');
    await reloadDomains();
  };

  // One-click: Add domain -> Check status -> Link to store -> Persist status
  const onConnectAndLink = async () => {
    const d = domain.trim();
    if (!d) { alert('Please enter a domain'); return; }
    if (!selectedStoreId) { alert('Please select a store to link'); return; }
    setLoading('add');
    try {
      const addRes = await addDomain(d);
      const status = await getDomainStatus(d);
      await linkDomainUniquelyToStore(selectedStoreId, d, Boolean(status?.verified ?? addRes?.verified));
      try { await persistDomainStatusForDomain(d, status); } catch {}
      setResult(status);
      setDomainStatuses((m) => ({ ...m, [d]: status }));
      const o = await findStoreByCustomDomain(d);
      setOwner(o);
      await reloadDomains();
    } finally {
      setLoading(null);
    }
  };

  const onUnlinkFromOwner = async () => {
    if (!owner) return;
    await clearStoreCustomDomain(owner.id);
    setOwner(null);
    alert('Unlinked from current owner');
    await reloadDomains();
  };

  const onMarkVerified = async () => {
    if (!owner) return;
    await markDomainVerifiedForStore(owner.id, true);
    const o = await findStoreByCustomDomain(domain.trim());
    setOwner(o);
    alert('Marked as verified');
    await reloadDomains();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Domains Management</h1>
        <p className="text-gray-500 mt-1">Add a custom domain, check its status, remove it, and link it directly to a store.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <label className="block text-sm font-medium mb-1">Domain</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="e.g. menu.example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Link to store</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
            >
              <option value="">Select a store…</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
              ))}
            </select>
            <button
              onClick={onLinkToStore}
              disabled={!domain.trim() || !selectedStoreId}
              className="mt-2 px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
            >Link domain to selected store</button>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Store Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="owner@yourdomain.com"
                  className="flex-1 border rounded px-3 py-2"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <button onClick={onSaveStoreEmail} className="px-3 py-2 rounded bg-teal-600 text-white">Save</button>
              </div>
              <p className="text-xs text-gray-500 mt-1">سيتم حفظه في settings.contactEmail للمتجر المحدد.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Current owner</label>
            {owner ? (
              <div className="p-2 border rounded">
                <div className="font-medium">{owner.name}</div>
                <div className="text-xs text-gray-600">{owner.slug}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={onUnlinkFromOwner} className="px-3 py-1.5 rounded bg-amber-600 text-white">Unlink</button>
                  {result?.verified === true && (
                    <button onClick={onMarkVerified} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Mark as verified</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-2 border rounded text-gray-500">No store currently owns this domain</div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onConnectAndLink}
            disabled={!canSubmit || !selectedStoreId || loading !== null}
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
          >{loading === 'add' ? 'Processing…' : 'Connect & Link (one click)'}</button>
          <button
            onClick={onAdd}
            disabled={!canSubmit || loading !== null}
            className="px-4 py-2 rounded bg-teal-600 text-white disabled:opacity-60"
          >{loading === 'add' ? 'Submitting…' : 'Connect domain (auto-link if selected)'}</button>
          <button
            onClick={onStatus}
            disabled={!canSubmit || loading !== null}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
          >{loading === 'status' ? 'Checking…' : 'Check status'}</button>
          <button
            onClick={onRemove}
            disabled={!canSubmit || loading !== null}
            className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60"
          >{loading === 'remove' ? 'Removing…' : 'Remove domain'}</button>
        </div>
      </div>

      {/* Linked domains table */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Linked domains</h2>
          <div className="flex items-center gap-2">
            <button onClick={reloadDomains} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">Reload list</button>
            <button onClick={refreshAllStatuses} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">Refresh all statuses</button>
          </div>
        </div>
        {storesWithDomain.length === 0 ? (
          <div className="text-sm text-gray-500">No domains linked yet.</div>
        ) : (
          <div className="table-scroll scrollbar">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left p-2 sticky top-0 bg-gray-50">Store</th>
                  <th className="text-left p-2 sticky top-0 bg-gray-50">Domain</th>
                  <th className="text-left p-2 sticky top-0 bg-gray-50">Verified</th>
                  <th className="text-left p-2 sticky top-0 bg-gray-50">Persisted status</th>
                  <th className="text-left p-2 sticky top-0 bg-gray-50">Last checked</th>
                  <th className="text-left p-2 sticky top-0 bg-gray-50">Live status</th>
                  <th className="text-left p-2 sticky top-0 bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {storesWithDomain.map((s) => {
                  const d = String((s.settings || {}).customDomain || '');
                  const v = Boolean((s.settings || {}).domainVerified);
                  const persisted = (s.settings || {}).domainStatus as any | undefined;
                  const lastChecked = String((s.settings || {}).domainLastCheckedAt || '');
                  const vs = domainStatuses[d];
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-medium">{s.name} <span className="text-xs text-gray-500">({s.slug})</span></td>
                      <td className="p-2">{d}</td>
                      <td className="p-2">{v ? 'Yes' : 'No'}</td>
                      <td className="p-2">
                        {persisted ? (
                          <span className={persisted?.verified ? 'text-emerald-700' : 'text-amber-700'}>
                            {persisted?.verified ? 'Verified' : (persisted?.ok === false ? 'Error' : 'Pending')}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-2 text-xs text-gray-600">{lastChecked ? new Date(lastChecked).toLocaleString() : '—'}</td>
                      <td className="p-2">
                        {vs ? (
                          <div className="flex items-center gap-2">
                            <span>{vs.verified ? 'Verified ✅' : 'Pending ❗'}</span>
                            <button className="px-2 py-0.5 text-xs rounded bg-gray-100 hover:bg-gray-200" onClick={() => refreshStatusFor(d)}>Refresh</button>
                          </div>
                        ) : (
                          <button className="px-2 py-0.5 text-xs rounded bg-gray-100 hover:bg-gray-200" onClick={() => refreshStatusFor(d)}>Load</button>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 rounded bg-amber-600 text-white"
                            onClick={async () => { await clearStoreCustomDomain(s.id); if (owner?.id === s.id) setOwner(null); await reloadDomains(); }}
                          >Unlink</button>
                          <button
                            className="px-2 py-1 rounded bg-red-600 text-white"
                            onClick={async () => { await onRemove(d); }}
                          >Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-2">Result</h2>
          <div className="grid gap-2 text-sm">
            {result.domain && <div><span className="font-medium">Domain:</span> {result.domain}</div>}
            {typeof result.verified === 'boolean' && (
              <div>
                <span className="font-medium">Verification:</span> {result.verified ? 'Verified ✅' : 'Pending ❗'}
              </div>
            )}
            {result.instructions && (
              <div className="text-gray-700">
                <span className="font-medium">Instructions:</span> {result.instructions}
              </div>
            )}
            {Array.isArray(result.verification) && result.verification.length > 0 && (
              <div>
                <div className="font-medium mb-1">Verification records (DNS):</div>
                <ul className="list-disc pl-6">
                  {result.verification.map((v, idx) => (
                    <li key={idx} className="text-gray-700">
                      <code className="bg-gray-100 rounded px-1 py-0.5">{JSON.stringify(v)}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.error && (
              <div className="text-red-600">Error: {result.error}</div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Note: If you see Unauthorized or Access Denied, ensure Vercel env vars are set
        (VERCEL_TOKEN, VERCEL_STORES_PROJECT_ID/VERCEL_PROJECT_ID, and optional VERCEL_TEAM_ID), and that the domain is verified on Vercel.
      </div>
    </div>
  );
}
