import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import type { Plan } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export function AdminPlansPage() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    currency: 'USD',
    priceMonthly: '',
    priceYearly: '',
    productLimit: '',
    variantLimit: '',
    storageMb: '',
    features: '' // comma separated
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!isAdmin) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('id,name,description,price_monthly,price_yearly,currency,product_limit,variant_limit,storage_mb,features,is_active,created_at,updated_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!active) return;
        const mapped: Plan[] = (data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? undefined,
          priceMonthly: Number(r.price_monthly ?? 0),
          priceYearly: r.price_yearly != null ? Number(r.price_yearly) : null,
          currency: r.currency,
          productLimit: r.product_limit,
          variantLimit: r.variant_limit,
          storageMb: r.storage_mb,
          features: r.features ?? [],
          isActive: !!r.is_active,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
        }));
        setPlans(mapped);
      } catch (e) {
        console.error('Failed to load plans', e);
        toast.error('Failed to load plans');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [isAdmin]);

  const title = useMemo(() => (adminLoading ? 'Checking permission…' : 'Plans'), [adminLoading]);

  if (adminLoading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Not authorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={async () => {
            try {
              setLoading(true);
              const existingNames = new Set(plans.map(p => p.name.toLowerCase()));
              const seed = [
                {
                  name: 'Starter', description: 'For MVPs and small catalogs', currency: 'USD',
                  price_monthly: 9, price_yearly: 90, product_limit: 100, variant_limit: 300, storage_mb: 1024,
                  features: ['analytics_basic','coupons','email_basic'], is_active: true
                },
                {
                  name: 'Growth', description: 'For growing stores', currency: 'USD',
                  price_monthly: 29, price_yearly: 290, product_limit: 1000, variant_limit: 3000, storage_mb: 5120,
                  features: ['custom_domain','seo_advanced','analytics_basic','abandoned_cart','multi_currency','integrations_basic','webhooks_basic','export_csv'], is_active: true
                },
                {
                  name: 'Pro', description: 'Advanced features for medium stores', currency: 'USD',
                  price_monthly: 79, price_yearly: 790, product_limit: 10000, variant_limit: 30000, storage_mb: 20480,
                  features: ['custom_domain','seo_advanced','analytics_advanced','abandoned_cart','multi_currency','multi_language','themes_advanced','api_access','webhooks_advanced','inventory_multi_location','export_csv','scheduled_exports'], is_active: true
                },
                {
                  name: 'Enterprise', description: 'Custom needs and SLA', currency: 'USD',
                  price_monthly: 249, price_yearly: 2490, product_limit: null, variant_limit: null, storage_mb: null,
                  features: ['custom_domain','seo_advanced','analytics_advanced','abandoned_cart','multi_currency','multi_language','themes_advanced','api_access','webhooks_advanced','inventory_multi_location','export_csv','scheduled_exports','sso_saml','audit_logs','sla_99_9','support_priority','data_residency'], is_active: true
                },
              ];
              const toInsert = seed.filter(s => !existingNames.has(s.name.toLowerCase()));
              if (toInsert.length === 0) {
                toast('All default plans already exist');
              } else {
                const { data, error } = await supabase.from('plans').insert(toInsert).select('*');
                if (error) throw error;
                const mapped = (data || []).map((r: any) => ({
                  id: r.id,
                  name: r.name,
                  description: r.description ?? undefined,
                  priceMonthly: Number(r.price_monthly ?? 0),
                  priceYearly: r.price_yearly != null ? Number(r.price_yearly) : null,
                  currency: r.currency,
                  productLimit: r.product_limit,
                  variantLimit: r.variant_limit,
                  storageMb: r.storage_mb,
                  features: r.features ?? [],
                  isActive: !!r.is_active,
                  createdAt: new Date(r.created_at),
                  updatedAt: new Date(r.updated_at),
                }));
                setPlans(prev => [...mapped, ...prev]);
                toast.success(`Inserted ${mapped.length} plan(s)`);
              }
            } catch (e) {
              console.error(e);
              toast.error('Failed to seed plans');
            } finally {
              setLoading(false);
            }
          }}>Add recommended plans</Button>
          <Button onClick={() => {
            setEditing(null);
            setForm({
              name: '', description: '', currency: 'USD', priceMonthly: '', priceYearly: '',
              productLimit: '', variantLimit: '', storageMb: '', features: ''
            });
            setModalOpen(true);
          }}>New Plan</Button>
        </div>
      </div>

      {loading ? (
        <div>Loading plans…</div>
      ) : plans.length === 0 ? (
        <div className="text-slate-600">No plans yet.</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Limits</th>
                <th className="text-left p-3">Active</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-slate-500">{p.description}</div>}
                  </td>
                  <td className="p-3">
                    <div>{p.priceMonthly} {p.currency}/mo</div>
                    {p.priceYearly != null && <div className="text-slate-500">{p.priceYearly} {p.currency}/yr</div>}
                  </td>
                  <td className="p-3 text-slate-600">
                    <div>Products: {p.productLimit ?? '∞'}</div>
                    <div>Variants: {p.variantLimit ?? '∞'}</div>
                    <div>Storage: {p.storageMb ?? '∞'} MB</div>
                  </td>
                  <td className="p-3">{p.isActive ? 'Yes' : 'No'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => {
                        setEditing(p);
                        setForm({
                          name: p.name,
                          description: p.description ?? '',
                          currency: p.currency,
                          priceMonthly: String(p.priceMonthly ?? ''),
                          priceYearly: p.priceYearly != null ? String(p.priceYearly) : '',
                          productLimit: p.productLimit != null ? String(p.productLimit) : '',
                          variantLimit: p.variantLimit != null ? String(p.variantLimit) : '',
                          storageMb: p.storageMb != null ? String(p.storageMb) : '',
                          features: (p.features || []).join(', ')
                        });
                        setModalOpen(true);
                      }}>Edit</Button>
                      <Button variant="ghost" onClick={async () => {
                        const nextActive = !p.isActive;
                        const { error } = await supabase.from('plans').update({ is_active: nextActive }).eq('id', p.id);
                        if (!error) {
                          setPlans((prev) => prev.map(x => x.id === p.id ? { ...x, isActive: nextActive } : x));
                          toast.success(nextActive ? 'Plan enabled' : 'Plan disabled');
                        } else {
                          toast.error('Failed to update status');
                        }
                      }}>{p.isActive ? 'Disable' : 'Enable'}</Button>
                      <Button variant="destructive" onClick={async () => {
                        if (!confirm('Delete this plan? This cannot be undone.')) return;
                        try {
                          setDeletingId(p.id);
                          const { error } = await supabase.from('plans').delete().eq('id', p.id);
                          if (error) throw error;
                          setPlans(prev => prev.filter(x => x.id !== p.id));
                          toast.success('Plan deleted');
                        } catch (e) {
                          console.error(e);
                          toast.error('Failed to delete plan');
                        } finally {
                          setDeletingId(null);
                        }
                      }} disabled={deletingId === p.id}>{deletingId === p.id ? 'Deleting…' : 'Delete'}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl px-4">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-slate-200">
                <CardTitle>{editing ? 'Edit Plan' : 'New Plan'}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Currency</label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Price Monthly</label>
                    <Input type="number" inputMode="decimal" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Price Yearly (optional)</label>
                    <Input type="number" inputMode="decimal" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Product Limit (blank = ∞)</label>
                    <Input type="number" value={form.productLimit} onChange={(e) => setForm({ ...form, productLimit: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Variant Limit (blank = ∞)</label>
                    <Input type="number" value={form.variantLimit} onChange={(e) => setForm({ ...form, variantLimit: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Storage (MB, blank = ∞)</label>
                    <Input type="number" value={form.storageMb} onChange={(e) => setForm({ ...form, storageMb: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Features (comma separated)</label>
                    <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
                  <Button onClick={async () => {
                    // basic validation
                    if (!form.name.trim()) { toast.error('Name is required'); return; }
                    if (!form.priceMonthly) { toast.error('Monthly price is required'); return; }
                    try {
                      setSaving(true);
                      const payload: any = {
                        name: form.name.trim(),
                        description: form.description.trim() || null,
                        currency: (form.currency || 'USD').toUpperCase(),
                        price_monthly: Number(form.priceMonthly),
                        price_yearly: form.priceYearly ? Number(form.priceYearly) : null,
                        product_limit: form.productLimit ? Number(form.productLimit) : null,
                        variant_limit: form.variantLimit ? Number(form.variantLimit) : null,
                        storage_mb: form.storageMb ? Number(form.storageMb) : null,
                        features: form.features
                          ? form.features.split(',').map(s => s.trim()).filter(Boolean)
                          : []
                      };
                      if (editing) {
                        const { error, data } = await supabase.from('plans').update(payload).eq('id', editing.id).select('*').single();
                        if (error) throw error;
                        toast.success('Plan updated');
                        setPlans(prev => prev.map(x => x.id === editing.id ? {
                          id: data.id,
                          name: data.name,
                          description: data.description ?? undefined,
                          priceMonthly: Number(data.price_monthly ?? 0),
                          priceYearly: data.price_yearly != null ? Number(data.price_yearly) : null,
                          currency: data.currency,
                          productLimit: data.product_limit,
                          variantLimit: data.variant_limit,
                          storageMb: data.storage_mb,
                          features: data.features ?? [],
                          isActive: !!data.is_active,
                          createdAt: new Date(data.created_at),
                          updatedAt: new Date(data.updated_at),
                        } : x));
                      } else {
                        const { error, data } = await supabase.from('plans').insert(payload).select('*').single();
                        if (error) throw error;
                        toast.success('Plan created');
                        setPlans(prev => [{
                          id: data.id,
                          name: data.name,
                          description: data.description ?? undefined,
                          priceMonthly: Number(data.price_monthly ?? 0),
                          priceYearly: data.price_yearly != null ? Number(data.price_yearly) : null,
                          currency: data.currency,
                          productLimit: data.product_limit,
                          variantLimit: data.variant_limit,
                          storageMb: data.storage_mb,
                          features: data.features ?? [],
                          isActive: !!data.is_active,
                          createdAt: new Date(data.created_at),
                          updatedAt: new Date(data.updated_at),
                        }, ...prev]);
                      }
                      setModalOpen(false);
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to save plan');
                    } finally {
                      setSaving(false);
                    }
                  }} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save changes' : 'Create plan')}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPlansPage;
