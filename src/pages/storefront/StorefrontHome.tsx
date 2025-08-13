import { useState, useEffect, useMemo, useCallback, useDeferredValue, useTransition } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStore } from '../../contexts/StoreProvider';
import { useCart } from '../../contexts/CartProvider';
// import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { Store, Product, Category } from '../../types';
import { supabase } from '../../services/supabase';
import { ProductCard } from '../../components/storefront/ProductCard';

export function StorefrontHome() {
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
  const [isPending, startTransition] = useTransition();

  // defer heavy-filter inputs
  const dSearch = useDeferredValue(debouncedSearch);
  const dCategory = useDeferredValue(selectedCategoryId);
  const dSortBy = useDeferredValue(sortBy);

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
            supabase
              .from('categories')
              .select('id,name,description,store_id,order,created_at,updated_at')
              .eq('store_id', s.id),
            supabase
              .from('products')
              .select('id,name,description,price,images,category_id,is_available,store_id,created_at,updated_at')
              .eq('store_id', s.id)
              .eq('is_available', true),
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
        const q = dSearch.trim().toLowerCase();
        const matchesSearch = !q || product.name.toLowerCase().includes(q);
        const matchesCategory = !dCategory || product.categoryId === dCategory;
        const isAvail = product.isAvailable;
        return matchesSearch && matchesCategory && isAvail;
      });
  }, [prods, store, dSearch, dCategory]);

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    if (dSortBy === 'price-asc') arr.sort((a, b) => a.price - b.price);
    else if (dSortBy === 'price-desc') arr.sort((a, b) => b.price - a.price);
    else {
      // newest by createdAt desc
      arr.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return arr;
  }, [filteredProducts, dSortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage]);

  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
    toast.success(`${product.name} added to cart`);
  }, [addToCart]);

  const catNameById = useMemo(() => {
    const map = new Map<string, string>();
    cats.forEach((c) => {
      if (!store || c.storeId === store.id) map.set(c.id, c.name);
    });
    return map;
  }, [cats, store]);

  if (!store || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
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
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Welcome to {store.name}</h1>
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
                    All products
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
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => startTransition(() => setSearchTerm(e.target.value))}
              className="w-full h-11 pl-10 pr-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {isPending && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Updating…</div>
            )}
          </div>
          <select
            value={selectedCategoryId}
            onChange={(e) => { startTransition(() => { setSelectedCategoryId(e.target.value); setPage(1); }); }}
            className="h-11 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All products</option>
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
            onChange={(e) => { startTransition(() => { setSortBy(e.target.value as any); setPage(1); }); }}
            className="h-11 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Sort products"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="aspect-[4/3] animate-pulse bg-slate-100" />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                  <div className="h-9 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {pagedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={catNameById.get(product.categoryId || '') || 'All products'}
                storeSlug={slug || ''}
                currency={store.settings.currency}
                primaryColor={store.theme.primaryColor}
                onAddToCart={handleAddToCart}
              />
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
              Prev
            </button>
            <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
            <button
              className="h-10 px-3 rounded-lg border border-slate-200 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}