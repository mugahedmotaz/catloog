import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';

export function OrderSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('storefront.orderSuccessTitle') || 'Order placed successfully!'}</h1>
      {orderNumber && (
        <p className="text-gray-700 mb-6">{t('storefront.orderNumber') || 'Order Number'}: <span className="font-mono">{orderNumber}</span></p>
      )}
      <p className="text-gray-600 mb-8">{t('storefront.orderSuccessDesc') || 'We have received your order and will contact you shortly.'}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => navigate(`/store/${slug}`)}>{t('storefront.backToStore') || 'Back to store'}</Button>
        <Button variant="outline" onClick={() => navigate(`/store/${slug}/orders`)} disabled>
          {t('storefront.viewOrders') || 'View my orders'}
        </Button>
      </div>
    </div>
  );
}
