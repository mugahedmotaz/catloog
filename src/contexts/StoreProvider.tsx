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
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateProduct: (productId: string, productData: Partial<Product>) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  addCategory: (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateCategory: (categoryId: string, categoryData: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  getStoreBySlug: (slug: string) => Promise<Store | null>;
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>;
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
            const byName = cats.find(c => c.name === row.category && c.storeId === row.store_id);
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
      const payload = {
        name: storeData.name,
        slug: storeData.slug,
        description: storeData.description ?? null,
        logo: storeData.logo ?? null,
        whatsapp_number: storeData.whatsappNumber,
        merchant_id: merchantId,
        theme: storeData.theme,
        settings: storeData.settings,
        is_active: storeData.isActive ?? true,
      };
      const { data, error } = await supabase.from('stores').insert(payload).select('*').single();
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
        toast.error('الاسم/الرابط مستخدم بالفعل، الرجاء اختيار اسم آخر');
      } else {
        toast.error(message || 'فشل إنشاء المتجر');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateStore = async (storeId: string, storeData: Partial<Store>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const payload = {
        name: storeData.name,
        slug: storeData.slug,
        description: storeData.description ?? null,
        logo: storeData.logo ?? null,
        whatsapp_number: storeData.whatsappNumber,
        theme: storeData.theme,
        settings: storeData.settings,
        is_active: storeData.isActive,
      };
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
        toast.error('الاسم/الرابط مستخدم بالفعل، الرجاء اختيار اسم آخر');
      } else {
        toast.error(message || 'فشل تحديث بيانات المتجر');
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

  const value: StoreContextType = {
    currentStore,
    stores,
    products,
    categories,
    orders,
    createStore,
    updateStore,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    getStoreBySlug,
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