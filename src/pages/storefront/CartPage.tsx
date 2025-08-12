import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, MessageCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { useStore } from '../../contexts/StoreProvider';
import { useCart } from '../../contexts/CartProvider';
import { formatPrice, generateWhatsAppUrl } from '../../lib/utils';

export function CartPage() {
  const { t } = useTranslation();
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
      alert('Please fill in your name and phone number');
      return;
    }

    if (!currentStore) return;

    // Build order details
    const orderDetails = items.map(item => 
      `• ${item.product.name} x${item.quantity} - ${formatPrice(item.product.price * item.quantity, currentStore.settings.currency)}`
    ).join('\n');

    const dateStr = new Date().toLocaleString();
    const professionalDefault = [
      `مرحباً فريق ${currentStore.name} 👋`,
      'تم استلام طلب جديد ✅',
      `التاريخ: ${dateStr}`,
      '—',
      'بيانات العميل:',
      `• الاسم: ${customerInfo.name}`,
      `• الجوال: ${customerInfo.phone}`,
      '—',
      'تفاصيل السلة:',
      `${orderDetails}`,
      '—',
      `الإجمالي: ${formatPrice(totalPrice, currentStore.settings.currency)}`,
      `ملاحظات: ${customerInfo.notes || 'لا توجد ملاحظات'}`,
      '—',
      `رابط المتجر: ${window.location.origin}/store/${slug}`
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
    alert('Order sent successfully! We will contact you soon.');
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('storefront.cart')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.product.id}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">{categories.find(c => c.id === item.product.categoryId)?.name || ''}</p>
                    <p className="font-medium" style={{ color: currentStore.theme.primaryColor }}>
                      {formatPrice(item.product.price, currentStore.settings.currency)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-600 hover:text-red-700"
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
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('storefront.subtotal')}</span>
                  <span>{formatPrice(totalPrice, currentStore.settings.currency)}</span>
                </div>
                
                {currentStore.settings.allowDelivery && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{formatPrice(currentStore.settings.deliveryFee, currentStore.settings.currency)}</span>
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>{t('storefront.total')}</span>
                    <span style={{ color: currentStore.theme.primaryColor }}>
                      {formatPrice(
                        totalPrice + (currentStore.settings.allowDelivery ? currentStore.settings.deliveryFee : 0),
                        currentStore.settings.currency
                      )}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/store/${slug}/checkout`)}
                  className="w-full mt-4 text-white font-medium"
                  style={{ backgroundColor: currentStore.theme.primaryColor }}
                >
                  {t('storefront.proceedToCheckout') || 'Proceed to Checkout'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('storefront.customerInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('storefront.customerName')} *
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
                  {t('storefront.customerPhone')} *
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
                  {t('storefront.notes')}
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
                {t('storefront.sendOrder')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}