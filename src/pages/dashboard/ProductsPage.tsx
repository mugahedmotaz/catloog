import { useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { useStore } from '../../contexts/StoreProvider';
import { usePlan } from '../../contexts/PlanProvider';
import UpgradePrompt from '../../components/UpgradePrompt';
import { formatPrice } from '../../lib/utils';
import { ProductModal } from '../../components/ProductModal';
import { CategoryModal } from '../../components/CategoryModal';
import toast from 'react-hot-toast';
import { Product } from '../../types';

export function ProductsPage() {
  const { currentStore, products, categories, deleteProduct, isLoading } = useStore();
  const { hasFeature, enforceLimit } = usePlan();
  const canProducts = hasFeature('products');
  const canCategories = hasFeature('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const storeCategories = useMemo(() =>
    categories.filter(c => c.storeId === currentStore?.id),
    [categories, currentStore?.id]
  );

  const storeProducts = useMemo(() => products.filter(p => p.storeId === currentStore?.id), [products, currentStore?.id]);
  const productLimit = enforceLimit(storeProducts.length, 'product_limit');
  const productTotalCap = productLimit.remaining !== null ? storeProducts.length + productLimit.remaining : null;
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return storeProducts
      .filter(product => {
        const matchesSearch = !term ||
          product.name.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term);
        const matchesCategory = !selectedCategoryId || product.categoryId === selectedCategoryId;
        return matchesSearch && matchesCategory;
      });
  }, [storeProducts, searchTerm, selectedCategoryId]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button className="w-full sm:w-auto" onClick={() => setCategoryModalOpen(true)} variant="outline" disabled={!canCategories}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Button className="w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-700" onClick={() => setModalOpen(true)} disabled={!canProducts || !productLimit.allowed}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Usage summary */}
        {canProducts && (
          <div className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Products used:</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                {productTotalCap !== null ? `${storeProducts.length} / ${productTotalCap}` : `${storeProducts.length}`}
              </span>
              {productLimit.remaining !== null && productLimit.remaining <= 2 && productLimit.remaining > 0 && (
                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{productLimit.remaining} left</span>
              )}
            </div>
            {productLimit.remaining !== null && !productLimit.allowed && (
              <a href="/dashboard/upgrade" className="text-teal-700 hover:underline">Upgrade to add more</a>
            )}
          </div>
        )}

        {/* Upgrade or limit banners */}
        {!canProducts && (
          <UpgradePrompt title="Upgrade to manage products" message="Products feature is not available on your current plan." />
        )}
        {canProducts && productLimit.remaining !== null && !productLimit.allowed && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900">
            You reached your product limit. Upgrade your plan to add more products.
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="card-body p-4 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={"Search products..."}
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
                <option value="">All Categories</option>
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
            <CardContent className="card-body py-12 text-center text-gray-500">Loading...</CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="card-body py-12 text-center">
              <p className="text-gray-500 mb-4">No products found</p>
              <Button onClick={() => setModalOpen(true)} className="bg-teal-600 hover:bg-teal-700" disabled={!canProducts || !productLimit.allowed}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
                      title={"Preview"}
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
                        Out of stock
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="card-body p-4 sm:p-5">
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
                      {product.isAvailable ? 'Available' : 'Out of stock'}
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