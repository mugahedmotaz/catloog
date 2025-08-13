import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        if (!user?.id) {
          if (active) { setIsAdmin(false); setLoading(false); }
          return;
        }
        const { data, error } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        setIsAdmin(!!data);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to check admin');
        setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [user?.id]);

  return { isAdmin, loading, error };
}
