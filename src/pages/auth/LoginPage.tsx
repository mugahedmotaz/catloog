import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/ui/card';
import { Mail, Lock, LogIn } from 'lucide-react';
import Logo from '../../components/Logo';

export function LoginPage() {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(() => ({}));
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormInfo(null);
    // Basic inline validation
    const nextErrors: typeof errors = {};
    if (!formData.email) {
      nextErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      nextErrors.password = 'Please enter your password';
    } else if (formData.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const success = await login(formData.email, formData.password);
    if (success) {
      const isAdminContext = location.pathname.startsWith('/admin');
      setFormInfo(isAdminContext
        ? 'Signed in successfully. Redirecting to admin...'
        : 'Signed in successfully. Redirecting to dashboard...'
      );
      navigate(isAdminContext ? '/admin/plans' : '/dashboard');
    } else {
      setFormError('Sign in failed. Check your credentials or verify your email.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      {/* Language toggle removed: English-only UI */}
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-3">
            <Logo responsive preset="xl" rounded="lg" alt="Catloog" />
          </div>
          <p className="text-gray-600 mt-2">Sign in to your merchant account</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                {formError}
              </div>
            )}
            {formInfo && (
              <div className="rounded-md border border-teal-200 bg-teal-50 text-teal-700 px-3 py-2 text-sm">
                {formInfo}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
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
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Sign In'}
            </Button>
            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400">or</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } finally {
                  const isAdminContext = location.pathname.startsWith('/admin');
                  navigate(isAdminContext ? '/admin/plans' : '/dashboard');
                }
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign in with Google
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 text-center">
          <Link to="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700 transition-colors">
            Forgot your password?
          </Link>
          
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
              Sign Up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}