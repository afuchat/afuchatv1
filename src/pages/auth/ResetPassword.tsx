import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { passwordSchema } from '@/lib/validation';
import { motion } from 'framer-motion';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setValidSession(true);
      else if (event === 'SIGNED_OUT') setValidSession(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      else setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => { if (!s) setValidSession(false); });
      }, 1000);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      passwordSchema.parse(password);
      if (password !== confirmPassword) { toast.error('Passwords do not match'); setLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated!');
      navigate('/auth/signin');
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || error.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (validSession === null) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (validSession === false) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-background">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Invalid or Expired Link</h1>
          <p className="text-sm text-muted-foreground">This reset link is no longer valid. Please request a new one.</p>
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
            <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">New password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 pr-10 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
