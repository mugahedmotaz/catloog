import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Eye, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { useStore } from '../../contexts/StoreProvider';
import { useCart } from '../../contexts/CartProvider';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { Store, Product, Category } from '../../types';
import { supabase } from '../../services/supabase';

export function StorefrontHome() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { getStoreBySlug } = useStore();
  const { addToCart } = useCart();
  const [store, setStore] = useState<Store | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [cats, setCats] = useState<Category[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const tr = (ar: string, en: string) => (i18n.language === 'ar' ? ar : en);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const s = await getStoreBySlug(slug);
        if (!mounted) return;
        setStore(s ?? null);
        if (s?.id) {
          const [catsRes, prodsRes] = await Promise.all([
            supabase.from('categories').select('*').eq('store_id', s.id),
            supabase.from('products').select('*').eq('store_id', s.id).eq('is_available', true),
          ]);
          if (catsRes.error) throw catsRes.error;
          if (prodsRes.error) throw prodsRes.error;
          const mappedCats: Category[] = (catsRes.data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? undefined,
            storeId: row.store_id,
            order: row.order,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
          }));
          const mappedProds: Product[] = (prodsRes.data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            price: Number(row.price),
            images: row.images ?? [],
            categoryId: row.category_id ?? null,
            isAvailable: row.is_available,
            storeId: row.store_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
          }));
          if (!mounted) return;
          setCats(mappedCats);
          setProds(mappedProds);
        } else {
          setCats([]);
          setProds([]);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading storefront data:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [slug, getStoreBySlug]);

  // Debounce search input for better UX
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    return prods
      .filter(p => (store ? p.storeId === store.id : false))
      .filter(product => {
        const q = debouncedSearch.trim().toLowerCase();
        const matchesSearch = !q || product.name.toLowerCase().includes(q);
        const matchesCategory = !selectedCategoryId || product.categoryId === selectedCategoryId;
        const isAvail = product.isAvailable;
        return matchesSearch && matchesCategory && isAvail;
      });
  }, [prods, store, debouncedSearch, selectedCategoryId]);

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    if (sortBy === 'price-asc') arr.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') arr.sort((a, b) => b.price - a.price);
    else {
      // newest by createdAt desc
      arr.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return arr;
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage]);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast.success(tr('تمت إضافة المنتج إلى السلة', `${product.name} added to cart`));
  };

  if (!store || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{tr('جارٍ التحميل...', 'Loading...')}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{ background: `radial-gradient(60rem 60rem at 120% -10%, ${store.theme.primaryColor}20, transparent)` }}
        />
        <div className="py-12 md:py-16 bg-gradient-to-r from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                {tr('مرحباً بك في', 'Welcome to')} {store.name}
              </h1>
              {store.description && (
                <p className="mt-3 text-slate-600 text-lg max-w-2xl mx-auto">
                  {store.description}
                </p>
              )}
            </div>
            {/* Category pills */}
            {cats.length > 0 && (
              <div className="mt-6 overflow-x-auto no-scrollbar">
                <div className="inline-flex gap-2 min-w-full md:min-w-0">
                  <button
                    className={`h-9 px-3 rounded-full border text-sm transition ${selectedCategoryId === '' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
                    onClick={() => { setSelectedCategoryId(''); setPage(1); }}
                  >
                    {t('storefront.allProducts')}
                  </button>
                  {cats
                    .filter((c: Category) => (store ? c.storeId === store.id : false))
                    .map((c) => (
                      <button
                        key={c.id}
                        className={`h-9 px-3 rounded-full border text-sm transition ${selectedCategoryId === c.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
                        onClick={() => { setSelectedCategoryId(c.id); setPage(1); }}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filters / Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={tr('ابحث عن المنتجات...', 'Search products...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <select
            value={selectedCategoryId}
            onChange={(e) => { setSelectedCategoryId(e.target.value); setPage(1); }}
            className="h-11 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{t('storefront.allProducts')}</option>
            {cats
              .filter((c: Category) => (store ? c.storeId === store.id : false))
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
            className="h-11 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Sort products"
          >
            <option value="newest">{tr('الأحدث', 'Newest')}</option>
            <option value="price-asc">{tr('السعر: من الأقل إلى الأعلى', 'Price: Low to High')}</option>
            <option value="price-desc">{tr('السعر: من الأعلى إلى الأقل', 'Price: High to Low')}</option>
          </select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="aspect-square animate-pulse bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                  <div className="h-9 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{tr('لا توجد منتجات مطابقة', 'No products found')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pagedProducts.map((product) => (
              <Card
                key={product.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)]"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={product.images?.[0] || 'https://placehold.co/600x600'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 h-6 rounded-full bg-white/90 text-slate-700 text-xs font-medium shadow-sm">
                      {cats.find(c => c.id === product.categoryId)?.name || t('storefront.allProducts')}
                    </span>
                  </div>
                  {/* New badge if created within 21 days */}
                  {(() => {
                    const created = (product as any).createdAt as Date;
                    const days = (Date.now() - new Date(created).getTime()) / 86400000;
                    return days <= 21 ? (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center px-2.5 h-6 rounded-full bg-teal-600 text-white text-xs font-medium shadow-sm">{tr('جديد', 'New')}</span>
                      </div>
                    ) : null;
                  })()}
                  {/* Overlay actions */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="pointer-events-auto flex items-center justify-end">
                      <Link
                        to={`/store/${slug}/product/${product.id}`}
                        className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 text-xs font-medium shadow-sm"
                      >
                        <Eye className="h-4 w-4" /> {tr('نظرة سريعة', 'Quick view')}
                      </Link>
                    </div>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-900 tracking-tight mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                    {product.description || ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold" style={{ color: store.theme.primaryColor }}>
                      {formatPrice(product.price, store.settings.currency)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      className="text-white rounded-lg px-3"
                      style={{ backgroundColor: store.theme.primaryColor }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {t('storefront.addToCart')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && sortedProducts.length > pageSize && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              className="h-10 px-3 rounded-lg border border-slate-200 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              {tr('السابق', 'Prev')}
            </button>
            <span className="text-sm text-slate-600">{tr('الصفحة', 'Page')} {currentPage} {tr('من', 'of')} {totalPages}</span>
            <button
              className="h-10 px-3 rounded-lg border border-slate-200 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              {tr('التالي', 'Next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}