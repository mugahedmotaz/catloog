import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthProvider';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle, LogIn } from 'lucide-react';

// Standalone Admin-only login with fixed credentials and no social/register
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAdminAuth();

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const ADMIN_DOMAIN = import.meta.env.VITE_ADMIN_DOMAIN as string | undefined; // e.g. example.com
  // Optional: lock email input if ADMIN_EMAIL is set
  const [formData, setFormData] = useState({
    email: ADMIN_EMAIL ?? '',
    password: ''
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [remember, setRemember] = useState<boolean>(false);

  // Load remembered admin email
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_email');
      if (!ADMIN_EMAIL && saved) {
        setFormData(p => ({ ...p, email: saved }));
        setRemember(true);
      }
    } catch { /* no-op */ }
  }, [ADMIN_EMAIL]);

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

    if (ADMIN_DOMAIN) {
      const domain = formData.email.split('@')[1]?.toLowerCase();
      if (domain !== ADMIN_DOMAIN.toLowerCase()) {
        setFormError(`Only emails from ${ADMIN_DOMAIN} are allowed for admin access.`);
        return;
      }
    }

    const ok = await login(formData.email, formData.password);
    if (!ok) {
      setFormError('Invalid credentials or email not verified.');
      return;
    }

    // Remember email locally for convenience (doesn't affect security)
    try {
      if (remember && !ADMIN_EMAIL) {
        localStorage.setItem('admin_email', formData.email);
      } else {
        localStorage.removeItem('admin_email');
      }
    } catch { /* no-op */ }
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
              {ADMIN_DOMAIN && (
                <p className="text-[11px] text-gray-500">Allowed domain: <b>{ADMIN_DOMAIN}</b></p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  onKeyUp={(e) => setCapsLockOn((e as any).getModifierState?.('CapsLock'))}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              {capsLockOn && (
                <div className="flex items-center gap-2 text-amber-600 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" /> Caps Lock is ON
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={!!ADMIN_EMAIL}
                />
                Remember email
              </label>
              <a href="/forgot-password" className="text-xs text-teal-600 hover:text-teal-700">Forgot password?</a>
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
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
                  // Hint domain to Google; server still enforces via AdminRoute/Admin table
                  const params: Record<string, string> = {};
                  if (ADMIN_DOMAIN) params.hd = ADMIN_DOMAIN; // hint domain
                  // Use OAuth via auth hook to keep behavior consistent across app if needed later
                  // Direct usage to avoid coupling new prop in useAuth
                  const { supabaseAdmin } = await import('../../services/supabaseAdmin');
                  await supabaseAdmin.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin + '/admin/plans',
                      queryParams: params,
                    },
                  });
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('Admin Google OAuth error:', err);
                } finally {
                  navigate('/admin/plans');
                }
              }}
            >
              <LogIn className="h-4 w-4 mr-2" /> Sign in with Google (Admin)
            </Button>
          </form>

          {!ADMIN_EMAIL && (
            <div className="mt-4 text-xs text-gray-500">
              Tip: set VITE_ADMIN_EMAIL in your environment to lock the admin email field.
            </div>
          )}
          {!ADMIN_DOMAIN && (
            <div className="mt-1 text-[11px] text-gray-400">
              Optional: set <code>VITE_ADMIN_DOMAIN</code> (e.g. example.com) to restrict admin logins by domain.
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
