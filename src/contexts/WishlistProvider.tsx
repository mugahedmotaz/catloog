import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import type { WishlistItem } from '../types';
import toast from 'react-hot-toast';

interface WishlistContextType {
  items: WishlistItem[];
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) { setItems([]); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped: WishlistItem[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        createdAt: new Date(row.created_at),
      }));
      setItems(mapped);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error loading wishlist:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isWishlisted = useCallback((productId: string) => {
    return items.some(i => i.productId === productId);
  }, [items]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!user?.id) {
      toast.error('Please log in to use wishlist');
      return;
    }
    const exists = items.find(i => i.productId === productId);
    // Optimistic update
    if (exists) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      const { error } = await supabase.from('wishlists').delete().eq('id', exists.id);
      if (error) {
        // rollback
        setItems(prev => [exists, ...prev]);
        toast.error('Failed to remove from wishlist');
      } else {
        toast.success('Removed from wishlist');
      }
    } else {
      const optimistic: WishlistItem = {
        id: `optimistic-${productId}`,
        userId: user.id,
        productId,
        createdAt: new Date(),
      };
      setItems(prev => [optimistic, ...prev]);
      const { data, error } = await supabase
        .from('wishlists')
        .insert({ user_id: user.id, product_id: productId })
        .select('*')
        .single();
      if (error) {
        setItems(prev => prev.filter(i => i.id !== optimistic.id));
        toast.error('Failed to add to wishlist');
      } else {
        const real: WishlistItem = {
          id: data.id,
          userId: data.user_id,
          productId: data.product_id,
          createdAt: new Date(data.created_at),
        };
        setItems(prev => [real, ...prev.filter(i => i.id !== optimistic.id)]);
        toast.success('Added to wishlist');
      }
    }
  }, [items, user?.id]);

  const value = useMemo(() => ({ items, isLoading, isWishlisted, toggleWishlist, refresh }), [items, isLoading, isWishlisted, toggleWishlist, refresh]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
