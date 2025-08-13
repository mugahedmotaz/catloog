import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../contexts/StoreProvider';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import toast from 'react-hot-toast';
import FeatureGate from '../../components/FeatureGate';
import UpgradePrompt from '../../components/UpgradePrompt';

interface ThemeDraft {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

const FONT_OPTIONS = [
  'Inter, ui-sans-serif, system-ui',
  'Cairo, ui-sans-serif, system-ui',
  'Tajawal, ui-sans-serif, system-ui',
  'Noto Sans Arabic, ui-sans-serif, system-ui',
  'Roboto, ui-sans-serif, system-ui',
];

export function CustomizePage() {
  const { currentStore, updateStore, isLoading } = useStore();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ThemeDraft | null>(null);

  // Initialize from store theme
  useEffect(() => {
    if (!currentStore) return;
    const th = currentStore.theme || {
      primaryColor: '#0d9488',
      secondaryColor: '#065f46',
      accentColor: '#14b8a6',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      fontFamily: 'Inter, ui-sans-serif, system-ui',
    };
    setDraft({ ...th });
  }, [currentStore?.id]);

  const previewStyle = useMemo(() => ({
    '--c-primary': draft?.primaryColor || '#0d9488',
    '--c-secondary': draft?.secondaryColor || '#065f46',
    '--c-accent': draft?.accentColor || '#14b8a6',
    '--c-bg': draft?.backgroundColor || '#ffffff',
    '--c-text': draft?.textColor || '#111827',
    fontFamily: draft?.fontFamily,
  }) as React.CSSProperties, [draft]);

  const handleChange = (key: keyof ThemeDraft, value: string) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  const handleSave = async () => {
    if (!currentStore || !draft) return;
    setSaving(true);
    try {
      const ok = await updateStore(currentStore.id, { theme: draft });
      if (ok) toast.success('Saved');
    } finally {
      setSaving(false);
    }
  };

  if (!currentStore) {
    return <div className="p-6 text-gray-500">Create a store first to customize theme.</div>;
  }

  return (
    <FeatureGate
      feature="theme_customization"
      fallback={
        <UpgradePrompt
          title="Upgrade to customize theme"
          message="Theme customization is not available on your current plan. Upgrade to unlock branding controls."
        />
      }
    >
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customize Theme</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Primary</label>
                <Input type="color" value={draft?.primaryColor || ''} onChange={e => handleChange('primaryColor', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Secondary</label>
                <Input type="color" value={draft?.secondaryColor || ''} onChange={e => handleChange('secondaryColor', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Accent</label>
                <Input type="color" value={draft?.accentColor || ''} onChange={e => handleChange('accentColor', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Background</label>
                <Input type="color" value={draft?.backgroundColor || ''} onChange={e => handleChange('backgroundColor', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Text</label>
                <Input type="color" value={draft?.textColor || ''} onChange={e => handleChange('textColor', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Font</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={draft?.fontFamily || ''}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                >
                  {FONT_OPTIONS.map(f => (
                    <option key={f} value={f}>{f.split(',')[0]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="pt-2 ">
              <Button disabled={saving || isLoading} onClick={handleSave} className='bg-teal-600 text-white hover:bg-teal-700'>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div style={previewStyle} className="rounded-lg border" dir="ltr">
              <div className="p-4" style={{ backgroundColor: draft?.backgroundColor, color: draft?.textColor }}>
                <div className="text-xl font-bold mb-3">{currentStore.name}</div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded" style={{ backgroundColor: draft?.primaryColor, color: '#fff' }}>Primary</span>
                  <span className="px-3 py-1 rounded" style={{ backgroundColor: draft?.secondaryColor, color: '#fff' }}>Secondary</span>
                  <span className="px-3 py-1 rounded" style={{ backgroundColor: draft?.accentColor, color: '#fff' }}>Accent</span>
                </div>
                <p className="text-sm mb-2">This is a live preview of your storefront theme.</p>
                <Button style={{ backgroundColor: draft?.primaryColor, borderColor: draft?.primaryColor }}>
                  Sample Button
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </FeatureGate>
  );
}

export default CustomizePage;
