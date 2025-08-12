import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Mail, Hash } from 'lucide-react';

export function VerifyEmailPage() {
  const { verifyEmailOtp, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await verifyEmailOtp(email, code);
    if (ok) navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">تأكيد البريد الإلكتروني</CardTitle>
          <p className="text-gray-600 mt-2">أدخل بريدك ثم رمز التحقق المكون من الأرقام</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="رمز التحقق"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
              {isLoading ? 'جارٍ التحقق...' : 'تأكيد البريد'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <Link to="/login" className="text-sm text-teal-600 hover:text-teal-700">عودة إلى تسجيل الدخول</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
