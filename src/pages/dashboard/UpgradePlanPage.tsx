import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import toast from 'react-hot-toast';
import { createInvoice, submitPaymentReference } from '../../services/invoices';

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  features: string[] | null;
}

export function UpgradePlanPage() {
  const { user } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [yearly, setYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanRow | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  // Payment reference form state
  const [referenceCode, setReferenceCode] = useState('');
  const [paidAt, setPaidAt] = useState(''); // ISO date string (yyyy-mm-dd)
  const [payerName, setPayerName] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // get user's store (first one)
        const { data: stores, error: sErr } = await supabase
          .from('stores')
          .select('id')
          .eq('merchant_id', user.id)
          .limit(1);
        if (sErr) throw sErr;
        const sId = stores?.[0]?.id || null;
        if (!sId) {
          toast.error('No store found for your account');
          return;
        }
        if (!active) return;
        setStoreId(sId);
        // fetch active plans
        const { data: pl, error: pErr } = await supabase
          .from('plans')
          .select('id,name,description,price_monthly,price_yearly,currency,features,is_active')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });
        if (pErr) throw pErr;
        if (!active) return;
        setPlans((pl || []) as any);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load plans');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user]);

  const priceFor = (p: PlanRow) => yearly ? (p.price_yearly ?? null) : (p.price_monthly ?? null);
  const bankAccount = '3355058'; // Bank of Khartoum account

  const recommendedOrder = useMemo(() => {
    const idx = plans.findIndex(p => (p.name || '').toLowerCase() === 'growth');
    if (idx > -1) {
      const arr = [...plans];
      const [g] = arr.splice(idx, 1);
      arr.splice(1, 0, g);
      return arr;
    }
    return plans;
  }, [plans]);



  async function handleCreateAndSend() {
    if (!storeId) { toast.error('No store found'); return; }
    if (!selectedPlan) { toast.error('Choose a plan first'); return; }
    if (!referenceCode) { toast.error('Enter transfer reference'); return; }
    if (!paidAt) { toast.error('Select payment date'); return; }
    const amount = priceFor(selectedPlan);
    if (amount == null) { toast.error('This plan requires contacting sales'); return; }
    try {
      setLoading(true);
      const inv = await createInvoice({ storeId, planId: selectedPlan.id, period: yearly ? 'yearly' : 'monthly', amount, currency: selectedPlan.currency });
      setInvoiceId(inv.id);
      await submitPaymentReference({
        invoiceId: inv.id,
        storeId,
        referenceCode,
        paidAt,
        amount,
        payerName: payerName || undefined,
        note: note || undefined,
      });
      toast.success('Payment reference submitted. Awaiting admin review.');
      // Optional: reset form
      // setReferenceCode(''); setPaidAt(''); setPayerName(''); setNote('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit reference');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upgrade your plan</h1>
        <p className="mt-1 text-slate-600 text-sm">Choose a plan, pay to Bank of Khartoum account <strong>{bankAccount}</strong>, then upload the payment receipt image to activate.</p>
      </div>

      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 w-max">
        <button className={`h-9 px-4 text-sm font-semibold rounded-lg uppercase ${!yearly ? 'bg-teal-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setYearly(false)}>Monthly</button>
        <button className={`h-9 px-4 text-sm font-semibold rounded-lg uppercase ${yearly ? 'bg-teal-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => setYearly(true)}>Yearly</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {recommendedOrder.map((p) => {
            const price = priceFor(p);
            const feats: string[] = Array.isArray(p.features) ? p.features : [];
            const selected = selectedPlan?.id === p.id;
            const isRecommended = (p.name || '').toLowerCase() === 'growth';
            return (
              <div key={p.id} className={`relative p-6 rounded-2xl border ${selected ? 'border-teal-300 ring-1 ring-teal-200 shadow-md' : isRecommended ? 'border-amber-300 ring-1 ring-amber-200 shadow-sm' : 'border-slate-200'} bg-white`}>
                {isRecommended && (
                  <div className="absolute -top-3 right-4 rounded-full bg-amber-500 text-white text-[11px] font-semibold px-3 py-1 shadow">
                    Best value
                  </div>
                )}
                <h3 className="font-semibold">{p.name}</h3>
                <div className="mt-2 text-3xl font-extrabold">{price != null ? `$${price}/${yearly ? 'yr' : 'mo'}` : 'Contact sales'}</div>
                {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
                {feats.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {feats.slice(0, 6).map(f => (
                      <li key={f} className="flex items-center gap-2">• {f.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                )}
                <Button className="mt-6 w-full bg-teal-600 text-white hover:bg-teal-700 uppercase tracking-wide" variant={selected ? 'default' : 'secondary'} onClick={() => setSelectedPlan(p)}>
                  {selected ? 'Selected' : 'Choose plan'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-6 rounded-2xl border border-slate-200 bg-white">
        <h3 className="font-semibold">Payment instructions</h3>
        <ol className="mt-2 list-decimal ms-5 text-sm text-slate-700 space-y-1">
          <li>Select a plan and billing period (monthly/yearly).</li>
          <li>Click "Send for review" to generate an invoice and submit your transfer reference.</li>
          <li>Transfer the amount to Bank of Khartoum account <strong>{bankAccount}</strong>.</li>
          <li>Enter the bank transfer reference here. We will review and activate your subscription.</li>
        </ol>
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-600">Transfer reference</label>
            <Input placeholder="e.g. BK-123456" value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-600">Paid date</label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-600">Payer name (optional)</label>
            <Input placeholder="Your name" value={payerName} onChange={(e) => setPayerName(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-600">Note (optional)</label>
            <Input placeholder="Any additional note" value={note} onChange={(e) => setNote(e.target.value)} disabled={loading} />
          </div>
        </div>
        <div className="mt-4">
          <Button className='bg-teal-600 text-white hover:bg-teal-700 uppercase tracking-wide' onClick={handleCreateAndSend} disabled={!selectedPlan || !referenceCode || !paidAt || loading}>
            Send for review
          </Button>
        </div>
        {invoiceId && <p className="mt-2 text-xs text-slate-500">Invoice ID: {invoiceId}</p>}
      </div>
    </div>
  );
}

export default UpgradePlanPage;
