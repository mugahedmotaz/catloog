import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Building2, LogOut, Menu, X, Receipt } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthProvider';
import { Button } from '../ui/button';
import Logo from '../../components/Logo';
import { getDisplayName } from '../../lib/auth';
 

export function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar on Escape and lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    document.documentElement.classList.add('overflow-hidden');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, [sidebarOpen]);

  const displayName = getDisplayName(user as any);

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-white shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out lg:static lg:block h-screen flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Logo responsive preset="lg" rounded="xl" alt="Catloog" />
            <h1 className="text-xl font-bold text-gray-900">Admin</h1>
          </div>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8 flex-1 overflow-y-auto">
          <div className="px-4 space-y-2">
            <NavLink
              to="/admin/plans"
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-current={location.pathname === '/admin/plans' ? 'page' : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              <Shield className="h-5 w-5 mr-3" /> Plans
            </NavLink>
            <NavLink
              to="/admin/stores"
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-current={location.pathname === '/admin/stores' ? 'page' : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              <Building2 className="h-5 w-5 mr-3" /> Stores
            </NavLink>
            <NavLink
              to="/admin/payments"
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-current={location.pathname === '/admin/payments' ? 'page' : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              <Receipt className="h-5 w-5 mr-3" /> Payments
            </NavLink>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="px-4">
              <Button
                variant="ghost"
                className="flex items-center bg-red-600 w-full justify-start text-sm font-medium text-white hover:bg-red-700"
                onClick={async () => { await logout(); navigate('/admin/login'); }}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Log out
              </Button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-1 h-screen flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 w-full">
          <div className="app-container flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="lg:hidden mr-2" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900">Admin{displayName ? ` · ${displayName}` : ''}</h2>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto py-6">
          <div className="app-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
