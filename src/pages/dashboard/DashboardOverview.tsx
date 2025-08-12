 
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { useStore } from '../../contexts/StoreProvider';
import { formatPrice } from '../../lib/utils';
 

export function DashboardOverview() {
  const { t } = useTranslation();
  const { products, orders, categories } = useStore();

  const stats = {
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    totalOrders: orders.length,
    totalProducts: products.length,
    conversionRate: 12.5
  };

  const recentOrders = orders.slice(0, 5);

  

  

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalRevenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalOrders')}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-gray-500 mt-1">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalProducts')}
            </CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">
              +2 this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.conversionRate')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              {t('dashboard.recentOrders')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-72">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-slate-600">
                    <th className="text-left font-semibold py-2">#</th>
                    <th className="text-left font-semibold py-2">{t('orders.customer', 'Customer')}</th>
                    <th className="text-left font-semibold py-2">{t('orders.total', 'Total')}</th>
                    <th className="text-left font-semibold py-2">{t('orders.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-2">{order.orderNumber}</td>
                      <td className="py-2">{(order as any).customerName || t('orders.guest', 'Guest')}</td>
                      <td className="py-2">{formatPrice(order.total)}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {t(`orders.${order.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {t('dashboard.topProducts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img
                      src={product.images?.[0] || 'https://placehold.co/80'}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-600">{categories.find(c => c.id === product.categoryId)?.name || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatPrice(product.price)}</p>
                    <p className="text-xs text-gray-600">45 sold</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}