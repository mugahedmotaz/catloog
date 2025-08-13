import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, MessageCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { useStore } from '../../contexts/StoreProvider';
import { useCart } from '../../contexts/CartProvider';
import { formatPrice, generateWhatsAppUrl } from '../../lib/utils';

export function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentStore, categories } = useStore();
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(productId, newQuantity);
  };

  const handleCheckout = () => {
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    if (!currentStore) return;

    // Build order details
    const orderDetails = items.map(item => 
      `• ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, currentStore.settings.currency)}`
    ).join('\n');

    const dateStr = new Date().toLocaleString();
    const professionalDefault = [
      `Hello ${currentStore.name} team 👋`,
      'A new order has been received ✅',
      `Date: ${dateStr}`,
      '—',
      'Customer Info:',
      `• Name: ${customerInfo.name}`,
      `• Phone: ${customerInfo.phone}`,
      '—',
      'Cart Details:',
      `${orderDetails}`,
      '—',
      `Total: ${formatPrice(totalPrice, currentStore.settings.currency)}`,
      `Notes: ${customerInfo.notes || 'No notes'}`,
      '—',
      `Store link: ${window.location.origin}/store/${slug}`
    ].join('\n');

    // If merchant provided a custom template, fill placeholders; else use professional default
    let message = currentStore.settings.orderMessageTemplate?.trim();
    if (message) {
      message = message.replace('{storeName}', currentStore.name);
      message = message.replace('{date}', dateStr);
      message = message.replace('{orderDetails}', orderDetails);
      message = message.replace('{subtotal}', formatPrice(totalPrice, currentStore.settings.currency));
      message = message.replace('{total}', formatPrice(totalPrice, currentStore.settings.currency));
      message = message.replace('{customerName}', customerInfo.name);
      message = message.replace('{customerPhone}', customerInfo.phone);
      message = message.replace('{notes}', customerInfo.notes || '');
      message = message.replace('{storeUrl}', `${window.location.origin}/store/${slug}`);
      // Backwards compatibility for templates referencing delivery placeholders
      message = message.replace('{deliveryMethod}', '');
      message = message.replace('{deliveryFee}', '');
      message = message.replace('{orderNumber}', '');
    } else {
      message = professionalDefault;
    }

    const whatsappUrl = generateWhatsAppUrl(currentStore.whatsappNumber, message);
    const popup = window.open(whatsappUrl, '_blank');
    if (!popup || popup.closed) {
      // Fallback in case popups are blocked
      window.location.href = whatsappUrl;
    }
    
    // Clear cart after successful order
    clearCart();
    toast.success('Order sent successfully! We will contact you soon.');
  };

  if (!currentStore) {
    return <div>Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">Add some products to get started</p>
        <Link
          to={`/store/${slug}`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-colors"
          style={{ backgroundColor: currentStore.theme.primaryColor }}
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.product.id} className="group overflow-hidden rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="shrink-0">
                    <div className="w-28 sm:w-32 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-100 relative aspect-[4/3]">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 640px) 112px, 128px"
                        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{item.product.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{categories.find(c => c.id === item.product.categoryId)?.name || ''}</p>
                    <p className="font-medium mt-1" style={{ color: currentStore.theme.primaryColor }}>
                      {formatPrice(item.product.price, currentStore.settings.currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      aria-label="decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 sm:w-12 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      aria-label="increase"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-600 hover:text-red-700"
                    aria-label="remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary & Checkout */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special requests or notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full text-white font-medium"
                style={{ backgroundColor: currentStore.theme.primaryColor }}
                disabled={!customerInfo.name || !customerInfo.phone}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Order via WhatsApp
              </Button>
              <p className="text-xs text-slate-500">Quick order via WhatsApp. We'll confirm your details in chat.</p>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-0">
              <CardTitle className="text-base sm:text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm sm:text-base">Subtotal</span>
                  <span>{formatPrice(totalPrice, currentStore.settings.currency)}</span>
                </div>
                
                {currentStore.settings.allowDelivery && (
                  <div className="flex justify-between">
                    <span className="text-sm sm:text-base">Delivery Fee</span>
                    <span>{formatPrice(currentStore.settings.deliveryFee, currentStore.settings.currency)}</span>
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-base sm:text-lg">
                    <span className="text-sm sm:text-base">Total</span>
                    <span aria-live="polite" style={{ color: currentStore.theme.primaryColor }}>
                      {formatPrice(
                        totalPrice + (currentStore.settings.allowDelivery ? currentStore.settings.deliveryFee : 0),
                        currentStore.settings.currency
                      )}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/store/${slug}/checkout`)}
                  className="w-full mt-4 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: currentStore.theme.primaryColor }}
                  disabled={!customerInfo.name || !customerInfo.phone}
                >
                  Proceed to Checkout
                </Button>
                <p className="text-xs text-slate-500 mt-2">Complete your order and enter details on the next step.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}