import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useCart } from '../../contexts/CartProvider';
import { useStore } from '../../contexts/StoreProvider';
import { formatPrice, generateWhatsAppUrl } from '../../lib/utils';
import toast from 'react-hot-toast';

const checkoutSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف غير صالح'),
  notes: z.string().max(500).optional(),
  deliveryMethod: z.enum(['pickup', 'delivery']).optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { items, totalPrice, clearCart } = useCart();
  const { currentStore, createOrder, isLoading } = useStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: { deliveryMethod: 'pickup' },
  });

  if (!currentStore) return <div className="p-8">Loading...</div>;
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('storefront.cartEmpty') || 'Your cart is empty'}</h2>
        <Button onClick={() => navigate(`/store/${slug}`)}>{t('storefront.continueShopping') || 'Continue Shopping'}</Button>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutForm) => {
    try {
      const deliveryFee = currentStore.settings.allowDelivery ? currentStore.settings.deliveryFee : 0;
      const total = totalPrice + (data.deliveryMethod === 'delivery' ? deliveryFee : 0);

      const orderNumber = 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const itemsPayload = items.map((it) => ({
        productId: it.product.id,
        productName: it.product.name,
        price: it.product.price,
        quantity: it.quantity,
        total: it.product.price * it.quantity,
      }));

      const ok = await createOrder({
        orderNumber,
        items: itemsPayload,
        total,
        customerName: data.name,
        customerPhone: data.phone,
        notes: data.notes,
        status: 'pending',
        storeId: currentStore.id,
      });

      if (!ok) {
        toast.error(t('storefront.orderFailed') || 'Failed to place order');
        return;
      }

      // Build WhatsApp message and open
      const orderDetails = items
        .map(
          (item) => `• ${item.product.name} x${item.quantity} - ${formatPrice(
            item.product.price * item.quantity,
            currentStore.settings.currency
          )}`
        )
        .join('\n');

      let message = currentStore.settings.orderMessageTemplate;
      message = message.replace('{orderDetails}', orderDetails);
      message = message.replace('{total}', formatPrice(total, currentStore.settings.currency));
      message = message.replace('{customerName}', data.name);
      message = message.replace('{customerPhone}', data.phone);
      message = message.replace('{notes}', data.notes || (t('storefront.noNotes') as string) || '');

      const whatsappUrl = generateWhatsAppUrl(currentStore.whatsappNumber, message);
      window.open(whatsappUrl, '_blank');

      clearCart();
      navigate(`/store/${slug}/success?order=${orderNumber}`, { replace: true });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error(t('common.unexpectedError') || 'Unexpected error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('storefront.checkout') || 'Checkout'}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('storefront.customerInfo') || 'Customer Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('storefront.customerName') || 'Full Name'}</label>
                <Input {...register('name')} placeholder={t('storefront.customerNamePH') || 'Enter your full name'} />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('storefront.customerPhone') || 'Phone Number'}</label>
                <Input {...register('phone')} placeholder={t('storefront.customerPhonePH') || 'Enter your phone number'} />
                {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('storefront.notes') || 'Notes'}</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder={t('storefront.notesPH') || 'Any special requests or notes...'}
                />
                {errors.notes && <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>}
              </div>

              {currentStore.settings.allowDelivery && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('storefront.deliveryMethod') || 'Delivery Method'}</label>
                  <div className="flex gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" value="pickup" {...register('deliveryMethod')} />
                      <span>{t('storefront.pickup') || 'Pickup'}</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" value="delivery" {...register('deliveryMethod')} />
                      <span>{t('storefront.delivery') || 'Delivery'}</span>
                    </label>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit(onSubmit)}
                className="w-full text-white font-medium"
                style={{ backgroundColor: currentStore.theme.primaryColor }}
                disabled={!isValid || isLoading}
              >
                {t('storefront.placeOrder') || 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('storefront.orderSummary') || 'Order Summary'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((it) => (
                <div key={it.product.id} className="flex justify-between text-sm">
                  <span>
                    {it.product.name} × {it.quantity}
                  </span>
                  <span>
                    {formatPrice(it.product.price * it.quantity, currentStore.settings.currency)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>{t('storefront.subtotal') || 'Subtotal'}</span>
                <span>{formatPrice(totalPrice, currentStore.settings.currency)}</span>
              </div>
              {currentStore.settings.allowDelivery && (
                <div className="flex justify-between">
                  <span>{t('storefront.deliveryFee') || 'Delivery Fee'}</span>
                  <span>{formatPrice(currentStore.settings.deliveryFee, currentStore.settings.currency)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>{t('storefront.total') || 'Total'}</span>
                <span>
                  {formatPrice(
                    totalPrice + (currentStore.settings.allowDelivery ? currentStore.settings.deliveryFee : 0),
                    currentStore.settings.currency
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
