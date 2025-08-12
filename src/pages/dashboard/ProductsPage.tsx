import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { useStore } from '../../contexts/StoreProvider';
import { formatPrice } from '../../lib/utils';
import { ProductModal } from '../../components/ProductModal';
import { CategoryModal } from '../../components/CategoryModal';
import toast from 'react-hot-toast';
import { Product } from '../../types';

export function ProductsPage() {
  const { t } = useTranslation();
  const { currentStore, products, categories, deleteProduct, isLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const storeCategories = useMemo(() =>
    categories.filter(c => c.storeId === currentStore?.id),
    [categories, currentStore?.id]
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products
      .filter(p => p.storeId === currentStore?.id)
      .filter(product => {
        const matchesSearch = !term ||
          product.name.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term);
        const matchesCategory = !selectedCategoryId || product.categoryId === selectedCategoryId;
        return matchesSearch && matchesCategory;
      });
  }, [products, currentStore?.id, searchTerm, selectedCategoryId]);

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const success = await deleteProduct(productId);
      if (success) {
        toast.success('Product deleted successfully');
      } else {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handlePreview = (product: Product) => {
    if (!currentStore) return;
    const url = `/store/${currentStore.slug}/product/${product.id}`;
    window.open(url, '_blank');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('products.products')}</h1>
          <div className="flex gap-2">
            <Button onClick={() => setCategoryModalOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              {t('products.addCategory') || 'إضافة تصنيف'}
            </Button>
            <Button onClick={() => setModalOpen(true)} className="bg-teal-600 text-white hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              {t('products.addProduct')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="card-body">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('products.search') || 'Search products...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-3 h-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">{t('products.allCategories') || 'All Categories'}</option>
                {storeCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Loading / Empty / Grid */}
        {isLoading ? (
          <Card>
            <CardContent className="card-body py-12 text-center text-gray-500">{t('common.loading') || 'Loading...'}</CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="card-body py-12 text-center">
              <p className="text-gray-500 mb-4">{t('products.noProductsFound') || 'No products found'}</p>
              <Button onClick={() => setModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('products.addProduct')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid-gap">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      onClick={() => handlePreview(product)}
                      title={t('products.preview') || 'Preview'}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {!product.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded text-sm font-medium">
                        {t('products.outOfStock')}
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="card-body">
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {storeCategories.find(c => c.id === product.categoryId)?.name || ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-teal-600">
                      {formatPrice(product.price, currentStore?.settings.currency)}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      product.isAvailable 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {product.isAvailable ? t('products.available') : t('products.outOfStock')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ProductModal
          product={editingProduct}
          isOpen={modalOpen}
          onClose={handleCloseModal}
        />
      )}

      {categoryModalOpen && (
        <CategoryModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
        />
      )}
    </>
  );
}