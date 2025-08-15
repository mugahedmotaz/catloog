import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthProvider';
import { AdminAuthProvider } from './contexts/AdminAuthProvider';
import { StoreProvider } from './contexts/StoreProvider';
import { CartProvider } from './contexts/CartProvider';
import { WishlistProvider } from './contexts/WishlistProvider';

import { useAuth } from './hooks/useAuth';
// import { useIsAdmin } from './hooks/useIsAdmin'; // no longer used for admin area
import { useAdminIsAdmin } from './hooks/useAdminIsAdmin';
import { useAdminAuth } from './contexts/AdminAuthProvider';

// Layouts
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { AdminLayout } from './components/Layout/AdminLayout';
import { StorefrontLayout } from './components/Layout/StorefrontLayout';

// Auth Pages (lazy)
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));

// Dashboard Pages (lazy)
const DashboardEntry = lazy(() => import('./pages/dashboard/DashboardEntry').then(m => ({ default: m.DashboardEntry })));
const ProductsPage = lazy(() => import('./pages/dashboard/ProductsPage').then(m => ({ default: m.ProductsPage })));
const OrdersPage = lazy(() => import('./pages/dashboard/OrdersPage').then(m => ({ default: m.OrdersPage })));
const StoreSettingsPage = lazy(() => import('./pages/dashboard/StoreSettingsPage').then(m => ({ default: m.StoreSettingsPage })));
const CustomizePage = lazy(() => import('./pages/dashboard/CustomizePage').then(m => ({ default: m.CustomizePage })));
const AnalyticsPage = lazy(() => import('./pages/dashboard/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DashboardCategoriesPage = lazy(() => import('./pages/dashboard/CategoriesPage').then(m => ({ default: m.default })));
const UpgradePlanPage = lazy(() => import('./pages/dashboard/UpgradePlanPage').then(m => ({ default: m.UpgradePlanPage })));
const BillingPage = lazy(() => import('./pages/dashboard/BillingPage').then(m => ({ default: m.BillingPage })));

// Storefront Pages (lazy)
const StorefrontHome = lazy(() => import('./pages/storefront/StorefrontHome').then(m => ({ default: m.StorefrontHome })));
const CartPage = lazy(() => import('./pages/storefront/CartPage').then(m => ({ default: m.CartPage })));
const ProductDetailsPage = lazy(() => import('./pages/storefront/ProductDetailsPage').then(m => ({ default: m.ProductDetailsPage })));
const CategoriesPage = lazy(() => import('./pages/storefront/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const CheckoutPage = lazy(() => import('./pages/storefront/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderSuccessPage = lazy(() => import('./pages/storefront/OrderSuccessPage'));
const SearchPage = lazy(() => import('./pages/storefront/SearchPage').then(m => ({ default: m.SearchPage })));
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
// Admin Pages (lazy)
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage'));
const AdminStoresPage = lazy(() => import('./pages/admin/AdminStoresPage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));

// i18n removed: English-only app

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  // Admin-scoped guard using admin auth context
  const { user } = useAdminAuth();
  const { isAdmin, loading } = useAdminIsAdmin();
  const ADMIN_EMAIL = (import.meta as any).env?.VITE_ADMIN_EMAIL as string | undefined;
  const ADMIN_DOMAIN = (import.meta as any).env?.VITE_ADMIN_DOMAIN as string | undefined;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p>Checking admin…</p>
        </div>
      </div>
    );
  }
  const emailOk = ADMIN_EMAIL ? (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) : true;
  const domainOk = ADMIN_DOMAIN ? (user?.email?.split('@')[1]?.toLowerCase() === ADMIN_DOMAIN.toLowerCase()) : true;
  return (isAdmin && emailOk && domainOk) ? <>{children}</> : <Navigate to="/admin/login" />;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/admin/login" />;
}

function AppContent() {
  return (
    <Router>
      <div className="App">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Admin Auth */}
          <Route path="/admin/login" element={
            <AdminAuthProvider>
              <AdminLoginPage />
            </AdminAuthProvider>
          } />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardEntry />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="onboarding" element={<Navigate to="/dashboard/store" replace />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="store" element={<StoreSettingsPage />} />
            <Route path="customize" element={<CustomizePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="categories" element={<DashboardCategoriesPage />} />
            <Route path="upgrade" element={<UpgradePlanPage />} />
            <Route path="billing" element={<BillingPage />} />
            {/* Admin routes moved to /admin area */}
          </Route>

          {/* Dedicated Admin area */}
          <Route path="/admin" element={
            <AdminAuthProvider>
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            </AdminAuthProvider>
          }>
            <Route index element={<Navigate to="/admin/plans" replace />} />
            <Route path="plans" element={
              <AdminRoute>
                <AdminPlansPage />
              </AdminRoute>
            } />
            <Route path="stores" element={
              <AdminRoute>
                <AdminStoresPage />
              </AdminRoute>
            } />
            <Route path="payments" element={
              <AdminRoute>
                <AdminPaymentsPage />
              </AdminRoute>
            } />
          </Route>

          {/* Public Storefront Routes */}
          <Route path="/store/:slug" element={
            <CartProvider>
              <WishlistProvider>
                <StorefrontLayout />
              </WishlistProvider>
            </CartProvider>
          }>
            <Route index element={<StorefrontHome />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="success" element={<OrderSuccessPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="product/:productId" element={<ProductDetailsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="*" element={<div className="p-8">Not Found</div>} />
          </Route>

          {/* Public Landing */}
          <Route path="/" element={<LandingPage />} />
        </Routes>
        </Suspense>

        <Toaster
          position="top-right"
          gutter={8}
          containerStyle={{ top: 12, right: 12 }}
          toastOptions={{
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;