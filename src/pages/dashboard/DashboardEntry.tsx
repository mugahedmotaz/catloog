import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { DashboardOverview } from './DashboardOverview';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export function DashboardEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [didRedirect, setDidRedirect] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkStore() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id')
          .eq('merchant_id', user.id)
          .limit(1);
        if (error) throw error;
        const _hasStore = Array.isArray(data) && data.length > 0;
        if (mounted) setHasStore(_hasStore);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Store check failed:', e);
        if (mounted) setHasStore(false);
      } finally {
        if (mounted) setChecking(false);
      }
    }
    checkStore();
    return () => { mounted = false; };
  }, [user, navigate]);

  // Show Customize page only once per user (synced via Supabase)
  useEffect(() => {
    let cancelled = false;
    async function maybeRedirectToCustomize() {
      if (!user || !hasStore || didRedirect) return;
      try {
        // Read onboarding flag
        const { data, error } = await supabase
          .from('user_onboarding')
          .select('customize_shown')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;

        const alreadyShown = data?.customize_shown === true;
        if (!alreadyShown && !cancelled) {
          // Upsert flag to mark as shown
          const upsertRes = await supabase
            .from('user_onboarding')
            .upsert({
              user_id: user.id,
              customize_shown: true,
              customize_shown_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select('user_id')
            .single();
          if (upsertRes.error) throw upsertRes.error;
          if (!cancelled) {
            setDidRedirect(true);
            navigate('/dashboard/customize', { replace: true });
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('onboarding flag error:', e);
      }
    }
    maybeRedirectToCustomize();
    return () => { cancelled = true; };
  }, [user, hasStore, didRedirect, navigate]);

  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600">Loading...</div>
    );
  }

  // If the user has no store, show getting started card
  if (!hasStore) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Get started with your store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">Before viewing the dashboard, set up your store basics.</p>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/dashboard/store?modal=1')}>
                Open store setup modal
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard/store')}>
                Open settings page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If the user has a store, show overview
  return <DashboardOverview />;
}
