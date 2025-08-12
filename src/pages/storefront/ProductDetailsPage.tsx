import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreProvider';
import { useCart } from '../../contexts/CartProvider';
import { Button } from '../../components/ui/button';
import { supabase } from '../../services/supabase';
import { formatPrice } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Heart, Share2, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ProductDetailsPage() {
  const { productId, slug } = useParams();
  const { products, getStoreBySlug, categories, stores } = useStore();
  const { addToCart } = useCart();
  const { i18n } = useTranslation();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedProduct, setFetchedProduct] = useState<any | null>(null);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [categoryName, setCategoryName] = useState<string>('');

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
      const uncategorized = i18n.language === 'ar' ? 'غير محدد' : 'Uncategorized';
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
  }, [product, categories, storeId, i18n.language]);

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
          <p className="text-slate-600 mb-2">{i18n.language === 'ar' ? 'المنتج غير موجود.' : 'Product not found.'}</p>
          <Link to={`/store/${slug}`} className="text-teal-600 hover:text-teal-700">{i18n.language === 'ar' ? 'عودة للمتجر' : 'Back to store'}</Link>
        </div>
      </div>
    );
  }

  const catName = categoryName || (i18n.language === 'ar' ? 'غير محدد' : 'Uncategorized');
  const images = product.images && product.images.length > 0 ? product.images : ['https://placehold.co/800x800'];

  const shareProduct = async () => {
    try {
      const url = `${window.location.origin}/store/${slug}/product/${product.id}`;
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.description || product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(i18n.language === 'ar' ? 'تم نسخ رابط المنتج' : 'Product link copied');
      }
    } catch {
      // no-op
    }
  };

  const addToCartWithQty = () => {
    for (let i = 0; i < Math.max(1, Math.min(99, qty)); i++) {
      addToCart(product);
    }
    toast.success(i18n.language === 'ar' ? 'تمت الإضافة إلى السلة' : 'Added to cart');
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-slate-500">
        <Link to={`/store/${slug}`} className="hover:text-slate-700">{i18n.language === 'ar' ? 'المتجر' : 'Store'}</Link>
        <span className="mx-2">/</span>
        <span className="hover:text-slate-700">{catName}</span>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Gallery */}
        <div className="md:sticky md:top-24 self-start">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img
              src={images[selectedImgIdx]}
              alt={product.name}
              className="w-full aspect-square object-cover"
            />
            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="inline-flex items-center px-2.5 h-7 rounded-full bg-white/90 text-slate-700 text-xs font-medium shadow">{catName}</span>
              {product.isAvailable ? (
                <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-emerald-600 text-white text-xs font-medium shadow">
                  <CheckCircle className="h-4 w-4" /> {i18n.language === 'ar' ? 'متوفر' : 'Available'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-slate-400 text-white text-xs font-medium shadow">
                  {i18n.language === 'ar' ? 'غير متوفر' : 'Unavailable'}
                </span>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  className={`h-16 w-16 flex-shrink-0 rounded-xl border ${idx === selectedImgIdx ? 'border-teal-600 ring-2 ring-teal-200' : 'border-slate-200'} overflow-hidden`}
                  onClick={() => setSelectedImgIdx(idx)}
                  aria-label={`صورة ${idx + 1}`}
                >
                  <img src={img} alt="thumb" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
          <div className="text-slate-600 whitespace-pre-line leading-relaxed">{product.description}</div>

          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold" style={{ color: (stores?.find((s: any) => s.id === storeId)?.theme?.primaryColor) || '#0f766e' }}>
              {formatPrice(product.price, currency)}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-10" onClick={shareProduct}>
                <Share2 className="h-4 w-4 mr-2" /> {i18n.language === 'ar' ? 'مشاركة' : 'Share'}
              </Button>
              <Button variant="outline" className="h-10" aria-label={i18n.language === 'ar' ? 'قائمة الرغبات' : 'Wishlist'}>
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-slate-200">
              <button
                className="px-3 h-10 text-slate-700 disabled:opacity-50"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label={i18n.language === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
              >
                −
              </button>
              <div className="w-12 text-center font-medium">{qty}</div>
              <button
                className="px-3 h-10 text-slate-700"
                onClick={() => setQty(q => Math.min(99, q + 1))}
                aria-label={i18n.language === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
              >
                +
              </button>
            </div>
            <Button onClick={addToCartWithQty} className="h-10 text-white" style={{ backgroundColor: (stores?.find((s: any) => s.id === storeId)?.theme?.primaryColor) || '#0f766e' }}>
              <ShoppingCart className="h-4 w-4 mr-2" /> {i18n.language === 'ar' ? 'أضف إلى السلة' : 'Add to cart'}
            </Button>
          </div>

          <div className="pt-2 text-sm text-slate-500">
            {i18n.language === 'ar' ? 'التصنيف:' : 'Category:'} <span className="text-slate-700">{catName}</span>
          </div>

          <div>
            <Link to={`/store/${slug}`} className="text-teal-600 hover:text-teal-700">{i18n.language === 'ar' ? 'العودة للمتجر' : 'Back to store'}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
