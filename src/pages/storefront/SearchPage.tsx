import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../contexts/StoreProvider';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { formatPrice } from '../../lib/utils';

export function SearchPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { products, currentStore } = useStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p => p.storeId === currentStore?.id)
      .filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [query, products, currentStore?.id]);

  if (!currentStore) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('storefront.search') || 'Search'}</h1>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('storefront.searchPH') || 'Search products...'}
      />

      {query && (
        <div className="mt-6 space-y-3">
          {results.length === 0 && (
            <div className="text-gray-600">{t('storefront.noResults') || 'No results found'}</div>
          )}
          {results.map((p) => (
            <Link key={p.id} to={`/store/${slug}/product/${p.id}`}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-gray-600 line-clamp-1">{p.description}</div>
                  </div>
                  <div className="text-sm font-medium">
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
