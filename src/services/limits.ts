import { supabase } from './supabase';

export interface PlanLimits {
  product_limit: number | null;
  variant_limit: number | null;
  storage_mb: number | null;
  features: string[];
}

export interface StorePlanInfo extends PlanLimits {
  plan_id: string | null;
  plan_name: string | null;
  period: 'monthly' | 'yearly' | null;
}

export async function getStorePlan(storeId: string): Promise<StorePlanInfo> {
  // Get latest subscription for store by starts_at desc
  const { data: subs, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, plan_id, period, starts_at')
    .eq('store_id', storeId)
    .order('starts_at', { ascending: false })
    .limit(1);
  if (subErr) throw subErr;
  const sub = subs?.[0];
  if (!sub) return { plan_id: null, plan_name: null, period: null, product_limit: null, variant_limit: null, storage_mb: null, features: [] };

  const { data: plan, error: pErr } = await supabase
    .from('plans')
    .select('id, name, product_limit, variant_limit, storage_mb, features')
    .eq('id', sub.plan_id)
    .single();
  if (pErr) throw pErr;

  return {
    plan_id: plan.id,
    plan_name: plan.name,
    period: sub.period,
    product_limit: plan.product_limit ?? null,
    variant_limit: plan.variant_limit ?? null,
    storage_mb: plan.storage_mb ?? null,
    features: Array.isArray(plan.features) ? plan.features : [],
  };
}

export function hasFeature(info: StorePlanInfo, feature: string): boolean {
  return info.features.includes(feature);
}

export function enforceLimit(currentCount: number, limit: number | null): { allowed: boolean; remaining: number | null } {
  // null or -1 means unlimited
  if (limit == null || limit === -1) return { allowed: true, remaining: null };
  const remaining = Math.max(0, limit - currentCount);
  return { allowed: remaining > 0, remaining };
}
