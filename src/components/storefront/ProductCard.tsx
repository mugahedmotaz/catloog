import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, ShoppingCart, Heart, HeartOff } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import type { Product } from '../../types';
import { useWishlist } from '../../contexts/WishlistProvider';

interface Props {
  product: Product;
  categoryName?: string;
  storeSlug: string;
  currency: string;
  primaryColor: string;
  onAddToCart: (product: Product) => void;
}

function ProductCardBase({ product, categoryName, storeSlug, currency, primaryColor, onAddToCart }: Props) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wished = isWishlisted(product.id);
  return (
    <Card
      className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ willChange: 'transform' }}
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-slate-50">
        <img
          src={product.images?.[0] || 'https://placehold.co/800x600'}
          alt={product.name}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {/* Category badge */}
        {categoryName && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 h-6 rounded-full bg-white/90 text-slate-700 text-xs font-medium shadow-sm">
              {categoryName}
            </span>
          </div>
        )}
        {/* New badge if created within 21 days */}
        {(() => {
          const created = (product as any).createdAt as Date;
          const days = (Date.now() - new Date(created).getTime()) / 86400000;
          return days <= 21 ? (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center px-2.5 h-6 rounded-full bg-teal-600 text-white text-xs font-medium shadow-sm">New</span>
            </div>
          ) : null;
        })()}
        {/* Overlay actions */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="pointer-events-auto flex items-center justify-between">
            <button
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={() => toggleWishlist(product.id)}
              className={`inline-flex items-center gap-2 px-3 h-9 rounded-full text-xs font-medium shadow-sm transition ${wished ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-white/90 hover:bg-white text-slate-900'}`}
            >
              {wished ? <Heart className="h-4 w-4" /> : <HeartOff className="h-4 w-4" />}
              {wished ? 'Wishlisted' : 'Wishlist'}
            </button>
            <Link
              to={`/store/${storeSlug}/product/${product.id}`}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 text-xs font-medium shadow-sm"
            >
              <Eye className="h-4 w-4" /> Quick view
            </Link>
          </div>
        </div>
      </div>
      <CardContent className="p-4 sm:p-5 border-t border-slate-100">
        <h3 className="font-semibold text-slate-900 tracking-tight mb-1 line-clamp-2 text-base sm:text-lg">
          {product.name}
        </h3>
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
          {product.description || ''}
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-lg sm:text-xl font-bold" style={{ color: primaryColor }}>
            {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(product.price)}
          </span>
          <Button
            size="sm"
            onClick={() => onAddToCart(product)}
            className="text-white rounded-lg px-3 w-full sm:w-auto text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function areEqual(prev: Props, next: Props) {
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.name === next.product.name &&
    prev.product.images?.[0] === next.product.images?.[0] &&
    prev.categoryName === next.categoryName &&
    prev.currency === next.currency &&
    prev.primaryColor === next.primaryColor &&
    prev.storeSlug === next.storeSlug
  );
}

export const ProductCard = React.memo(ProductCardBase, areEqual);
