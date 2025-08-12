import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../hooks/useAuth';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { updatePassword, logout, isLoading } = useAuth();
  const [lang, setLang] = useState(i18n.language === 'ar' ? 'ar' : 'en');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLangSave = async () => {
    await i18n.changeLanguage(lang);
  };

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title') || 'Settings'}</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-lg font-semibold">{t('settings.language') || 'Interface Language'}</div>
          <div className="flex items-center gap-3">
            <select className="border rounded px-3 py-2" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
            <Button onClick={handleLangSave}>{t('common.save') || 'Save'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-lg font-semibold">{t('settings.password') || 'Change Password'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="password" placeholder={t('settings.newPassword') || 'New password'} value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <Input type="password" placeholder={t('settings.repeatPassword') || 'Repeat password'} value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
          </div>
          <Button disabled={saving || !pwd || pwd !== pwd2} onClick={handlePassword}>
            {saving ? (t('common.saving') || 'Saving...') : (t('settings.updatePassword') || 'Update Password')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Button variant="outline" onClick={logout} disabled={isLoading}>{t('settings.logout') || 'Logout'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
