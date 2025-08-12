import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Palette
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LanguageToggle } from '../LanguageToggle';
import { Button } from '../ui/button';
import { getDisplayName } from '../../lib/auth';

const sidebarItems = [
  { key: 'overview', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'products', icon: Package, path: '/dashboard/products' },
  { key: 'orders', icon: ShoppingCart, path: '/dashboard/orders' },
  { key: 'store', icon: Store, path: '/dashboard/store' },
  { key: 'customization', icon: Palette, path: '/dashboard/customize' },
  { key: 'analytics', icon: BarChart3, path: '/dashboard/analytics' },
  { key: 'settings', icon: Settings, path: '/dashboard/settings' }
];

export function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isRtl = document.documentElement.dir === 'rtl';

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 w-60 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
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
                  } ${isRtl ? 'flex-row-reverse' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`h-5 w-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                  {t(`dashboard.${item.key}`, item.key)}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="px-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-start px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                onClick={handleLogout}
              >
                <LogOut className={`h-5 w-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                {t('auth.logout')}
              </Button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className={`flex-1 ${isRtl ? 'lg:mr-1' : 'lg:ml-1'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 w-full">
          <div className="app-container flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className={`lg:hidden ${isRtl ? 'ml-2' : 'mr-2'}`}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashboard.welcome')}{displayName ? `, ${displayName}` : ''}
              </h2>
            </div>
            <div className={`flex items-center ${isRtl ? 'gap-4' : 'gap-4'} relative`}>
              <LanguageToggle />
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
                  className={`absolute z-50 top-full mt-2 ${isRtl ? 'right-0' : 'left-auto right-0'} w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden`}
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
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 py-6">
          <div className="app-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}