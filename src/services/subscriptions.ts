import { supabase } from './supabase';

export type Subscription = {
  id: string;
  store_id: string;
  plan_id: string;
  period: 'monthly' | 'yearly';
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  plans?: { name?: string } | { name?: string }[] | null;
};

export async function getActiveSubscription(storeId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plans(name)')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Subscription) ?? null;
}

export async function cancelSubscriptionById(subscriptionId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('subscriptions')
    .update({ is_active: false, ends_at: nowIso })
    .eq('id', subscriptionId);
  if (error) throw error;
}
