import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
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

  if (authLoading) return <PageSkeleton variant="centered" />;
  if (user) return <Navigate to="/home" replace />;

  // After email sign-in succeeds inside TMA, link Telegram identity
  const linkTelegramAfterSignIn = async (userId: string) => {
    if (!isTelegram || !window.Telegram?.WebApp?.initData) return;

    try {
      await supabase.functions.invoke('telegram-web-auth', {
        body: {
          initData: window.Telegram.WebApp.initData,
          linkToUserId: userId,
        },
      });
      console.log('[SignIn] Telegram account linked to existing user');
    } catch (err) {
      console.error('[SignIn] Telegram link error:', err);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter email and password'); return; }
    setLoading(true);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) toast.error('Please confirm your email first.');
        else if (error.message.includes('Invalid login credentials')) toast.error('Invalid email or password.');
        else throw error;
      } else {
        if (signInData.user) {
          await linkTelegramAfterSignIn(signInData.user.id);
        }
        toast.success(isTelegram ? 'Account connected! Welcome back!' : 'Welcome back!');
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
            <h1 className="text-2xl font-bold text-foreground">
              {isTelegram ? 'Connect your account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isTelegram
                ? 'Sign in with your existing AfuChat account to link it with Telegram for instant login'
                : 'Sign in to your account'}
            </p>
          </div>

          {/* Show OAuth only outside TMA — inside TMA we focus on email linking */}
          {!isTelegram && <OAuthButtons loading={loading} />}

          {!isTelegram && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">or continue with email</span>
              </div>
            </div>
          )}

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
              {loading
                ? (isTelegram ? 'Connecting account...' : 'Signing in...')
                : (isTelegram ? 'Sign In & Link to Telegram' : 'Sign In')}
            </button>
          </form>

          {isTelegram && (
            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                After linking, you'll be able to log in instantly using your Telegram account every time you open AfuChat.
              </p>
            </div>
          )}

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
