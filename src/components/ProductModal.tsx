import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useStore } from '../contexts/StoreProvider';
import { Product } from '../types';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { getStorePlan, enforceLimit } from '../services/limits';
import { useNavigate } from 'react-router-dom';

interface ProductModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const { categories, addProduct, updateProduct, isLoading, currentStore } = useStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '' as string,
    images: [''],
    isAvailable: true
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        categoryId: product.categoryId || categories[0]?.id || '',
        images: product.images,
        isAvailable: product.isAvailable
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        categoryId: categories[0]?.id || '',
        images: [''],
        isAvailable: true
      });
    }
  }, [product, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id) {
      toast.error('No store selected');
      return;
    }
    if (!categories.length) {
      toast.error('Create a category first');
      return;
    }
    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      categoryId: formData.categoryId || null,
      images: formData.images.filter(img => img.trim() !== ''),
      isAvailable: formData.isAvailable,
      storeId: currentStore.id
    };

    // Enforce plan limits only on create
    if (!product) {
      try {
        const info = await getStorePlan(currentStore.id);
        const storeProductCount = (await (async () => {
          // Count products for this store via context
          // Fallback to DB count if not available in context
          try {
            // @ts-ignore access useStore outside? we have products in context
            // safer: query DB count to be accurate
            const { count, error } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', currentStore.id);
            if (error) throw error;
            return count ?? 0;
          } catch {
            return 0;
          }
        })());
        const check = enforceLimit(storeProductCount, info.product_limit);
        if (!check.allowed) {
          toast.error(`Product limit reached. Please upgrade your plan to add more products.`);
          // Offer quick navigation
          setTimeout(() => navigate('/dashboard/upgrade'), 500);
          return;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Plan check failed', err);
      }
    }

    let success;
    if (product) {
      success = await updateProduct(product.id, productData);
    } else {
      success = await addProduct(productData);
    }

    if (success) {
      toast.success(`Product ${product ? 'updated' : 'added'} successfully`);
      onClose();
    } else {
      toast.error(`Failed to ${product ? 'update' : 'add'} product`);
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  // Upload a single image file to Supabase Storage and return its public URL
  const handleFileUpload = async (file: File) => {
    if (!currentStore?.id) {
      toast.error('No store selected');
      return null;
    }
    // Basic size guard: 5MB per file; can be tightened based on plan.storage_mb later
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('Image too large. Max 5MB');
      return null;
    }

    // Enforce storage_mb if available: estimate current usage by listing folder files
    try {
      const info = await getStorePlan(currentStore.id);
      if (info.storage_mb != null) {
        let used = 0;
        // list up to first 100 files; for more comprehensive accounting, paginate
        const { data: files, error: listErr } = await supabase.storage
          .from('product-images')
          .list(currentStore.id, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        if (!listErr && Array.isArray(files)) {
          used = files.reduce((sum: number, f: any) => sum + (typeof f?.size === 'number' ? f.size : 0), 0);
        }
        const quota = info.storage_mb * 1024 * 1024;
        const remaining = Math.max(0, quota - used);
        if (file.size > remaining) {
          toast.error('Storage limit reached. Please upgrade your plan.');
          setTimeout(() => navigate('/dashboard/upgrade'), 500);
          return null;
        }
      }
    } catch (e) {
      // ignore storage estimation errors, proceed with upload
    }
    const ext = file.name.split('.').pop();
    const path = `${currentStore.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {product ? 'Edit product' : 'Add product'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Product name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Price *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Category *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Product description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter product description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">
              Images
            </label>
            {formData.images.map((image, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={image}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  placeholder="Enter image URL"
                  className="flex-1"
                />
                {formData.images.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImageField(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={addImageField}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Another Image URL
              </Button>
              <label className="inline-flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer text-sm bg-gray-50 hover:bg-gray-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await handleFileUpload(file);
                    if (url) {
                      setFormData(prev => ({ ...prev, images: [...prev.images.filter(i => i), url] }));
                      toast.success('Image uploaded');
                    }
                    e.currentTarget.value = '';
                  }}
                />
                Upload Image
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={formData.isAvailable}
              onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700">
              Available
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : (product ? 'Save' : 'Add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}