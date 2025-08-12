import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Eye, CheckCircle2, XCircle, Clock4 } from 'lucide-react';
import { useStore } from '../../contexts/StoreProvider';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { formatPrice } from '../../lib/utils';
import type { Order } from '../../types';

type Status = Order['status'];

const STATUS_OPTIONS: { key: Status; label: string; color: string }[] = [
  { key: 'pending', label: 'orders.pending', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'confirmed', label: 'orders.confirmed', color: 'bg-blue-100 text-blue-700' },
  { key: 'completed', label: 'orders.completed', color: 'bg-green-100 text-green-700' },
  { key: 'cancelled', label: 'orders.cancelled', color: 'bg-red-100 text-red-700' },
];

export function OrdersPage() {
  const { t } = useTranslation();
  const { currentStore, orders, updateOrderStatus, isLoading } = useStore();
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter(o => o.storeId === currentStore?.id)
      .filter(o => (statusFilter === 'all' ? true : o.status === statusFilter))
      .filter(o => {
        if (!q) return true;
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [orders, currentStore?.id, statusFilter, query]);

  const setStatus = async (id: string, status: Status) => {
    await updateOrderStatus(id, status);
  };

  const statusIcon = (s: Status) => {
    switch (s) {
      case 'pending':
        return <Clock4 className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.orders') || 'Orders'}</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('orders.search') || 'Search by number, name, phone...'}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
              >
                {t('common.all') || 'All'}
              </Button>
              {STATUS_OPTIONS.map(s => (
                <Button
                  key={s.key}
                  variant={statusFilter === s.key ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(s.key)}
                >
                  {t(s.label)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <Card><CardContent className="p-12 text-center text-gray-500">{t('common.loading') || 'Loading...'}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-500 mt-4">{t('orders.empty') || 'No orders yet.'}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{o.orderNumber}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_OPTIONS.find(s=>s.key===o.status)?.color}`}>
                        {statusIcon(o.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {o.customerName} • {o.customerPhone}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-teal-600">
                      {formatPrice(o.total, currentStore?.settings.currency)}
                    </div>
                    <div className="mt-2 flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setSelected(o)}>
                        <Eye className="h-4 w-4 mr-1" /> {t('common.view') || 'View'}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <Button
                      key={s.key}
                      size="sm"
                      variant={o.status === s.key ? 'default' : 'outline'}
                      disabled={isLoading || o.status === s.key}
                      onClick={() => setStatus(o.id, s.key)}
                    >
                      {t(s.label)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">{t('orders.order')} #{selected.orderNumber}</div>
              <Button variant="outline" onClick={() => setSelected(null)}>{t('common.close') || 'Close'}</Button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">{t('orders.customer') || 'Customer'}</div>
                  <div className="font-medium">{selected.customerName}</div>
                  <div className="text-sm text-gray-700">{selected.customerPhone}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{t('orders.total') || 'Total'}</div>
                  <div className="font-bold text-teal-600">{formatPrice(selected.total, currentStore?.settings.currency)}</div>
                </div>
              </div>
              {selected.notes && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">{t('orders.notes') || 'Notes'}</div>
                  <div className="text-sm bg-gray-50 rounded p-3 whitespace-pre-wrap">{selected.notes}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500 mb-2">{t('orders.items') || 'Items'}</div>
                <div className="space-y-2">
                  {selected.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                      <div className="flex-1">
                        <div className="font-medium">{it.productName}</div>
                        <div className="text-gray-600">{it.quantity} × {formatPrice(it.price, currentStore?.settings.currency)}</div>
                      </div>
                      <div className="font-medium">{formatPrice(it.total, currentStore?.settings.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(s => (
                  <Button
                    key={s.key}
                    size="sm"
                    variant={selected.status === s.key ? 'default' : 'outline'}
                    disabled={isLoading || selected.status === s.key}
                    onClick={() => setStatus(selected.id, s.key)}
                  >
                    {t(s.label)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
