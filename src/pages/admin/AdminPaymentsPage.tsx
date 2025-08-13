import { useEffect, useState } from 'react';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { listPendingInvoices, setInvoiceStatus, type InvoiceWithRelations } from '../../services/invoices';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';

type PendingItem = InvoiceWithRelations;

export default function AdminPaymentsPage() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'pending' | 'subscriptions'>('pending');

  // Subscriptions state
  type AdminSub = {
    id: string;
    store_id: string;
    plan_id: string;
    period: 'monthly' | 'yearly';
    starts_at: string;
    ends_at: string | null;
    is_active: boolean;
    created_at: string;
    stores?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
    plans?: { name?: string } | { name?: string }[] | null;
  };
  const [subs, setSubs] = useState<AdminSub[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // UI controls: search/filter/sort/pagination
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const [sortKey, setSortKey] = useState<'created_at' | 'amount' | 'store' | 'plan'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listPendingInvoices();
      setItems(data as any);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin && view === 'pending') void refresh(); }, [isAdmin, view]);

  async function refreshSubs() {
    setLoadingSubs(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id,store_id,plan_id,period,starts_at,ends_at,is_active,created_at,stores(name,slug),plans(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubs((data as any) || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => { if (isAdmin && view === 'subscriptions') void refreshSubs(); }, [isAdmin, view]);

  // Derived helpers
  function getStoreName(it: PendingItem): string {
    const s = it.stores as any;
    if (!s) return it.store_id;
    return Array.isArray(s) ? (s[0]?.name ?? it.store_id) : (s.name ?? it.store_id);
  }
  function getPlanName(it: PendingItem): string {
    const p = it.plans as any;
    if (!p) return it.plan_id;
    return Array.isArray(p) ? (p[0]?.name ?? it.plan_id) : (p.name ?? it.plan_id);
  }

  // Helpers for subscriptions view
  function subStoreName(s: AdminSub): string {
    const st = s.stores as any;
    if (!st) return s.store_id;
    return Array.isArray(st) ? (st[0]?.name ?? s.store_id) : (st.name ?? s.store_id);
  }
  function subPlanName(s: AdminSub): string {
    const p = s.plans as any;
    if (!p) return s.plan_id;
    return Array.isArray(p) ? (p[0]?.name ?? s.plan_id) : (p.name ?? s.plan_id);
  }

  // Distinct plan names for filter options
  const planOptions = Array.from(new Set(items.map((it) => getPlanName(it)).filter(Boolean)));

  // Filtering + searching
  const filtered = items.filter((it) => {
    const q = query.trim().toLowerCase();
    const name = getStoreName(it).toLowerCase();
    const plan = getPlanName(it).toLowerCase();
    const refs = Array.isArray(it.invoice_payments) ? it.invoice_payments : [];
    const latestRef = refs[0]?.reference_code?.toLowerCase?.() ?? '';

    const matchesQuery = !q || name.includes(q) || plan.includes(q) || latestRef.includes(q) || it.id.toLowerCase().includes(q);
    const matchesPlan = planFilter === 'all' || getPlanName(it) === planFilter;
    const matchesPeriod = periodFilter === 'all' || it.period === periodFilter;
    return matchesQuery && matchesPlan && matchesPeriod;
  });

  // Sorting
  const sorted = filtered.slice().sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'created_at') {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    }
    if (sortKey === 'amount') {
      return ((a.amount ?? 0) - (b.amount ?? 0)) * dir;
    }
    if (sortKey === 'store') {
      return getStoreName(a).localeCompare(getStoreName(b)) * dir;
    }
    // plan
    return getPlanName(a).localeCompare(getPlanName(b)) * dir;
  });

  // Pagination
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = sorted.slice(start, end);

  if (adminLoading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Not authorized</div>;

  async function approve(item: PendingItem) {
    try {
      // create subscription record
      const starts = new Date();
      const ends = new Date(starts);
      if (item.period === 'monthly') ends.setMonth(ends.getMonth() + 1);
      else ends.setFullYear(ends.getFullYear() + 1);

      const subPayload = {
        store_id: item.store_id,
        plan_id: item.plan_id,
        period: item.period,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_active: true,
      };
      const { error: subErr } = await supabase.from('subscriptions').insert(subPayload);
      if (subErr) throw subErr;
      await setInvoiceStatus(item.id, 'approved');
      toast.success('Approved and subscription activated');
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to approve');
    }
  }

  async function reject(item: PendingItem) {
    try {
      const reason = window.prompt('Enter rejection reason (optional):', '');
      await setInvoiceStatus(item.id, 'rejected', reason || undefined);
      toast.success('Rejected');
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to reject');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Admin • Payments</h1>
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              className={`h-9 px-3 text-sm font-medium rounded-lg ${view === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setView('pending')}
            >Pending</button>
            <button
              className={`h-9 px-3 text-sm font-medium rounded-lg ${view === 'subscriptions' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setView('subscriptions')}
            >Subscriptions</button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by store, plan, invoice or reference"
            className="h-9 px-3 rounded-md border border-slate-300 text-sm w-64 max-w-full"
          />
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="h-9 px-2 rounded-md border border-slate-300 text-sm"
          >
            <option value="all">All plans</option>
            {planOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
          <select
            value={periodFilter}
            onChange={(e) => { setPeriodFilter(e.target.value as any); setPage(1); }}
            className="h-9 px-2 rounded-md border border-slate-300 text-sm"
          >
            <option value="all">All periods</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="h-9 px-2 rounded-md border border-slate-300 text-sm"
          >
            <option value="created_at">Newest</option>
            <option value="amount">Amount</option>
            <option value="store">Store</option>
            <option value="plan">Plan</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as any)}
            className="h-9 px-2 rounded-md border border-slate-300 text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          {view === 'pending' ? (
            <Button variant="secondary" onClick={refresh} disabled={loading}>Refresh</Button>
          ) : (
            <Button variant="secondary" onClick={refreshSubs} disabled={loadingSubs}>Refresh</Button>
          )}
        </div>
      </div>

      {view === 'pending' ? (
        loading ? (
          <div>Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-slate-600">No payments awaiting review.</div>
        ) : (
          <>
          {/* Desktop / Tablet (md+) Table */}
          <div className="hidden md:block overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">Invoice</th>
                  <th className="text-left p-3">Store</th>
                  <th className="text-left p-3">Plan</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-3">{it.id}</td>
                    <td className="p-3">{getStoreName(it)}</td>
                    <td className="p-3">{getPlanName(it)} • {it.period}</td>
                    <td className="p-3">{it.amount} {it.currency}</td>
                    <td className="p-3">
                      {(() => {
                        const refs = Array.isArray(it.invoice_payments) ? it.invoice_payments : [];
                        // pick latest by created_at if present
                        const latest = refs
                          .slice()
                          .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
                        if (!latest) return <span className="text-slate-500">No reference</span>;
                        return (
                          <div className="space-y-0.5">
                            <div><span className="text-slate-500">Code:</span> {latest.reference_code}</div>
                            {latest.paid_at && (<div><span className="text-slate-500">Paid:</span> {new Date(latest.paid_at).toLocaleString()}</div>)}
                            {latest.payer_name && (<div><span className="text-slate-500">Payer:</span> {latest.payer_name}</div>)}
                            {latest.note && (<div className="text-slate-500">{latest.note}</div>)}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button onClick={() => approve(it)}>Approve</Button>
                        <Button variant="destructive" onClick={() => reject(it)}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile (sm) Cards */}
          <div className="md:hidden space-y-3">
            {pageItems.map((it) => {
              const refs = Array.isArray(it.invoice_payments) ? it.invoice_payments : [];
              const latest = refs
                .slice()
                .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
              return (
                <div key={it.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500">Invoice</div>
                      <div className="text-sm font-medium break-all">{it.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Amount</div>
                      <div className="text-sm font-semibold">{it.amount} {it.currency}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-slate-500">Store</div>
                    <div className="text-sm">{getStoreName(it)}</div>
                  </div>
                  <div className="mt-1">
                    <div className="text-xs text-slate-500">Plan</div>
                    <div className="text-sm">{getPlanName(it)} • {it.period}</div>
                  </div>
                  <div className="mt-1">
                    <div className="text-xs text-slate-500">Reference</div>
                    {latest ? (
                      <div className="text-sm space-y-0.5">
                        <div><span className="text-slate-500">Code:</span> {latest.reference_code}</div>
                        {latest.paid_at && (<div><span className="text-slate-500">Paid:</span> {new Date(latest.paid_at).toLocaleDateString()}</div>)}
                        {latest.payer_name && (<div><span className="text-slate-500">Payer:</span> {latest.payer_name}</div>)}
                        {latest.note && (<div className="text-slate-500">{latest.note}</div>)}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No reference</div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button className="flex-1" onClick={() => approve(it)}>Approve</Button>
                    <Button className="flex-1" variant="destructive" onClick={() => reject(it)}>Reject</Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
            <div className="text-sm text-slate-600">Showing {start + 1}-{Math.min(end, total)} of {total}</div>
            <div className="flex items-center gap-2">
              <button disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-9 px-3 rounded-md border border-slate-300 text-sm disabled:opacity-50">Prev</button>
              <div className="text-sm">Page {safePage} / {totalPages}</div>
              <button disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-9 px-3 rounded-md border border-slate-300 text-sm disabled:opacity-50">Next</button>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-9 px-2 rounded-md border border-slate-300 text-sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          </>
        )
      ) : (
        // Subscriptions view
        loadingSubs ? (
          <div>Loading subscriptions…</div>
        ) : subs.length === 0 ? (
          <div className="text-slate-600">No active subscriptions.</div>
        ) : (
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">Store</th>
                  <th className="text-left p-3">Plan</th>
                  <th className="text-left p-3">Period</th>
                  <th className="text-left p-3">Start</th>
                  <th className="text-left p-3">End</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{subStoreName(s)}</td>
                    <td className="p-3">{subPlanName(s)}</td>
                    <td className="p-3">{s.period}</td>
                    <td className="p-3">{new Date(s.starts_at).toLocaleDateString()}</td>
                    <td className="p-3">{s.ends_at ? new Date(s.ends_at).toLocaleDateString() : '-'}</td>
                    <td className="p-3">{s.is_active ? 'Active' : 'Inactive'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const nowIso = new Date().toISOString();
                              const { error } = await supabase
                                .from('subscriptions')
                                .update({ is_active: false, ends_at: nowIso })
                                .eq('id', s.id);
                              if (error) throw error;
                              toast.success('Subscription cancelled');
                              await refreshSubs();
                            } catch (e) {
                              console.error(e);
                              toast.error('Failed to cancel');
                            }
                          }}
                        >Cancel</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
