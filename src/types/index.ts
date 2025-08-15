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
  // Optional UI/appearance controls
  cornerRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  buttonRoundness?: 'sm' | 'md' | 'lg' | 'full';
  productCardVariant?: 'minimal' | 'bordered' | 'shadow';
  productGridColsMd?: number; // e.g. 2..4
  productGridColsLg?: number; // e.g. 3..6
  headerStyle?: 'simple' | 'centered' | 'split';
  // Storefront sections toggles/content
  heroEnabled?: boolean;
  heroBackgroundImage?: string;
  announcementEnabled?: boolean;
  announcementText?: string;
  trustBadgesEnabled?: boolean;
  featuredEnabled?: boolean;
  newsletterEnabled?: boolean;
  useRoundedImages?: boolean;
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
  // Optional commerce fields (safe defaults)
  sku?: string;
  stock?: number; // total stock when no variants
  compareAtPrice?: number | null; // for showing discount badges
  hasVariants?: boolean; // true if product uses variants instead of simple stock
  averageRating?: number; // 0..5
  reviewsCount?: number; // aggregated count
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

// Variants & Options
export interface VariantOption {
  id: string;
  productId: string;
  // e.g. "Size" | "Color"
  name: string;
  // allowed values for this option, e.g. ["S","M","L"] or ["Red","Blue"]
  values: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// A concrete sellable variant (combination of option values)
export interface ProductVariant {
  id: string;
  productId: string;
  // key-value pairs for option selections, e.g. { Size: "M", Color: "Red" }
  selections: Record<string, string>;
  sku?: string;
  price?: number; // if undefined, fallback to product.price
  compareAtPrice?: number | null;
  stock: number; // stock per variant
  images?: string[]; // variant-specific images
  createdAt: Date;
  updatedAt: Date;
}

// Attributes (structured specs) for products
export interface Attribute {
  id: string;
  name: string; // e.g. "Material", "Brand"
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
  allowedValues?: string[]; // for select types
  createdAt: Date;
  updatedAt: Date;
}

export interface AttributeValue {
  id: string;
  attributeId: string;
  value: string; // stored as string, interpreted by type
}

export interface ProductAttribute {
  id: string;
  productId: string;
  attributeId: string;
  value: string; // normalized string value for filtering
}

// Reviews
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number; // 1..5
  comment?: string;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Wishlist
export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

// Coupons
export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage 0..100 or fixed amount in store currency units
  minSubtotal?: number;
  maxDiscount?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null; // total usages allowed
  perUserLimit?: number | null;
  active: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  userId: string;
  usedAt: Date;
}

// Subscription Plans
export interface Plan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number | null;
  currency: string; // e.g. USD, SAR
  productLimit?: number | null; // null -> unlimited
  variantLimit?: number | null;
  storageMb?: number | null;
  features?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  storeId: string;
  planId: string;
  period: 'monthly' | 'yearly';
  startsAt: Date;
  endsAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}