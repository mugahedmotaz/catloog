import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreProvider';

export function CategoriesPage() {
  const { slug } = useParams();
  const { categories, products, getStoreBySlug } = useStore();
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
      const key = String(p.category ?? 'uncategorized');
      if (!map[key]) map[key] = [] as any;
      map[key].push(p);
    }
    return map;
  }, [products, storeId]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">التصنيفات</h1>
      <div className="space-y-6">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="bg-white border rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">{cat.name}</h2>
              <Link to={`/store/${slug}`} className="text-teal-600 hover:text-teal-700 text-sm">العودة للمتجر</Link>
            </div>
            <p className="text-gray-600 mb-3">{cat.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(productsByCategory[String(cat.name)] || []).map((p) => (
                <Link key={p.id} to={`/store/${slug}/product/${p.id}`} className="border rounded hover:shadow">
                  <img src={p.images?.[0] || 'https://placehold.co/400x300'} alt={p.name} className="w-full h-40 object-cover rounded-t" />
                  <div className="p-3">
                    <div className="font-medium line-clamp-1">{p.name}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{p.description}</div>
                    <div className="mt-2 font-semibold">{p.price} ر.س</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="text-gray-500">لا توجد تصنيفات بعد.</div>
        )}
      </div>
    </div>
  );
}
