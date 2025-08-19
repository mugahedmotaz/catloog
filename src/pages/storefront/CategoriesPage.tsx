import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreProvider';
import { formatPrice } from '../../lib/utils';
import SEO from '../../components/SEO';

export function CategoriesPage() {
  const { slug } = useParams();
  const { categories, products, getStoreBySlug, stores } = useStore();
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (slug) {
        const store = await getStoreBySlug(slug);
        setStoreId(store?.id ?? null);
      }
    })();
  }, [slug, getStoreBySlug]);

  const filteredCategories = useMemo(
    () => categories.filter(c => (storeId ? c.storeId === storeId : true)).sort((a,b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories, storeId]
  );

  const productsByCategory = useMemo(() => {
    const map: Record<string, typeof products> = {};
    for (const p of products) {
      if (storeId && p.storeId !== storeId) continue;
      const key = String(p.categoryId ?? 'uncategorized');
      if (!map[key]) map[key] = [] as any;
      map[key].push(p);
    }
    return map;
  }, [products, storeId]);

  const currency = useMemo(() => {
    try {
      const s = stores?.find((s: any) => s.id === storeId);
      return s?.settings?.currency || 'SAR';
    } catch {
      return 'SAR';
    }
  }, [stores, storeId]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <SEO
        title={`${(stores?.find((s: any) => s.id === storeId)?.name) || 'Store'} – Categories`}
        description={(stores?.find((s: any) => s.id === storeId)?.description) || undefined}
        canonical={typeof window !== 'undefined' ? window.location.href : undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${(stores?.find((s: any) => s.id === storeId)?.name) || 'Store'} – Categories`,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
      <h1 className="text-base sm:text-xl font-bold mb-4">Categories</h1>
      <div className="space-y-4 sm:space-y-6">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="bg-white border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg sm:text-xl font-semibold">{cat.name}</h2>
              <Link to={`/store/${slug}`} className="text-teal-600 hover:text-teal-700 text-sm">Back to store</Link>
            </div>
            <p className="text-gray-600 text-sm sm:text-base mb-3">{cat.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {(productsByCategory[String(cat.id)] || []).map((p) => (
                <Link key={p.id} to={`/store/${slug}/product/${p.id}`} className="group border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md overflow-hidden transition-all">
                  <div className="aspect-[4/3] bg-slate-50 overflow-hidden">
                    <img
                      src={p.images?.[0] || 'https://placehold.co/800x600'}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3 border-t border-slate-100">
                    <div className="font-medium line-clamp-1 text-sm sm:text-base">{p.name}</div>
                    <div className="text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2">{p.description}</div>
                    <div className="mt-2 font-semibold text-sm sm:text-base">{formatPrice(p.price, currency)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="text-gray-500">No categories yet.</div>
        )}
      </div>
    </div>
  );
}
