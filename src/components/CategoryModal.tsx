import { useState } from 'react';
import { useStore } from '../contexts/StoreProvider';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import toast from 'react-hot-toast';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const { currentStore, addCategory, categories } = useStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState<number>(() => {
    const max = categories
      .filter(c => c.storeId === currentStore?.id)
      .reduce((acc, c) => Math.max(acc, c.order), 0);
    return max + 1;
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentStore) {
      toast.error('لا يوجد متجر محدد');
      return;
    }
    if (!name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    setSaving(true);
    const ok = await addCategory({
      name: name.trim(),
      description: description.trim() || undefined,
      order: Number.isFinite(order) ? order : 0,
      storeId: currentStore.id,
      createdAt: new Date(), // will be ignored by backend mapping
      updatedAt: new Date(), // will be ignored by backend mapping
      id: '' as any, // placeholder, not used on insert
    } as any);
    setSaving(false);
    if (ok) {
      toast.success('تمت إضافة التصنيف');
      setName('');
      setDescription('');
      setOrder(prev => prev + 1);
      onClose();
    } else {
      toast.error('فشلت إضافة التصنيف');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>إضافة تصنيف</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">الاسم</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: البرجر" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف (اختياري)</label>
              <textarea
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="وصف مختصر للتصنيف"
                className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الترتيب</label>
              <Input type="number" value={order} onChange={e => setOrder(parseInt(e.target.value || '0', 10))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving}>
                {saving ? 'جارٍ الحفظ...' : 'حفظ التصنيف'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
