export const FEATURES = {
  categories: 'categories',
  products: 'products',
  themeCustomization: 'theme_customization',
  orders: 'orders',
  analytics: 'analytics',
  advancedSettings: 'advanced_settings',
  payments: 'payments',
  customDomain: 'custom_domain',
} as const;

export type FeatureKey = keyof typeof FEATURES;
export type FeatureValue = (typeof FEATURES)[FeatureKey];
