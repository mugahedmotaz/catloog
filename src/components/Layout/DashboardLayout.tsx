import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Store, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  BarChart3,
  Palette,
  Tag
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { PlanProvider } from '../../contexts/PlanProvider';
import { getDisplayName } from '../../lib/auth';
import { useStore } from '../../contexts/StoreProvider';
import toast from 'react-hot-toast';
import { getActiveSubscription, cancelSubscriptionById, type Subscription } from '../../services/subscriptions';

const sidebarItems = [
  { key: 'overview', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'products', icon: Package, path: '/dashboard/products' },
  { key: 'categories', icon: Tag, path: '/dashboard/categories' },
  { key: 'orders', icon: ShoppingCart, path: '/dashboard/orders' },
  { key: 'store', icon: Store, path: '/dashboard/store' },
  { key: 'customization', icon: Palette, path: '/dashboard/customize' },
  { key: 'analytics', icon: BarChart3, path: '/dashboard/analytics' },
  { key: 'settings', icon: Settings, path: '/dashboard/settings' }
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentStore } = useStore();
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Standardized display name
  const displayName = getDisplayName(user as any);

  // Refs for outside-click handling
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(t) && userTriggerRef.current && !userTriggerRef.current.contains(t)) {
        setUserMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen]);

  // Load active subscription for current store
  useEffect(() => {
    const load = async () => {
      if (!currentStore?.id) { setActiveSub(null); return; }
      setSubLoading(true);
      try {
        const sub = await getActiveSubscription(currentStore.id);
        setActiveSub(sub);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load subscription', e);
      } finally {
        setSubLoading(false);
      }
    };
    void load();
  }, [currentStore?.id]);

  const getPlanName = (sub: Subscription | null): string | null => {
    if (!sub) return null;
    const p: any = sub.plans;
    if (!p) return null;
    return Array.isArray(p) ? (p[0]?.name ?? null) : (p.name ?? null);
  };

  const cancelSubscription = async () => {
    if (!activeSub) return;
    const ok = window.confirm('Cancel the current subscription?');
    if (!ok) return;
    setCancelLoading(true);
    try {
      await cancelSubscriptionById(activeSub.id);
      toast.success('Subscription canceled');
      const refreshed = currentStore?.id ? await getActiveSubscription(currentStore.id) : null;
      setActiveSub(refreshed);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <PlanProvider>
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-60 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-300 ease-in-out lg:static lg:block`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Catloog</h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.key === 'overview' && 'Overview'}
                  {item.key === 'products' && 'Products'}
                  {item.key === 'categories' && 'Categories'}
                  {item.key === 'orders' && 'Orders'}
                  {item.key === 'store' && 'My Store'}
                  {item.key === 'customization' && 'Customize'}
                  {item.key === 'analytics' && 'Analytics'}
                  {item.key === 'settings' && 'Settings'}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="px-4">
              <Button
                variant="ghost"
                className="flex items-center bg-red-600 w-full justify-start text-sm font-medium text-white hover:bg-red-700 "
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Log out
              </Button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-1">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 w-full">
          <div className="app-container flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome{displayName ? `, ${displayName}` : ''}
              </h2>
              {/* Compact plan badge and quick upgrade */}
              <div className="ml-3 hidden sm:flex items-center gap-2">
                {subLoading ? (
                  <span className="text-xs text-gray-500">Loading…</span>
                ) : activeSub ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                    {getPlanName(activeSub) ?? activeSub.plan_id}
                  </span>
                ) : (
                  <Link to="/dashboard/upgrade" className="text-xs text-teal-700 hover:underline">Upgrade</Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 relative">
              {/* Active subscription summary */}
              <div className="hidden md:flex items-center gap-3 text-sm">
                {subLoading ? (
                  <div className="text-gray-500">Loading…</div>
                ) : activeSub ? (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right">
                      <span className="text-gray-700 font-medium">
                        {getPlanName(activeSub) ?? activeSub.plan_id} · {activeSub.period === 'monthly' ? 'Monthly' : 'Yearly'}
                      </span>
                      <span className="text-gray-500">
                        Ends: {activeSub.ends_at ? new Date(activeSub.ends_at).toLocaleString() : '—'}
                      </span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={cancelSubscription} disabled={cancelLoading}>
                      {cancelLoading ? 'Canceling…' : 'Cancel subscription'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-500">No active subscription</div>
                )}
              </div>
              <button
                className="h-9 w-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold shadow-sm hover:bg-teal-200 transition"
                onClick={() => setUserMenuOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-controls="user-menu"
                ref={userTriggerRef}
              >
                {(displayName && displayName[0]?.toUpperCase()) || (user?.email ? user.email[0]?.toUpperCase() : 'U')}
              </button>
              {userMenuOpen && (
                <div
                  id="user-menu"
                  ref={userMenuRef}
                  className="absolute z-50 top-full mt-2 left-auto right-0 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                  role="menu"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-600">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName || 'User'}</p>
                    {user?.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                  <div className="border-t border-gray-200" />
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {/* Mobile subscription summary */}
        <div className="app-container md:hidden border-b border-gray-200 bg-white">
          <div className="py-2 flex items-center justify-between">
            {subLoading ? (
              <div className="text-gray-500 text-sm">Loading…</div>
            ) : activeSub ? (
              <>
                <div className="flex flex-col text-xs">
                  <span className="text-gray-700 font-medium">
                    {getPlanName(activeSub) ?? activeSub.plan_id} · {activeSub.period === 'monthly' ? 'Monthly' : 'Yearly'}
                  </span>
                  <span className="text-gray-500">
                    Ends: {activeSub.ends_at ? new Date(activeSub.ends_at).toLocaleString() : '—'}
                  </span>
                </div>
                <Button variant="destructive" size="sm" onClick={cancelSubscription} disabled={cancelLoading}>
                  {cancelLoading ? 'Canceling…' : 'Cancel'}
                </Button>
              </>
            ) : (
              <div className="text-gray-500 text-sm">No active subscription</div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 py-6">
          <div className="app-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  </PlanProvider>
  );
}

export default DashboardLayout;