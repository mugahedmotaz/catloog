 
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../contexts/StoreProvider';
import { formatPrice } from '../../lib/utils';
import FeatureGate from '../../components/FeatureGate';
import UpgradePrompt from '../../components/UpgradePrompt';
import { FEATURES } from '../../constants/features';
 

export function DashboardOverview() {
  const { products, orders, categories } = useStore();
  const navigate = useNavigate();

  const stats = {
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    totalOrders: orders.length,
    totalProducts: products.length,
    conversionRate: 12.5
  };

  const recentOrders = orders.slice(0, 5);

  

  

  return (
    <div className="space-y-6">
      {/* Upgrade CTA */}
      <Card>
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-gray-600">Unlock higher limits and advanced features.</p>
            <h3 className="text-lg font-semibold">Upgrade your plan</h3>
          </div>
          <div className="flex gap-2">
            <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => navigate('/dashboard/upgrade')}>Upgrade</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/billing')}>View invoices</Button>
          </div>
        </CardContent>
      </Card>
      {/* Stats Grid */}
      <FeatureGate feature={FEATURES.analytics} fallback={<UpgradePrompt title="Upgrade to unlock analytics" message="Overview analytics are not available on your current plan." /> }>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
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
              Total Orders
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
              Total Products
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
              Conversion Rate
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
      </FeatureGate>

      {/* Recent Orders and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <FeatureGate feature={FEATURES.orders} fallback={<UpgradePrompt title="Upgrade to view recent orders" message="Orders overview is not available on your current plan." /> }>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-72">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-slate-600">
                    <th className="text-left font-semibold py-2">#</th>
                    <th className="text-left font-semibold py-2">Customer</th>
                    <th className="text-left font-semibold py-2">Total</th>
                    <th className="text-left font-semibold py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-2">{order.orderNumber}</td>
                      <td className="py-2">{(order as any).customerName || 'Guest'}</td>
                      <td className="py-2">{formatPrice(order.total)}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status === 'pending' ? 'Pending' :
                           order.status === 'confirmed' ? 'Confirmed' :
                           order.status === 'completed' ? 'Completed' :
                           'Cancelled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </FeatureGate>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Top Products
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