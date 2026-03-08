import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useIsTelegram } from '@/hooks/useIsTelegram';

const SignUp = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isTelegram = useIsTelegram();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) document.cookie = `afuchat_referral=${ref}; path=/; max-age=3600; SameSite=Lax`;
  }, []);

  if (authLoading) return <PageSkeleton variant="centered" />;
  if (user) return <Navigate to="/onboarding" replace />;

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) { toast.error('Please enter email and password'); return; }
    if (!email.includes('@')) { toast.error('Please enter a valid email'); return; }
    if (!isPasswordValid) { toast.error('Password must be at least 8 characters with letters and numbers'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      if (data?.session) {
        toast.success('Account created!');
        navigate('/onboarding', { replace: true });
      } else {
        toast.success('Check your email to verify your account.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const Check = ({ met, label }: { met: boolean; label: string }) => (
    <span className={cn('flex items-center gap-1 text-xs', met ? 'text-primary' : 'text-muted-foreground/60')}>
      <CheckCircle2 className="h-3 w-3" /> {label}
    </span>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-8"
        >
          {/* Back */}
          <button onClick={() => navigate('/auth/welcome')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Create account</h1>
            <p className="text-sm text-muted-foreground">Join AfuChat and connect with friends</p>
          </div>

          {/* OAuth */}
          <OAuthButtons loading={loading} isSignUp />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  <Check met={hasMinLength} label="8+ chars" />
                  <Check met={hasLetter} label="Letters" />
                  <Check met={hasNumber} label="Numbers" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link to="/auth/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;
