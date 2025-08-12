import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthProvider';
import { StoreProvider } from './contexts/StoreProvider';
import { CartProvider } from './contexts/CartProvider';

import { useAuth } from './hooks/useAuth';

// Layouts
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { StorefrontLayout } from './components/Layout/StorefrontLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Dashboard Pages
import { DashboardEntry } from './pages/dashboard/DashboardEntry';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { OrdersPage } from './pages/dashboard/OrdersPage';
import { StoreSettingsPage } from './pages/dashboard/StoreSettingsPage';
import { CustomizePage } from './pages/dashboard/CustomizePage';
import { AnalyticsPage } from './pages/dashboard/AnalyticsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';

// Storefront Pages
import { StorefrontHome } from './pages/storefront/StorefrontHome';
import { CartPage } from './pages/storefront/CartPage';
import { ProductDetailsPage } from './pages/storefront/ProductDetailsPage';
import { CategoriesPage } from './pages/storefront/CategoriesPage';
import { CheckoutPage } from './pages/storefront/CheckoutPage';
import { OrderSuccessPage } from './pages/storefront/OrderSuccessPage';
import { SearchPage } from './pages/storefront/SearchPage';
import LandingPage from './pages/landing/LandingPage';

import './i18n';

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

function AppContent() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set document direction based on language
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
          </Route>

          {/* Public Storefront Routes */}
          <Route path="/store/:slug" element={
            <CartProvider>
              <StorefrontLayout />
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

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
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