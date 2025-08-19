import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Store, Product, Category, Order } from '../types';
import { supabase } from '../services/supabase';

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  createStore: (storeData: Partial<Store>) => Promise<boolean>;
  updateStore: (storeId: string, storeData: Partial<Store>) => Promise<boolean>;
  deleteStore: (storeId: string) => Promise<boolean>;
  softDeleteStore: (storeId: string) => Promise<boolean>;
  restoreStore: (storeId: string) => Promise<boolean>;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateProduct: (productId: string, productData: Partial<Product>) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  addCategory: (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateCategory: (categoryId: string, categoryData: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  getStoreBySlug: (slug: string) => Promise<Store | null>;
  getStoreByDomain: (domain: string) => Promise<Store | null>;
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>;
  searchStores: (query: string, opts?: { preferStoreId?: string; limit?: number }) => Promise<Store[]>;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helpers to map DB rows to app types
  const mapStore = (row: any): Store => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? undefined,
    description: row.description ?? undefined,
    whatsappNumber: row.whatsapp_number,
    merchantId: row.merchant_id,
    theme: row.theme,
    settings: row.settings,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });

  const mapProduct = (row: any): Product => {
    // Prefer relational category_id if present; as a fallback, try to resolve by name
    let categoryId: string | null = row.category_id ?? null;
    if (!categoryId && row.category && Array.isArray(categories)) {
      const byName = categories.find(c => c.name === row.category && c.storeId === row.store_id);
      categoryId = byName ? byName.id : null;
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      images: row.images ?? [],
      categoryId,
      isAvailable: row.is_available,
      storeId: row.store_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  };

  const softDeleteStore = async (storeId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .update({ is_active: false })
        .eq('id', storeId)
        .select('*')
        .single();
      if (error) throw error;
      const updated = mapStore(data);
      setStores(prev => prev.map(s => (s.id === storeId ? updated : s)));
      if (currentStore?.id === storeId) setCurrentStore(updated);
      toast.success('Store deactivated (soft deleted)');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error soft-deleting store:', error);
      toast.error('Failed to deactivate store');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restoreStore = async (storeId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .update({ is_active: true })
        .eq('id', storeId)
        .select('*')
        .single();
      if (error) throw error;
      const updated = mapStore(data);
      setStores(prev => prev.map(s => (s.id === storeId ? updated : s)));
      if (currentStore?.id === storeId) setCurrentStore(updated);
      toast.success('Store reactivated');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error restoring store:', error);
      toast.error('Failed to reactivate store');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStore = async (storeId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Delete dependent records first (if no ON DELETE CASCADE in DB)
      const dels = [
        supabase.from('orders').delete().eq('store_id', storeId),
        supabase.from('products').delete().eq('store_id', storeId),
        supabase.from('categories').delete().eq('store_id', storeId),
      ];
      for (const p of dels) {
        const { error } = await p;
        if (error && error.code !== 'PGRST116') throw error; // ignore no rows
      }
      // Finally delete the store row
      const { error: storeErr } = await supabase.from('stores').delete().eq('id', storeId);
      if (storeErr) throw storeErr;
      // Update local state
      setStores(prev => prev.filter(s => s.id !== storeId));
      if (currentStore?.id === storeId) {
        setCurrentStore(() => {
          const remaining = stores.filter(s => s.id !== storeId);
          return remaining[0] ?? null;
        });
        setProducts([]);
        setCategories([]);
        setOrders([]);
      }
      toast.success('Store deleted permanently');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const mapCategory = (row: any): Category => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    storeId: row.store_id,
    order: row.order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });

  const mapOrder = (row: any): Order => ({
    id: row.id,
    orderNumber: row.order_number,
    items: row.items ?? [],
    total: Number(row.total),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    notes: row.notes ?? undefined,
    status: row.status,
    storeId: row.store_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });

  // Slug utilities to ensure uniqueness across stores
  const RESERVED_SLUGS = new Set([
    'admin', 'api', 'auth', 'dashboard', 'manage', 'settings', 'login', 'signup', 'store', 'stores', 'system'
  ]);
  const slugify = (input: string): string => {
    return (input || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  };

  const isSlugTaken = async (slug: string, excludeId?: string): Promise<boolean> => {
    // Fetch minimal data (id only) and at most 1 row for performance
    let query = supabase.from('stores').select('id').eq('slug', slug).limit(1);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  };

  const ensureUniqueSlug = async (base: string, excludeId?: string): Promise<string> => {
    const normalized = slugify(base) || 'store';
    const baseSlug = RESERVED_SLUGS.has(normalized) ? `${normalized}-shop` : normalized;
    let candidate = baseSlug;
    let suffix = 1;
    while (RESERVED_SLUGS.has(candidate) || (await isSlugTaken(candidate, excludeId))) {
      candidate = `${baseSlug}-${suffix++}`;
    }
    return candidate;
  };

  // Initial load: fetch user's stores only and set currentStore
  useEffect(() => {
    const loadStoresForUser = async () => {
      setIsLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id;
        const storesRes = uid
          ? await supabase.from('stores').select('*').eq('merchant_id', uid)
          : await supabase.from('stores').select('*').limit(0); // no user → no stores
        if (storesRes.error) throw storesRes.error;
        const storesData = (storesRes.data || []).map(mapStore);
        setStores(storesData);
        setCurrentStore(storesData[0] ?? null);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading stores from Supabase:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoresForUser();
  }, []);

  // Load products/categories/orders when currentStore changes
  useEffect(() => {
    const loadScopedData = async () => {
      if (!currentStore?.id) {
        setProducts([]);
        setCategories([]);
        setOrders([]);
        return;
      }
      setIsLoading(true);
      try {
        const [productsRes, categoriesRes, ordersRes] = await Promise.all([
          supabase.from('products').select('*').eq('store_id', currentStore.id),
          supabase.from('categories').select('*').eq('store_id', currentStore.id),
          supabase.from('orders').select('*').eq('store_id', currentStore.id),
        ]);
        if (productsRes.error) throw productsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (ordersRes.error) throw ordersRes.error;
        const cats = (categoriesRes.data || []).map(mapCategory);
        setCategories(cats);
        // map products with access to cats to resolve legacy name -> id if needed
        const prods = (productsRes.data || []).map((row: any) => {
          let categoryId: string | null = row.category_id ?? null;
          if (!categoryId && row.category) {
            const byName = cats.find((c: Category) => c.name === row.category && c.storeId === row.store_id);
            categoryId = byName ? byName.id : null;
          }
          return {
            id: row.id,
            name: row.name,
            description: row.description,
            price: Number(row.price),
            images: row.images ?? [],
            categoryId,
            isAvailable: row.is_available,
            storeId: row.store_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
          } as Product;
        });
        setProducts(prods);
        setOrders((ordersRes.data || []).map(mapOrder));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading scoped data from Supabase:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadScopedData();
  }, [currentStore?.id]);

  const createOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const payload = {
        order_number: order.orderNumber,
        items: order.items,
        total: order.total,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        notes: order.notes ?? null,
        status: order.status,
        store_id: order.storeId,
      };
      const { data, error } = await supabase.from('orders').insert(payload).select('*').single();
      if (error) throw error;
      const created = mapOrder(data);
      setOrders(prev => [created, ...prev]);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating order:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select('*')
        .single();
      if (error) throw error;
      const updated = mapOrder(data);
      setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating order status:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const createStore = async (storeData: Partial<Store>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const merchantId = userRes.user?.id;
      // Plan-based limit: prevent creating more stores than allowed
      const planKey = ((currentStore as any)?.settings?.plan || (currentStore as any)?.plan || 'free') as string;
      const storesLimitMap: Record<string, number> = { free: 1, pro: 3, business: 10 };
      const maxStores = storesLimitMap[planKey.toLowerCase()] ?? 1;
      const ownedStoresCount = stores.filter(s => s.merchantId === merchantId).length;
      if (ownedStoresCount >= maxStores) {
        toast.error(`خُطتك الحالية (${planKey}) تسمح بعدد ${maxStores} متجر${maxStores > 1 ? 's' : ''}. قم بالترقية لإنشاء متاجر إضافية.`);
        return false;
      }
      // Compute a unique slug from provided slug or name
      const desiredBase = (storeData.slug || storeData.name || 'store') as string;
      const uniqueSlug = await ensureUniqueSlug(desiredBase);
      // Prevent duplicate name for the same merchant (case-insensitive)
      if (storeData.name && merchantId) {
        const { data: dupNameData, error: dupNameErr } = await supabase
          .from('stores')
          .select('id')
          .eq('merchant_id', merchantId)
          .ilike('name', storeData.name);
        if (dupNameErr) throw dupNameErr;
        if (Array.isArray(dupNameData) && dupNameData.length > 0) {
          toast.error('يوجد متجر بنفس الاسم. يرجى اختيار اسم آخر');
          return false;
        }
      }
      const payload = {
        name: storeData.name,
        slug: uniqueSlug,
        description: storeData.description ?? null,
        logo: storeData.logo ?? null,
        whatsapp_number: storeData.whatsappNumber,
        merchant_id: merchantId,
        theme: storeData.theme,
        settings: storeData.settings,
        is_active: storeData.isActive ?? true,
      };
      // Try insert; on a very rare race, retry once with a new unique slug
      let insertRes = await supabase.from('stores').insert(payload).select('*').single();
      if (insertRes.error && (insertRes.error as any)?.code === '23505') {
        const retrySlug = await ensureUniqueSlug(`${uniqueSlug}-${Math.floor(Math.random() * 1000) + 1}`);
        insertRes = await supabase
          .from('stores')
          .insert({ ...payload, slug: retrySlug })
          .select('*')
          .single();
      }
      const { data, error } = insertRes;
      if (error) throw error;
      const created = mapStore(data);
      setStores(prev => [...prev, created]);
      setCurrentStore(created);
      return true;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error creating store:', error);
      const message: string = error?.message || '';
      // Handle unique constraint violation (e.g., duplicate slug)
      if (error?.code === '23505' || /duplicate key value/i.test(message) || /unique constraint/i.test(message)) {
        toast.error('Name/slug is already in use. Please choose another');
      } else {
        toast.error(message || 'Failed to create store');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateStore = async (storeId: string, storeData: Partial<Store>): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Get current user (merchant) to validate name uniqueness per merchant
      const { data: userRes } = await supabase.auth.getUser();
      const merchantId = userRes.user?.id;
      // If slug provided, ensure uniqueness (excluding current store)
      const nextSlug = typeof storeData.slug === 'string' && storeData.slug?.trim()
        ? await ensureUniqueSlug(storeData.slug, storeId)
        : undefined;
      // Prevent duplicate name for the same merchant (case-insensitive), excluding current store
      if (storeData.name && merchantId) {
        let query = supabase
          .from('stores')
          .select('id')
          .eq('merchant_id', merchantId)
          .ilike('name', storeData.name)
          .neq('id', storeId)
          .limit(1);
        const { data: dupNameData, error: dupNameErr } = await query;
        if (dupNameErr) throw dupNameErr;
        if (Array.isArray(dupNameData) && dupNameData.length > 0) {
          toast.error('يوجد متجر بنفس الاسم. يرجى اختيار اسم آخر');
          return false;
        }
      }
      // Build dynamic payload without undefined keys
      const payload: Record<string, any> = {};
      if (typeof storeData.name !== 'undefined') payload.name = storeData.name;
      if (typeof nextSlug !== 'undefined') payload.slug = nextSlug;
      if ('description' in storeData) payload.description = storeData.description ?? null;
      if ('logo' in storeData) payload.logo = storeData.logo ?? null;
      if ('whatsappNumber' in storeData) payload.whatsapp_number = storeData.whatsappNumber;
      if ('theme' in storeData) payload.theme = storeData.theme;
      if ('settings' in storeData) payload.settings = storeData.settings;
      if ('isActive' in storeData) payload.is_active = storeData.isActive;
      const { data, error } = await supabase
        .from('stores')
        .update(payload)
        .eq('id', storeId)
        .select('*')
        .single();
      if (error) throw error;
      const updated = mapStore(data);
      setStores(prev => prev.map(store => (store.id === storeId ? updated : store)));
      if (currentStore?.id === storeId) setCurrentStore(updated);
      return true;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error updating store:', error);
      const message: string = error?.message || '';
      if (error?.code === '23505' || /duplicate key value/i.test(message) || /unique constraint/i.test(message)) {
        toast.error('Name/slug is already in use. Please choose another');
      } else {
        toast.error(message || 'Failed to update store settings');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const payload = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        images: productData.images,
        // new relational column
        category_id: productData.categoryId,
        is_available: productData.isAvailable,
        store_id: productData.storeId,
      };
      const { data, error } = await supabase.from('products').insert(payload).select('*').single();
      if (error) throw error;
      const created = mapProduct(data);
      setProducts(prev => [...prev, created]);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error adding product:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (productId: string, productData: Partial<Product>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const payload = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        images: productData.images,
        category_id: productData.categoryId,
        is_available: productData.isAvailable,
      };
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productId)
        .select('*')
        .single();
      if (error) throw error;
      const updated = mapProduct(data);
      setProducts(prev => prev.map(p => (p.id === productId ? updated : p)));
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating product:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (productId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setProducts(prev => prev.filter(product => product.id !== productId));
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting product:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const payload = {
        name: categoryData.name,
        description: categoryData.description ?? null,
        store_id: categoryData.storeId,
        order: categoryData.order,
      };
      const { data, error } = await supabase.from('categories').insert(payload).select('*').single();
      if (error) throw error;
      const created = mapCategory(data);
      setCategories(prev => [...prev, created]);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error adding category:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Category>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const payload = {
        name: categoryData.name,
        description: categoryData.description ?? null,
        order: categoryData.order,
      };
      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', categoryId)
        .select('*')
        .single();
      if (error) throw error;
      const updated = mapCategory(data);
      setCategories(prev => prev.map(c => (c.id === categoryId ? updated : c)));
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating category:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      setCategories(prev => prev.filter(category => category.id !== categoryId));
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting category:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getStoreBySlug = async (slug: string): Promise<Store | null> => {
    const { data, error } = await supabase.from('stores').select('*').eq('slug', slug).single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching store by slug:', error);
      return null;
    }
    return mapStore(data);
  };

  const getStoreByDomain = async (domain: string): Promise<Store | null> => {
    const d = (domain || '').trim().toLowerCase();
    if (!d) return null;
    // Match exact customDomain stored in settings (precise JSON path equality)
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('settings->>customDomain', d)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching store by domain:', error);
      return null;
    }
    return mapStore(data);
  };

  const searchStores = async (
    query: string,
    opts?: { preferStoreId?: string; limit?: number }
  ): Promise<Store[]> => {
    const q = (query || '').trim();
    if (!q) return [];
    // Build OR filter for name/slug ilike
    const pattern = `%${q}%`;
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id || null;
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(Math.max(1, opts?.limit || 25));
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error searching stores:', error);
      return [];
    }
    const rows = (data || []).map(mapStore);
    // Sort: preferred store first, then current user's stores, then startsWith matches, then includes, then recent
    const lowerQ = q.toLowerCase();
    const score = (s: Store): number => {
      if (opts?.preferStoreId && s.id === opts.preferStoreId) return 0;
      if (uid && s.merchantId === uid) return 1;
      const name = (s.name || '').toLowerCase();
      const slug = (s.slug || '').toLowerCase();
      if (name.startsWith(lowerQ) || slug.startsWith(lowerQ)) return 2;
      if (name.includes(lowerQ) || slug.includes(lowerQ)) return 3;
      return 4;
    };
    return rows.sort((a: Store, b: Store) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  };

  const value: StoreContextType = {
    currentStore,
    stores,
    products,
    categories,
    orders,
    createStore,
    updateStore,
    deleteStore,
    softDeleteStore,
    restoreStore,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    getStoreBySlug,
    searchStores,
    getStoreByDomain,
    createOrder,
    updateOrderStatus,
    isLoading
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}