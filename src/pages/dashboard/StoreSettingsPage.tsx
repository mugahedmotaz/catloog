import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { useStore } from '../../contexts/StoreProvider';
import { generateStoreSlug } from '../../lib/utils';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function StoreSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentStore, createStore, updateStore, deleteStore, softDeleteStore, restoreStore, products, orders, isLoading } = useStore();
  const [formData, setFormData] = useState({
    name: currentStore?.name || '',
    description: currentStore?.description || '',
    whatsappNumber: currentStore?.whatsappNumber || '',
    logo: currentStore?.logo || '',
    currency: currentStore?.settings.currency || 'USD',
    language: currentStore?.settings.language || 'en',
    allowDelivery: currentStore?.settings.allowDelivery || false,
    deliveryFee: currentStore?.settings.deliveryFee.toString() || '0',
    minimumOrder: currentStore?.settings.minimumOrder.toString() || '0',
    orderMessageTemplate: currentStore?.settings.orderMessageTemplate || ''
  });
  const [errors, setErrors] = useState<{ name?: string; whatsappNumber?: string; currency?: string; language?: string; deliveryFee?: string; minimumOrder?: string }>({});

  const previewSlug = useMemo(() => formData.name ? generateStoreSlug(formData.name) : (currentStore?.slug || ''), [formData.name, currentStore?.slug]);
  const storeUrl = previewSlug ? `${window.location.origin}/store/${previewSlug}` : '';

  const computeErrors = () => {
    const next: typeof errors = {};
    if (!formData.name.trim()) next.name = 'Store name is required';
    if (!formData.whatsappNumber.trim()) next.whatsappNumber = 'WhatsApp number is required';
    if (!formData.currency) next.currency = 'Currency is required';
    if (!formData.language) next.language = 'Language is required';
    if (formData.allowDelivery) {
      const fee = Number(formData.deliveryFee);
      if (Number.isNaN(fee) || fee < 0) next.deliveryFee = 'Delivery fee must be a valid number';
    }
    const min = Number(formData.minimumOrder);
    if (Number.isNaN(min) || min < 0) next.minimumOrder = 'Minimum order must be a valid number';
    return next;
  };

  useEffect(() => {
    setErrors(computeErrors());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const isValid = Object.keys(errors).length === 0;

  // Danger Zone state
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Sync form with currentStore when it loads/changes
  useEffect(() => {
    if (!currentStore) return;
    setFormData({
      name: currentStore.name || '',
      description: currentStore.description || '',
      whatsappNumber: currentStore.whatsappNumber || '',
      logo: currentStore.logo || '',
      currency: currentStore.settings.currency || 'USD',
      language: currentStore.settings.language || 'en',
      allowDelivery: currentStore.settings.allowDelivery || false,
      deliveryFee: (currentStore.settings.deliveryFee ?? 0).toString(),
      minimumOrder: (currentStore.settings.minimumOrder ?? 0).toString(),
      orderMessageTemplate: currentStore.settings.orderMessageTemplate || ''
    });
  }, [currentStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eMap = computeErrors();
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) {
      toast.error('Please fix the required fields');
      return;
    }

    const payload = {
      name: formData.name,
      slug: previewSlug,
      description: formData.description,
      whatsappNumber: formData.whatsappNumber,
      logo: formData.logo,
      settings: {
        currency: formData.currency,
        language: formData.language as 'en' | 'ar',
        allowDelivery: formData.allowDelivery,
        deliveryFee: parseFloat(formData.deliveryFee) || 0,
        minimumOrder: parseFloat(formData.minimumOrder) || 0,
        orderMessageTemplate: formData.orderMessageTemplate
      }
    };

    if (!currentStore) {
      // Create new store
      const success = await createStore({
        ...payload,
        theme: {
          primaryColor: '#0d9488',
          secondaryColor: '#065f46',
          accentColor: '#14b8a6',
          backgroundColor: '#ffffff',
          textColor: '#111827',
          fontFamily: 'Inter, ui-sans-serif, system-ui'
        },
        isActive: true,
      });
      if (success) {
        toast.success('Store created successfully');
        if (searchParams.get('modal') === '1') navigate('/dashboard');
      } else {
        toast.error('Failed to create store');
      }
      return;
    }

    // Update existing store
    const success = await updateStore(currentStore.id, payload);
    if (success) {
      toast.success('Store settings updated successfully');
    } else {
      toast.error('Failed to update store settings');
    }
  };

  const copyStoreUrl = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    toast.success('Store URL copied to clipboard');
  };

  const exportCsv = (filename: string, header: string[], rows: (string | number | null | undefined)[][]) => {
    const escape = (v: any) => {
      const s = v === null || typeof v === 'undefined' ? '' : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = [header.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportProducts = () => {
    if (!currentStore) return;
    const list = (products || []).filter(p => p.storeId === currentStore.id);
    const header = ['id','name','description','price','isAvailable','categoryId','images'];
    const rows = list.map(p => [p.id, p.name, p.description || '', p.price, p.isAvailable, p.categoryId || '', JSON.stringify(p.images || [])]);
    exportCsv(`store_${currentStore.slug || currentStore.id}_products.csv`, header, rows);
  };

  const handleExportOrders = () => {
    if (!currentStore) return;
    const list = (orders || []).filter(o => o.storeId === currentStore.id);
    const header = ['id','orderNumber','total','status','customerName','customerPhone','notes','items'];
    const rows = list.map(o => [o.id, o.orderNumber, o.total, o.status, o.customerName, o.customerPhone, o.notes || '', JSON.stringify(o.items || [])]);
    exportCsv(`store_${currentStore.slug || currentStore.id}_orders.csv`, header, rows);
  };

  const content = (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Store</h1>
        <p className="text-gray-600 mt-1">Manage your store information and settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Store Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter store name"
                  required
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">WhatsApp Number *</label>
                <Input
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                  placeholder="+1234567890"
                  required
                />
                {errors.whatsappNumber && <p className="text-xs text-red-600">{errors.whatsappNumber}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Store Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your store"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Logo</label>
              <Input
                value={formData.logo}
                onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                placeholder="Logo URL"
              />
            </div>

            {/* Store URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Store URL *</label>
              <div className="flex items-center space-x-2">
                <Input value={storeUrl || '—'} readOnly className="bg-gray-50" />
                <Button type="button" variant="outline" onClick={copyStoreUrl} disabled={!storeUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" onClick={() => storeUrl && window.open(storeUrl, '_blank')} disabled={!storeUrl}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Status (Soft Delete / Restore) and Data Export */}
        {currentStore && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Store Status</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">
                  Status: {currentStore.isActive ? <span className="text-green-600 font-medium">Active</span> : <span className="text-amber-600 font-medium">Inactive</span>}
                </div>
                <div className="flex gap-2">
                  {currentStore.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      disabled={isLoading}
                      onClick={async () => {
                        const ok = await softDeleteStore(currentStore.id);
                        if (ok) toast.success('Store deactivated');
                      }}
                    >
                      Deactivate Store
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      disabled={isLoading}
                      onClick={async () => {
                        const ok = await restoreStore(currentStore.id);
                        if (ok) toast.success('Store reactivated');
                      }}
                    >
                      Reactivate Store
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Export</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={handleExportProducts}>
                  Export Products CSV
                </Button>
                <Button type="button" variant="outline" onClick={handleExportOrders}>
                  Export Orders CSV
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Store Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Default Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as 'en' | 'ar' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowDelivery"
                checked={formData.allowDelivery}
                onChange={(e) => setFormData(prev => ({ ...prev, allowDelivery: e.target.checked }))}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="allowDelivery" className="text-sm font-medium text-gray-700">
                Allow Delivery
              </label>
            </div>

            {formData.allowDelivery && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Delivery Fee
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deliveryFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryFee: e.target.value }))}
                    placeholder="0.00"
                  />
                  {errors.deliveryFee && <p className="text-xs text-red-600">{errors.deliveryFee}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Minimum Order Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimumOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumOrder: e.target.value }))}
                    placeholder="0.00"
                  />
                  {errors.minimumOrder && <p className="text-xs text-red-600">{errors.minimumOrder}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-teal-600 text-white hover:bg-teal-700" disabled={!isValid || isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* WhatsApp Message Template */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Message Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Order Message Template
              </label>
              <textarea
                value={formData.orderMessageTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, orderMessageTemplate: e.target.value }))}
                placeholder="Hello! I would like to place an order..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <p className="text-xs text-gray-500">
                Use placeholders: {'{orderDetails}'}, {'{total}'}, {'{customerName}'}, {'{customerPhone}'}, {'{notes}'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {currentStore && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                Permanently delete this store and all of its data (products, categories, orders). This action cannot be undone.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Type the store name to confirm
                </label>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={currentStore.name}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={deleting || isLoading || confirmName.trim() !== (currentStore.name || '').trim()}
                    onClick={async () => {
                      if (!currentStore?.id) return;
                      if (confirmName.trim() !== (currentStore.name || '').trim()) {
                        toast.error('Please type the exact store name to confirm');
                        return;
                      }
                      setDeleting(true);
                      const ok = await deleteStore(currentStore.id);
                      setDeleting(false);
                      if (ok) {
                        setConfirmName('');
                        navigate('/dashboard');
                      }
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete Store Permanently'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );

  const showAsModal = searchParams.get('modal') === '1';
  if (showAsModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="relative w-full max-w-2xl">
          <div className="absolute -top-10 right-0">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Close</Button>
          </div>
          <div className="bg-white rounded-xl shadow-xl p-6 max-h-[85vh] overflow-y-auto">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}