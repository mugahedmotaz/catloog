export interface User {
  id: string;
  email: string;
  name: string;
  role: 'merchant' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  whatsappNumber: string;
  merchantId: string;
  theme: StoreTheme;
  settings: StoreSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

export interface StoreSettings {
  currency: string;
  language: 'en' | 'ar';
  allowDelivery: boolean;
  deliveryFee: number;
  minimumOrder: number;
  orderMessageTemplate: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  // New relational link to categories table
  categoryId: string | null;
  isAvailable: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}