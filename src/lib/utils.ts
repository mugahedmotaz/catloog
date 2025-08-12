import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number, currency?: string) {
  const amount = Number.isFinite(Number(price)) ? Number(price) : 0;
  const cur = currency || 'USD';
  // Try to use the user's locale if available, fallback to en-US
  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback plain formatting
    return `${cur} ${amount.toFixed(2)}`;
  }
}

export function generateStoreSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}