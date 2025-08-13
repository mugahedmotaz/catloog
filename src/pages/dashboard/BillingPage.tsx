import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface InvoiceRow {
  id: string;
  plan_id: string;
  period: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  status: 'pending_receipt' | 'under_review' | 'approved' | 'rejected';
  receipt_url: string | null;
  reason?: string | null;
  created_at: string;
}

export function BillingPage() {
  const { user } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: stores, error: sErr } = await supabase
          .from('stores')
          .select('id')
          .eq('merchant_id', user.id)
          .limit(1);
        if (sErr) throw sErr;
        const sId = stores?.[0]?.id || null;
        if (!active) return;
        setStoreId(sId);
        if (!sId) return;
        const { data: inv, error: iErr } = await supabase
          .from('invoices')
          .select('id,plan_id,period,amount,currency,status,receipt_url,reason,created_at')
          .eq('store_id', sId)
          .order('created_at', { ascending: false });
        if (iErr) throw iErr;
        if (!active) return;
        setInvoices((inv || []) as any);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load invoices', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <Button variant="secondary" onClick={() => window.location.assign('/dashboard/upgrade')}>Upgrade plan</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading…</div>
          ) : !storeId ? (
            <div className="text-slate-600">No store found.</div>
          ) : invoices.length === 0 ? (
            <div className="text-slate-600">No invoices yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3">Invoice</th>
                    <th className="text-left p-3">Plan</th>
                    <th className="text-left p-3">Period</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Receipt</th>
                    <th className="text-left p-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-3">{it.id}</td>
                      <td className="p-3">{it.plan_id}</td>
                      <td className="p-3">{it.period}</td>
                      <td className="p-3">{it.amount} {it.currency}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                          it.status === 'approved' ? 'bg-green-100 text-green-700' :
                          it.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                          it.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {it.status.replace('_',' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        {it.receipt_url ? (
                          <a className="text-teal-700 underline" href={it.receipt_url} target="_blank" rel="noreferrer">View</a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {it.status === 'rejected' ? (it.reason || 'No reason provided') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BillingPage;
