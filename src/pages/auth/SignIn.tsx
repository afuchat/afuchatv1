import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { motion } from 'framer-motion';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useIsTelegram } from '@/hooks/useIsTelegram';

const SignIn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isTelegram = useIsTelegram();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tgAutoLogin, setTgAutoLogin] = useState(false);

  // Auto-trigger Telegram login in TMA
  useEffect(() => {
    if (isTelegram && window.Telegram?.WebApp?.initData && !user && !authLoading) {
      setTgAutoLogin(true);
      supabase.functions.invoke('telegram-web-auth', {
        body: { initData: window.Telegram.WebApp.initData },
      }).then(async ({ data, error }) => {
        if (error || !data) {
          setTgAutoLogin(false);
          return;
        }
        if (data.access_token) {
          await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
        } else if (data.token) {
          await supabase.auth.verifyOtp({ token_hash: data.token, type: 'magiclink' });
        }
      }).catch(() => setTgAutoLogin(false));
    }
  }, [isTelegram, user, authLoading]);

  if (authLoading) return <PageSkeleton variant="centered" />;
  if (user) return <Navigate to="/home" replace />;

  if (tgAutoLogin) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 text-[#229ED9] animate-spin" />
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter email and password'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) toast.error('Please confirm your email first.');
        else if (error.message.includes('Invalid login credentials')) toast.error('Invalid email or password.');
        else throw error;
      } else {
        toast.success('Welcome back!');
        navigate('/home', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-sm mx-auto w-full overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">
          <button onClick={() => navigate('/auth/welcome')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <OAuthButtons loading={loading} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">
                {isTelegram ? 'or use email' : 'or continue with email'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 pr-10 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="text-primary font-semibold hover:underline">Sign up</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
