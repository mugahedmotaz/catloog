import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreProvider';
import { useCart } from '../../contexts/CartProvider';
import { Button } from '../../components/ui/button';
import { supabase } from '../../services/supabase';
import { formatPrice } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Heart, HeartOff, Share2, CheckCircle, XCircle } from 'lucide-react';
import { useWishlist } from '../../contexts/WishlistProvider';

export function ProductDetailsPage() {
  const { productId, slug } = useParams();
  const { products, getStoreBySlug, categories, stores } = useStore();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedProduct, setFetchedProduct] = useState<any | null>(null);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [categoryName, setCategoryName] = useState<string>('');
  // Variants state
  const [variantOptions, setVariantOptions] = useState<Array<{ id: string; name: string; values: string[]; order: number }>>([]);
  const [variants, setVariants] = useState<Array<{ id: string; selections: Record<string, string>; price: number | null; stock: number; images?: string[] }>>([]);
  const [selections, setSelections] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!slug) return setLoading(false);
      try {
        const s = await getStoreBySlug(slug);
        if (mounted) setStoreId(s?.id ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug, getStoreBySlug]);

  const product = useMemo(() => {
    const p = products.find(p => String(p.id) === String(productId));
    if (p && (!storeId || p.storeId === storeId)) return p;
    return fetchedProduct ?? undefined;
  }, [products, productId, storeId, fetchedProduct]);

  const currency = useMemo(() => {
    try {
      const s = stores?.find((s: any) => s.id === storeId);
      return s?.settings?.currency || 'SAR';
    } catch {
      return 'SAR';
    }
  }, [stores, storeId]);

  // Resolve category name from context or Supabase
  useEffect(() => {
    const resolveCategory = async () => {
      const uncategorized = 'Uncategorized';
      if (!product || !product.categoryId) { setCategoryName(uncategorized); return; }
      const fromCtx = categories.find(c => c.id === product.categoryId)?.name;
      if (fromCtx) { setCategoryName(fromCtx); return; }
      if (!storeId) { setCategoryName(uncategorized); return; }
      const { data } = await supabase
        .from('categories')
        .select('name')
        .eq('id', product.categoryId)
        .eq('store_id', storeId)
        .maybeSingle();
      setCategoryName(data?.name || uncategorized);
    };
    resolveCategory();
  }, [product, categories, storeId]);

  // Fetch product from Supabase if not present in context
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!storeId || !productId) return;
      // If already found via context, skip
      const exists = products.some(p => String(p.id) === String(productId) && p.storeId === storeId);
      if (exists) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('store_id', storeId)
        .eq('is_available', true)
        .single();
      if (mounted) {
        if (!error && data) {
          setFetchedProduct({
            id: data.id,
            name: data.name,
            description: data.description,
            price: Number(data.price),
            images: data.images ?? [],
            categoryId: data.category_id ?? null,
            isAvailable: data.is_available,
            storeId: data.store_id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          });
        } else {
          setFetchedProduct(null);
        }
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [storeId, productId, products]);

  // Load variant options and variants
  useEffect(() => {
    let mounted = true;
    const loadVariants = async () => {
      if (!product?.id) return;
      try {
        const [voRes, pvRes] = await Promise.all([
          supabase.from('variant_options').select('id, name, values, order').eq('product_id', product.id).order('order', { ascending: true }),
          supabase.from('product_variants').select('id, selections, price, stock, images').eq('product_id', product.id)
        ]);
        if (!mounted) return;
        const opts = (voRes.data || []).map((r: any) => ({ id: r.id, name: r.name, values: r.values || [], order: r.order ?? 0 }));
        const vars = (pvRes.data || []).map((r: any) => ({ id: r.id, selections: r.selections || {}, price: r.price !== null ? Number(r.price) : null, stock: Number(r.stock ?? 0), images: r.images || [] }));
        setVariantOptions(opts);
        setVariants(vars);
        // Initialize selections with nulls
        const init: Record<string, string | null> = {};
        opts.forEach(o => { init[o.name] = null; });
        setSelections(init);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading variants', e);
      }
    };
    loadVariants();
    return () => { mounted = false; };
  }, [product?.id]);

  const onSelectOption = useCallback((optionName: string, value: string) => {
    setSelections(prev => ({ ...prev, [optionName]: prev[optionName] === value ? null : value }));
  }, []);

  // Compute selected variant based on selections
  const selectedVariant = useMemo(() => {
    if (!variantOptions.length || !variants.length) return null;
    // Require all options selected to consider a specific variant
    const allSelected = variantOptions.every(o => !!selections[o.name]);
    if (!allSelected) return null;
    const found = variants.find(v => variantOptions.every(o => v.selections?.[o.name] === selections[o.name]));
    return found || null;
  }, [variantOptions, variants, selections]);

  // Available values for each option under current partial selections (stock > 0)
  const availableValues = useMemo(() => {
    const map = new Map<string, Set<string>>();
    variantOptions.forEach(o => map.set(o.name, new Set<string>()));
    variants.forEach(v => {
      if ((v.stock ?? 0) <= 0) return;
      // check compatibility with current selections for other options
      const compatible = Object.entries(selections).every(([name, val]) => !val || v.selections?.[name] === val);
      if (!compatible) return;
      variantOptions.forEach(o => {
        const val = v.selections?.[o.name];
        if (val) map.get(o.name)!.add(val);
      });
    });
    return map;
  }, [variantOptions, variants, selections]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-[4/3] bg-slate-100 animate-pulse rounded" />
          <div className="space-y-3">
            <div className="h-6 bg-slate-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
            <div className="h-10 bg-slate-100 rounded animate-pulse w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-slate-200 p-6 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-slate-600 mb-2">Product not found.</p>
          <Link to={`/store/${slug}`} className="text-teal-600 hover:text-teal-700">Back to store</Link>
        </div>
      </div>
    );
  }

  const catName = categoryName || 'Uncategorized';
  const images = (selectedVariant?.images && selectedVariant.images.length > 0)
    ? selectedVariant.images
    : (product.images && product.images.length > 0 ? product.images : ['https://placehold.co/800x800']);

  const shareProduct = async () => {
    try {
      const url = `${window.location.origin}/store/${slug}/product/${product.id}`;
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.description || product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Product link copied');
      }
    } catch {
      // no-op
    }
  };

  const addToCartWithQty = () => {
    // For now, cart uses base product. In future, include variantId.
    if (variantOptions.length && variantOptions.every(o => !!selections[o.name]) && selectedVariant && selectedVariant.stock <= 0) {
      toast.error('Selected variant is out of stock');
      return;
    }
    for (let i = 0; i < Math.max(1, Math.min(99, qty)); i++) {
      addToCart(product);
    }
    const suffix = selectedVariant ? ` (${Object.entries(selectedVariant.selections).map(([k,v]) => `${k}: ${v}`).join(', ')})` : '';
    toast.success(`Added to cart${suffix}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-slate-500">
        <Link to={`/store/${slug}`} className="hover:text-slate-700">Store</Link>
        <span className="mx-2">/</span>
        <span className="hover:text-slate-700">{catName}</span>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Gallery */}
        <div className="md:sticky md:top-24 self-start">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="relative bg-slate-50 aspect-[4/3]">
              <img
                src={images[selectedImgIdx]}
                alt={product.name}
                fetchPriority="high"
                decoding="async"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>
            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="inline-flex items-center px-2.5 h-7 rounded-full bg-white/90 text-slate-700 text-xs font-medium shadow">{catName}</span>
              {product.isAvailable ? (
                <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-emerald-600 text-white text-xs font-medium shadow">
                  <CheckCircle className="h-4 w-4" /> Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-slate-400 text-white text-xs font-medium shadow">
                  Unavailable
                </span>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  className={`h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 rounded-xl border ${idx === selectedImgIdx ? 'border-teal-600 ring-2 ring-teal-200' : 'border-slate-200'} overflow-hidden`}
                  onClick={() => setSelectedImgIdx(idx)}
                  aria-label={`Image ${idx + 1}`}
                >
                  <img src={img} alt="thumb" loading="lazy" decoding="async" className="h-full w-full object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="space-y-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
          <div className="text-slate-600 whitespace-pre-line leading-relaxed">{product.description}</div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-2xl font-bold" style={{ color: (stores?.find((s: any) => s.id === storeId)?.theme?.primaryColor) || '#0f766e' }}>
              {formatPrice(selectedVariant?.price ?? product.price, currency)}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-10 w-full sm:w-auto text-sm" onClick={shareProduct}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button variant="outline" className="h-10 w-full sm:w-auto text-sm" aria-label="Wishlist" onClick={() => product?.id && toggleWishlist(String(product.id))}>
                {product?.id && isWishlisted(String(product.id)) ? <Heart className="h-4 w-4 text-rose-600" /> : <HeartOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Variants selection */}
          {variantOptions.length > 0 && (
            <div className="space-y-3">
              {variantOptions.map(opt => (
                <div key={opt.id} className="space-y-2">
                  <div className="text-sm font-medium text-slate-700">{opt.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {(opt.values || []).map(val => {
                      const isAvailable = availableValues.get(opt.name)?.has(val) ?? false;
                      const isSelected = selections[opt.name] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => onSelectOption(opt.name, val)}
                          className={`px-3 h-9 rounded-lg border text-sm transition ${isSelected ? 'border-teal-600 ring-2 ring-teal-200' : 'border-slate-200'} ${isAvailable ? 'bg-white hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center rounded-lg border border-slate-200">
              <button
                className="px-3 h-10 text-slate-700 disabled:opacity-50"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="w-12 text-center font-medium">{qty}</div>
              <button
                className="px-3 h-10 text-slate-700"
                onClick={() => setQty(q => Math.min(99, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <Button onClick={addToCartWithQty} disabled={!!variantOptions.length && variantOptions.every(o => !!selections[o.name]) && !!selectedVariant && selectedVariant.stock <= 0} className="h-10 text-white w-full sm:w-auto text-sm disabled:opacity-60" style={{ backgroundColor: (stores?.find((s: any) => s.id === storeId)?.theme?.primaryColor) || '#0f766e' }}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Add to cart
            </Button>
          </div>

          <div className="pt-2 text-sm text-slate-500">
            Category: <span className="text-slate-700">{catName}</span>
          </div>

          <div>
            <Link to={`/store/${slug}`} className="text-teal-600 hover:text-teal-700">Back to store</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
