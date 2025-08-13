import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from './StoreProvider';
import { getStorePlan, hasFeature as _hasFeature, enforceLimit as _enforceLimit, type StorePlanInfo } from '../services/limits';
import { supabase } from '../services/supabase';

interface PlanContextValue {
  loading: boolean;
  info: StorePlanInfo | null;
  refresh: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  enforceLimit: (currentCount: number, limitKey: keyof StorePlanInfo) => { allowed: boolean; remaining: number | null };
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { currentStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<StorePlanInfo | null>(null);

  const load = async () => {
    if (!currentStore?.id) { setInfo(null); return; }
    setLoading(true);
    try {
      const data = await getStorePlan(currentStore.id);
      setInfo(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [currentStore?.id]);

  // Realtime: refresh plan when subscriptions change for this store
  useEffect(() => {
    if (!currentStore?.id) return;
    const channel = supabase
      .channel(`store-subscriptions-${currentStore.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `store_id=eq.${currentStore.id}`,
      }, () => { void load(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [currentStore?.id]);

  const value = useMemo<PlanContextValue>(() => ({
    loading,
    info,
    refresh: load,
    hasFeature: (feature: string) => (info ? _hasFeature(info, feature) : false),
    enforceLimit: (currentCount: number, limitKey: keyof StorePlanInfo) => {
      const limit = (info && typeof info[limitKey] === 'number') ? (info[limitKey] as unknown as number | null) : null;
      return _enforceLimit(currentCount, limit);
    },
  }), [loading, info]);

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
