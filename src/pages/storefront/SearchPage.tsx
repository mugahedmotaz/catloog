import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreProvider';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { formatPrice } from '../../lib/utils';

export function SearchPage() {
  const { slug } = useParams();
  const { products, currentStore, categories } = useStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p => p.storeId === currentStore?.id)
      .filter(p => {
        const catName = categories.find(c => c.id === p.categoryId)?.name?.toLowerCase() || '';
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          catName.includes(q)
        );
      });
  }, [query, products, currentStore?.id, categories]);

  if (!currentStore) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Search</h1>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />

      {query && (
        <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
          {results.length === 0 && (
            <div className="text-gray-600">No results found</div>
          )}
          {results.map((p) => (
            <Link key={p.id} to={`/store/${slug}/product/${p.id}`}>
              <Card>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded aspect-square" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-sm sm:text-base">{p.name}</div>
                    <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{p.description}</div>
                  </div>
                  <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                    {formatPrice(p.price, currentStore.settings.currency)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
