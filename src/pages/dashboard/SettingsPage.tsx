import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import FeatureGate from '../../components/FeatureGate';
import UpgradePrompt from '../../components/UpgradePrompt';
import { FEATURES } from '../../constants/features';
import { useAuth } from '../../hooks/useAuth';

export function SettingsPage() {
  const { updatePassword, logout, isLoading } = useAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePassword = async () => {
    if (!pwd || pwd !== pwd2) return;
    setSaving(true);
    try {
      await updatePassword(pwd);
      setPwd('');
      setPwd2('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FeatureGate feature={FEATURES.advancedSettings} fallback={<UpgradePrompt title="Upgrade to access settings" message="Advanced settings are not available on your current plan." /> }>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-lg font-semibold">Change Password</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="password" placeholder={'New password'} value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <Input type="password" placeholder={'Repeat password'} value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
          </div>
          <Button disabled={saving || !pwd || pwd !== pwd2} onClick={handlePassword} className='bg-teal-600 text-white hover:bg-teal-700'>
            {saving ? 'Saving...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Button variant="outline" onClick={logout} disabled={isLoading} className='bg-red-600 text-white hover:bg-red-700'>Logout</Button>
        </CardContent>
      </Card>
    </div>
    </FeatureGate>
  );
}

export default SettingsPage;
