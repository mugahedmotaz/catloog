import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  verifyEmailOtp: (email: string, token: string) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Load current session on mount
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    // Listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null,
    ) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user ?? null);
      return true;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'merchant' },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw error;
      // Require email confirmation: do not auto-login.
      // Show guidance and let the Register page redirect to /login if desired.
      toast.success('تم إنشاء الحساب. يرجى التحقق من بريدك لتأكيد الحساب.');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Signup error:', error);
      toast.error('تعذر إنشاء الحساب. حاول لاحقًا');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Google OAuth error:', error);
      toast.error('تعذر تسجيل الدخول عبر Google');
    }
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Reset password error:', error);
      toast.error('تعذر إرسال رابط إعادة التعيين');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('تم تحديث كلمة المرور بنجاح');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Update password error:', error);
      toast.error('تعذر تحديث كلمة المرور');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOtp = async (email: string, token: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw error;
      toast.success('تم تأكيد البريد بنجاح، يمكنك تسجيل الدخول الآن');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Verify OTP error:', error);
      toast.error('رمز التحقق غير صحيح أو منتهي');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { user, login, logout, signup, loginWithGoogle, requestPasswordReset, updatePassword, verifyEmailOtp, isLoading };
}

export { AuthContext };