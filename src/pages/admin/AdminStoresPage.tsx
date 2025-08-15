import { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../services/supabaseAdmin';
import { useAdminIsAdmin } from '../../hooks/useAdminIsAdmin';
import type { Store, Subscription, Plan } from '../../types';
import { Button } from '../../components/ui/button';

interface StoreWithSub extends Store {
  subscription?: Subscription & { plan?: Plan };
}

export function AdminStoresPage() {
  const { isAdmin, loading: adminLoading } = useAdminIsAdmin();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreWithSub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!isAdmin) return;
      setLoading(true);
      try {
        const [{ data: storesData, error: sErr }, { data: plansData, error: pErr }] = await Promise.all([
          supabaseAdmin.from('stores').select('id,name,slug,logo,description,whatsapp_number,merchant_id,theme,settings,is_active,created_at,updated_at').order('created_at', { ascending: false }),
          supabaseAdmin.from('plans').select('id,name,price_monthly,price_yearly,currency,is_active')
        ]);
        if (sErr) throw sErr;
        if (pErr) throw pErr;

        // map stores to app type
        const mappedStores: Store[] = (storesData || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          logo: r.logo ?? undefined,
          description: r.description ?? undefined,
          whatsappNumber: r.whatsapp_number,
          merchantId: r.merchant_id,
          theme: (typeof r.theme === 'object' ? r.theme : { primaryColor: '#0f766e', secondaryColor: '#0ea5a4', accentColor: '#14b8a6', backgroundColor: '#ffffff', textColor: '#0f172a', fontFamily: 'Inter' }),
          settings: (typeof r.settings === 'object' ? r.settings : { currency: 'USD', language: 'en', allowDelivery: false, deliveryFee: 0, minimumOrder: 0, orderMessageTemplate: '' }),
          isActive: !!r.is_active,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
        }));

        // fetch subscriptions for these stores
        const storeIds = mappedStores.map(s => s.id);
        const { data: subsData, error: subErr } = await supabaseAdmin
          .from('subscriptions')
          .select('id,store_id,plan_id,period,starts_at,ends_at,is_active,created_at,updated_at')
          .in('store_id', storeIds);
        if (subErr) throw subErr;

        const subs = ((subsData as any[]) || []).reduce<Record<string, Subscription>>((acc: Record<string, Subscription>, r: any) => {
          const sub: Subscription = {
            id: r.id,
            storeId: r.store_id,
            planId: r.plan_id,
            period: r.period,
            startsAt: new Date(r.starts_at),
            endsAt: r.ends_at ? new Date(r.ends_at) : null,
            isActive: !!r.is_active,
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at),
          };
          // keep latest active per store
          const existing = acc[sub.storeId];
          if (!existing || (existing.startsAt < sub.startsAt)) acc[sub.storeId] = sub;
          return acc;
        }, {});

        const mappedPlans: Plan[] = (plansData || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          description: undefined,
          priceMonthly: Number(r.price_monthly ?? 0),
          priceYearly: r.price_yearly != null ? Number(r.price_yearly) : null,
          currency: r.currency,
          productLimit: null,
          variantLimit: null,
          storageMb: null,
          features: [],
          isActive: !!r.is_active,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        const storesWithSub: StoreWithSub[] = mappedStores.map(s => ({
          ...s,
          subscription: subs[s.id] ? { ...subs[s.id], plan: mappedPlans.find(pl => pl.id === subs[s.id].planId) } : undefined,
        }));

        if (!active) return;
        setPlans(mappedPlans);
        setStores(storesWithSub);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load stores', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [isAdmin]);

  if (adminLoading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Not authorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stores</h1>
      </div>

      {loading ? (
        <div>Loading stores…</div>
      ) : stores.length === 0 ? (
        <div className="text-slate-600">No stores found.</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Store</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Subscription</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-slate-600">{s.slug}</td>
                  <td className="p-3">{s.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="p-3">
                    {s.subscription ? (
                      <div>
                        <div className="font-medium">{s.subscription.plan?.name || s.subscription.planId}</div>
                        <div className="text-slate-500 text-xs">{s.subscription.period} • since {s.subscription.startsAt.toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500">No subscription</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => alert('TODO: view store')}>Open</Button>
                      <select
                        className="h-9 px-2 border border-slate-200 rounded"
                        value={s.subscription?.planId || ''}
                        onChange={async (e) => {
                          const newPlanId = e.target.value;
                          if (!newPlanId) return;
                          const payload = {
                            store_id: s.id,
                            plan_id: newPlanId,
                            period: 'monthly' as const,
                            starts_at: new Date().toISOString(),
                            is_active: true,
                          };
                          const { error } = await supabaseAdmin.from('subscriptions').insert(payload);
                          if (!error) {
                            // refresh minimal
                            const plan = plans.find(p => p.id === newPlanId);
                            setStores(prev => prev.map(x => x.id === s.id ? {
                              ...x,
                              subscription: {
                                id: 'new',
                                storeId: s.id,
                                planId: newPlanId,
                                period: 'monthly',
                                startsAt: new Date(),
                                endsAt: null,
                                isActive: true,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                plan,
                              }
                            } : x));
                          }
                        }}
                      >
                        <option value="" disabled>Assign plan…</option>
                        {plans.filter(pl => pl.isActive).map(pl => (
                          <option key={pl.id} value={pl.id}>{pl.name}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminStoresPage;
