import { useEffect, useState } from 'react';
import { supabaseAdmin } from '../services/supabaseAdmin';
import { useAdminAuth } from '../contexts/AdminAuthProvider';

export function useAdminIsAdmin() {
  const { user } = useAdminAuth();
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
        const { data, error } = await supabaseAdmin
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
