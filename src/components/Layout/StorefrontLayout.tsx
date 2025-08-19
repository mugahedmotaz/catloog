import React, { useEffect, useState } from 'react';
import { Outlet, Link, useParams } from 'react-router-dom';
import { ShoppingCart, Menu, X, MessageCircle } from 'lucide-react';
import { useStore } from '../../contexts/StoreProvider';
import type { Store } from '../../types';
import { useCart } from '../../contexts/CartProvider';
import { Button } from '../ui/button';
import { generateWhatsAppUrl } from '../../lib/utils';
import SEO from '../SEO';

export function StorefrontLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { getStoreBySlug } = useStore();
  const { totalItems } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    if (slug) {
      getStoreBySlug(slug)
        .then((s) => { if (mounted) setStore(s ?? null); })
        .finally(() => { if (mounted) setIsLoading(false); });
    } else {
      setStore(null);
      setIsLoading(false);
    }
    return () => { mounted = false; };
  }, [slug, getStoreBySlug]);

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

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store not found</h1>
          <p className="text-gray-600">The store you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const whatsappUrl = generateWhatsAppUrl(
    store.whatsappNumber,
    `Hi! I'm interested in your products from ${store.name}`
  );

  return (
    <div className="min-h-screen bg-gray-50" 
         style={{ 
           '--primary': store.theme.primaryColor,
           '--secondary': store.theme.secondaryColor,
           '--accent': store.theme.accentColor,
           '--background': store.theme.backgroundColor,
           '--text': store.theme.textColor,
         } as React.CSSProperties}>
      <SEO
        title={`${store.name} – Online Store`}
        description={store.description || `Browse products from ${store.name}`}
        canonical={typeof window !== 'undefined' ? window.location.href : undefined}
        image={store.logo || undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: store.name,
          description: store.description || undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          logo: store.logo || undefined,
          sameAs: store.whatsappNumber ? [
            `https://wa.me/${store.whatsappNumber.replace(/[^\d]/g, '')}`
          ] : undefined,
        }}
      />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="app-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Store Name */}
            <div className="flex items-center">
              <Link to={`/store/${slug}`} className="flex items-center space-x-3">
                {store.logo && (
                  <img 
                    src={store.logo} 
                    alt={store.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                )}
                <span className="text-xl font-bold" style={{ color: store.theme.primaryColor }}>
                  {store.name}
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                to={`/store/${slug}`}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                All products
              </Link>
              <Link 
                to={`/store/${slug}/categories`}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Categories
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Contact us
              </a>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              
              {/* Cart */}
              <Link to={`/store/${slug}/cart`} className="relative">
                <Button variant="ghost" size="sm" className="flex items-center">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-white z-50 md:hidden">
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <span className="text-lg font-semibold">{store.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="p-4 space-y-4">
              <Link
                to={`/store/${slug}`}
                className="block py-3 text-base font-medium text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                All products
              </Link>
              <Link
                to={`/store/${slug}/categories`}
                className="block py-3 text-base font-medium text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                Categories
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center py-3 text-base font-medium text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                <MessageCircle className="h-5 w-5 mr-3" />
                Contact us
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 section">
        <div className="app-container">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 section">
        <div className="app-container py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {store.name}
            </h3>
            {store.description && (
              <p className="text-gray-600 mb-4">{store.description}</p>
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: store.theme.primaryColor }}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Contact us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}