import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Shield, Mail, Lock } from 'lucide-react';

// Standalone Admin-only login with fixed credentials and no social/register
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  // Optional: lock email input if ADMIN_EMAIL is set
  const [formData, setFormData] = useState({
    email: ADMIN_EMAIL ?? '',
    password: ''
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (!formData.email) next.email = 'Email is required';
    if (!formData.password) next.password = 'Password is required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (ADMIN_EMAIL && formData.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setFormError('This email is not authorized for admin access.');
      return;
    }

    const ok = await login(formData.email, formData.password);
    if (!ok) {
      setFormError('Invalid credentials or email not verified.');
      return;
    }
    navigate('/admin/plans');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="bg-teal-100 p-3 rounded-full">
              <Shield className="h-8 w-8 text-teal-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Catloog Admin</CardTitle>
          <p className="text-gray-600 mt-2 text-sm">Administrator access only</p>
        </CardHeader>
        <CardContent>
          {formError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  value={formData.email}
                  placeholder="admin@example.com"
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="pl-10"
                  disabled={!!ADMIN_EMAIL}
                  required
                />
              </div>
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {!ADMIN_EMAIL && (
            <div className="mt-4 text-xs text-gray-500">
              Tip: set VITE_ADMIN_EMAIL in your environment to lock the admin email field.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-center text-xs text-gray-500">
          Admin access only • No registration or social login
        </CardFooter>
      </Card>
    </div>
  );
}
