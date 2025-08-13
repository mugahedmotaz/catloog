import { useMemo, useState } from 'react';
import { useStore } from '../../contexts/StoreProvider';
import { Button } from '../../components/ui/button';
import { usePlan } from '../../contexts/PlanProvider';
import UpgradePrompt from '../../components/UpgradePrompt';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import toast from 'react-hot-toast';
import { CategoryModal } from '../../components/CategoryModal';
import type { Category } from '../../types';

export default function CategoriesPage() {
  const { currentStore, categories, updateCategory, deleteCategory } = useStore();
  const { hasFeature } = usePlan();
  const canManage = hasFeature('categories');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; order: number }>({
    name: '',
    description: '',
    order: 0,
  });

  const myCategories = useMemo(() => {
    return (categories || [])
      .filter((c: Category) => (currentStore ? c.storeId === currentStore.id : false))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [categories, currentStore]);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || '', order: cat.order });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', description: '', order: 0 });
  };

  const saveEdit = async (id: string) => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const ok = await updateCategory(id, {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      order: Number.isFinite(form.order) ? form.order : 0,
    });
    if (ok) {
      toast.success('Category updated');
      cancelEdit();
    } else {
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Delete this category? This action cannot be undone.');
    if (!confirm) return;
    const ok = await deleteCategory(id);
    if (ok) toast.success('Category deleted');
    else toast.error('Failed to delete category');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Button onClick={() => setIsAddOpen(true)} className='bg-teal-600 text-white hover:bg-teal-700' disabled={!canManage}>Add Category</Button>
      </div>

      {!canManage && (
        <UpgradePrompt title="Upgrade to manage categories" message="Category management is not available on your current plan." />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {(!currentStore) ? (
            <p className="text-sm text-slate-600">Select or create a store first.</p>
          ) : myCategories.length === 0 ? (
            <p className="text-sm text-slate-600">No categories yet. Click "Add Category" to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-3 font-medium">Name</th>
                    <th className="text-left py-3 px-3 font-medium">Description</th>
                    <th className="text-left py-3 px-3 font-medium w-28">Order</th>
                    <th className="text-right py-3 pl-3 font-medium w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myCategories.map((cat) => (
                    <tr key={cat.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 align-middle">
                        {editingId === cat.id ? (
                          <Input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        ) : (
                          <span className="font-medium">{cat.name}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {editingId === cat.id ? (
                          <Input
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          />
                        ) : (
                          <span className="text-slate-700">{cat.description || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-middle w-28">
                        {editingId === cat.id ? (
                          <Input
                            type="number"
                            value={String(form.order)}
                            onChange={(e) => {
                              const v = parseInt(e.target.value || '0', 10);
                              setForm((f) => ({ ...f, order: Number.isFinite(v) ? v : 0 }));
                            }}
                          />
                        ) : (
                          <span>{cat.order}</span>
                        )}
                      </td>
                      <td className="py-2 pl-3 align-middle">
                        <div className="flex justify-end gap-2">
                          {editingId === cat.id ? (
                            <>
                              <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>
                              <Button onClick={() => saveEdit(cat.id)} disabled={!canManage}>Save</Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" onClick={() => startEdit(cat)} className='bg-teal-600 text-white hover:bg-teal-700' disabled={!canManage}>Edit</Button>
                              <Button variant="destructive" onClick={() => handleDelete(cat.id)} className='bg-red-600 text-white hover:bg-red-700' disabled={!canManage}>Delete</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}
