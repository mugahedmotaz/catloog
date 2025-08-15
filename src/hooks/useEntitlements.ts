import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { useStore } from '../contexts/StoreProvider';

export type Entitlement = {
  key: string; // e.g., 'stores.maxCount', 'themes.customization'
  value: any;  // number | boolean | string
};

export type EntitlementsMap = Record<string, any>;

// Simple default plans fallback (can be replaced by DB tables: plans, features, plan_features, subscriptions)
const DEFAULT_PLAN_ENTITLEMENTS: Record<string, EntitlementsMap> = {
  free: {
    'stores.maxCount': 1,
    'products.maxCount': 50,
    'themes.advanced': false,
    'themes.customization': false,
    'reports.advanced': false,
    'channels.social': false,
    'team.members': 1,
  },
  pro: {
    'stores.maxCount': 3,
    'products.maxCount': 10000,
    'themes.advanced': true,
    'themes.customization': true,
    'reports.advanced': true,
    'channels.social': true,
    'team.members': 5,
  },
  business: {
    'stores.maxCount': 10,
    'products.maxCount': 100000,
    'themes.advanced': true,
    'themes.customization': true,
    'reports.advanced': true,
    'channels.social': true,
    'team.members': 25,
    'audit.logs': true,
  },
};

function mergeEntitlements(planKey?: string | null): EntitlementsMap {
  const plan = (planKey || 'free').toLowerCase();
  return DEFAULT_PLAN_ENTITLEMENTS[plan] || DEFAULT_PLAN_ENTITLEMENTS.free;
}

export function useEntitlements() {
  const { currentStore } = useStore();
  const [entitlements, setEntitlements] = useState<EntitlementsMap>({});
  const [loading, setLoading] = useState(false);
  const planKey = useMemo(() => {
    // Try to read from store.settings.plan; fallback to 'free'
    const plan = (currentStore as any)?.settings?.plan || (currentStore as any)?.plan || 'free';
    return typeof plan === 'string' ? plan : 'free';
  }, [currentStore]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // If you later add DB tables/views for entitlements, query them here.
        // For now, fallback to local defaults based on planKey.
        const merged = mergeEntitlements(planKey);
        if (!mounted) return;
        setEntitlements(merged);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [planKey]);

  const has = (featureKey: string) => {
    const v = entitlements[featureKey];
    if (typeof v === 'boolean') return v;
    return Boolean(v);
  };

  const get = (featureKey: string, defaultValue?: any) => {
    return featureKey in entitlements ? entitlements[featureKey] : defaultValue;
  };

  return { entitlements, has, get, loading, planKey };
}
