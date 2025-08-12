import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../contexts/StoreProvider';
import { Card, CardContent } from '../../components/ui/card';

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { currentStore, orders } = useStore();

  const scoped = useMemo(() => orders.filter(o => o.storeId === currentStore?.id), [orders, currentStore?.id]);

  const stats = useMemo(() => {
    const totalRevenue = scoped.reduce((s, o) => s + (o.status !== 'cancelled' ? o.total : 0), 0);
    const totalOrders = scoped.length;
    const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

    // last 7 days orders count
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    };
    const days: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = fmt(d);
      const count = scoped.filter(o => fmt(new Date(o.createdAt)) === key).length;
      days.push({ label: key.slice(5), value: count });
    }

    // top products by quantity
    const productMap = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of scoped) {
      for (const item of o.items) {
        const curr = productMap.get(item.productId) || { name: item.productName, qty: 0, total: 0 };
        curr.qty += item.quantity;
        curr.total += item.total;
        productMap.set(item.productId, curr);
      }
    }
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return { totalRevenue, totalOrders, avgOrder, days, topProducts };
  }, [scoped]);

  if (!currentStore) {
    return <div className="p-6 text-gray-500">{t('analytics.noStore') || 'Create a store to see analytics.'}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('analytics.title') || 'Analytics'}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><div className="text-sm text-gray-500">{t('analytics.revenue') || 'Total Revenue'}</div><div className="text-2xl font-bold">{formatNumber(stats.totalRevenue)}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-sm text-gray-500">{t('analytics.orders') || 'Orders'}</div><div className="text-2xl font-bold">{formatNumber(stats.totalOrders)}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-sm text-gray-500">{t('analytics.aov') || 'Avg Order Value'}</div><div className="text-2xl font-bold">{formatNumber(stats.avgOrder)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 mb-3">{t('analytics.orders7days') || 'Orders (last 7 days)'}</div>
            <div className="flex items-end gap-2 h-40">
              {stats.days.map((d, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-6 bg-teal-500 rounded" style={{ height: `${(d.value || 0) * 20}px` }} />
                  <div className="text-xs text-gray-500">{d.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 mb-3">{t('analytics.topProducts') || 'Top Products'}</div>
            <div className="space-y-2">
              {stats.topProducts.length === 0 && <div className="text-gray-500 text-sm">{t('analytics.noTop') || 'No data yet'}</div>}
              {stats.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-gray-600">{p.qty} • {formatNumber(p.total)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsPage;
