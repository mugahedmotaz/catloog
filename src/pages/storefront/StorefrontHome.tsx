import { useState, useEffect, useMemo, useCallback, useDeferredValue, useTransition } from 'react';
import { useParams } from 'react-router-dom';
import { Search, ShieldCheck, Truck, RotateCcw, Sparkles, Star } from 'lucide-react';
import { useStore } from '../../contexts/StoreProvider';
import { useCart } from '../../contexts/CartProvider';
// import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { Store, Product, Category } from '../../types';
import { supabase } from '../../services/supabase';
import SEO from '../../components/SEO';
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

  // Featured products (top picks) to highlight above the main grid
  const featuredProducts = useMemo(() => {
    // Prefer newest items; fallback to available products if needed
    const base = [...sortedProducts];
    return base.slice(0, Math.min(8, base.length));
  }, [sortedProducts]);

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
    <div className="space-y-12">
      <SEO
        title={`${store.name}`}
        description={store.description || undefined}
        canonical={typeof window !== 'undefined' ? window.location.href : undefined}
        image={store.theme.heroBackgroundImage || undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: store.name,
          description: store.description || undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
      {/* Announcement Bar */}
      {store.theme.announcementEnabled !== false && (
        <div className="text-white" style={{ backgroundColor: store.theme.primaryColor || '#0f172a' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-center text-sm">
            {store.theme.announcementText && store.theme.announcementText.trim().length > 0 ? (
              <span className="font-medium">{store.theme.announcementText}</span>
            ) : (
              <>
                <span className="font-medium">Limited time:</span> Free shipping on orders over <span className="font-semibold">$99</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      {store.theme.heroEnabled !== false && (
      <div className="relative overflow-hidden">
        {store.theme.heroBackgroundImage ? (
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,0.95)), url(${store.theme.heroBackgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div
            className="absolute inset-0 -z-10 opacity-30"
            style={{ background: `radial-gradient(60rem 60rem at 120% -10%, ${store.theme.primaryColor}20, transparent)` }}
          />
        )}
        <div className="py-12 md:py-20 bg-gradient-to-r from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 text-white text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Handpicked collections, new arrivals weekly
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                Discover {store.name}
              </h1>
              {store.description ? (
                <p className="mt-3 text-slate-600 text-lg max-w-2xl mx-auto">
                  {store.description}
                </p>
              ) : (
                <p className="mt-3 text-slate-600 text-lg max-w-2xl mx-auto">
                  Premium quality. Fair prices. Zero compromises.
                </p>
              )}

              <div className="mt-6 flex items-center justify-center gap-3">
                <a
                  href="#products"
                  onClick={(e) => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className={`inline-flex items-center justify-center h-11 px-6 text-white font-medium shadow-sm ${store.theme.buttonRoundness === 'full' ? 'rounded-full' : store.theme.buttonRoundness === 'lg' ? 'rounded-xl' : store.theme.buttonRoundness === 'sm' ? 'rounded' : 'rounded-lg'}`}
                  style={{ backgroundColor: store.theme.primaryColor }}
                >
                  Shop now
                </a>
                <a
                  href="#featured"
                  onClick={(e) => { e.preventDefault(); document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className={`inline-flex items-center justify-center h-11 px-6 border border-slate-200 text-slate-900 font-medium hover:bg-slate-50 ${store.theme.buttonRoundness === 'full' ? 'rounded-full' : store.theme.buttonRoundness === 'lg' ? 'rounded-xl' : store.theme.buttonRoundness === 'sm' ? 'rounded' : 'rounded-lg'}`}
                >
                  Explore featured
                </a>
              </div>
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
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Badges */}
        {store.theme.trustBadgesEnabled !== false && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white">
            <Truck className="h-5 w-5 text-slate-700" />
            <div className="text-sm">
              <div className="font-semibold text-slate-900">Fast & free shipping</div>
              <div className="text-slate-500">On orders over $99</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <div className="text-sm">
              <div className="font-semibold text-slate-900">Secure checkout</div>
              <div className="text-slate-500">256-bit encryption</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white">
            <RotateCcw className="h-5 w-5 text-slate-700" />
            <div className="text-sm">
              <div className="font-semibold text-slate-900">Easy returns</div>
              <div className="text-slate-500">30-day policy</div>
            </div>
          </div>
        </div>
        )}

        {/* Featured Picks */}
        {featuredProducts.length > 0 && (store.theme.featuredEnabled !== false) && (
          <section id="featured" className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" /> Featured Picks
              </h2>
              <a
                href="#products"
                onClick={(e) => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Shop all
              </a>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${(() => {
              const md = Math.max(1, Math.min(6, (store.theme.productGridColsMd ?? 3)));
              return {
                1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
              }[md as 1|2|3|4|5|6];
            })()} ${(() => {
              const lg = Math.max(1, Math.min(6, (store.theme.productGridColsLg ?? 4)));
              return {
                1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
              }[lg as 1|2|3|4|5|6];
            })()} gap-4 sm:gap-6`}>            
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={catNameById.get(product.categoryId || '') || 'All products'}
                  storeSlug={slug || ''}
                  currency={store.settings.currency}
                  primaryColor={store.theme.primaryColor}
                  cardVariant={store.theme.productCardVariant}
                  cornerRadius={store.theme.cornerRadius}
                  buttonRoundness={store.theme.buttonRoundness}
                  useRoundedImages={store.theme.useRoundedImages}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </section>
        )}

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
        <div id="products" />
        {loading ? (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${(() => {
            const md = Math.max(1, Math.min(6, (store.theme.productGridColsMd ?? 3)));
            return {
              1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
            }[md as 1|2|3|4|5|6];
          })()} ${(() => {
            const lg = Math.max(1, Math.min(6, (store.theme.productGridColsLg ?? 4)));
            return {
              1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
            }[lg as 1|2|3|4|5|6];
          })()} gap-4 sm:gap-6`}>
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
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${(() => {
            const md = Math.max(1, Math.min(6, (store.theme.productGridColsMd ?? 3)));
            return {
              1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
            }[md as 1|2|3|4|5|6];
          })()} ${(() => {
            const lg = Math.max(1, Math.min(6, (store.theme.productGridColsLg ?? 4)));
            return {
              1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
            }[lg as 1|2|3|4|5|6];
          })()} gap-4 sm:gap-6`}>
            {pagedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={catNameById.get(product.categoryId || '') || 'All products'}
                storeSlug={slug || ''}
                currency={store.settings.currency}
                primaryColor={store.theme.primaryColor}
                cardVariant={store.theme.productCardVariant}
                cornerRadius={store.theme.cornerRadius}
                buttonRoundness={store.theme.buttonRoundness}
                useRoundedImages={store.theme.useRoundedImages}
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

        {/* Benefits Strip */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-sm font-semibold text-slate-900">Quality you can feel</div>
            <div className="text-xs text-slate-500">Crafted with premium materials</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-sm font-semibold text-slate-900">Best price guaranteed</div>
            <div className="text-xs text-slate-500">No middlemen. No extra costs</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-sm font-semibold text-slate-900">Support that cares</div>
            <div className="text-xs text-slate-500">We’re here 7 days a week</div>
          </div>
        </div>

        {/* Newsletter CTA */}
        {store.theme.newsletterEnabled !== false && (
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="px-6 py-8 sm:px-8 md:px-10 md:py-10 grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Join our insider list</h3>
              <p className="mt-1 text-slate-600 text-sm">Get early access to drops, exclusive deals, and more.</p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => { e.preventDefault(); toast.success('Subscribed!'); }}>
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="flex-1 h-11 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                className={`h-11 px-6 text-white font-medium ${store.theme.buttonRoundness === 'full' ? 'rounded-full' : store.theme.buttonRoundness === 'lg' ? 'rounded-xl' : store.theme.buttonRoundness === 'sm' ? 'rounded' : 'rounded-lg'}`}
                style={{ backgroundColor: store.theme.primaryColor }}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}