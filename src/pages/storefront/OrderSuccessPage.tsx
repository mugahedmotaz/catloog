import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';

export default function OrderSuccessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderNumber = searchParams.get('order');

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Order placed successfully!</h1>
      {orderNumber && (
        <p className="text-gray-700 mb-6">Order Number: <span className="font-mono">{orderNumber}</span></p>
      )}
      <p className="text-gray-600 mb-8">We have received your order and will contact you shortly.</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => navigate(`/store/${slug}`)}>Back to store</Button>
        <Button variant="outline" onClick={() => navigate(`/store/${slug}/orders`)} disabled>
          View my orders
        </Button>
      </div>
    </div>
  );
}
