import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { motion } from 'framer-motion';
import DesktopAuthWindow from '@/components/desktop/DesktopAuthWindow';
import signinBg from '@/assets/auth/signin-bg.jpg';

const SignIn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (authLoading) {
    return <PageSkeleton variant="centered" />;
  }

  if (user) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and confirm your account first.');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password.');
        } else {
          throw error;
        }
      } else {
        toast.success('Welcome back!');
        navigate('/onboarding', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/onboarding` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
      setLoading(false);
    }
  };

  return (
    <DesktopAuthWindow>
      <div className="min-h-screen flex bg-background relative overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img src={signinBg} alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        {/* Decorative */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        {/* CONTENT */}
        <div className="relative z-10 flex flex-1">

          {/* LEFT SIDE (desktop only) */}
          <div className="hidden lg:flex flex-1 items-center justify-center px-16">
            <div className="max-w-md space-y-6">
              <Logo className="h-12" />
              <h2 className="text-4xl font-bold leading-tight">
                Welcome to AfuChat
              </h2>
              <p className="text-muted-foreground text-lg">
                Connect, learn, and grow with your community. Secure, fast, and built for you.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE (form) */}
          <div className="flex flex-1 items-center justify-center px-6 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm md:max-w-md lg:max-w-lg bg-card/70 backdrop-blur-xl border border-border/50 rounded-2xl p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-3">
                <Logo className="h-10 mx-auto" />
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to continue to AfuChat
                </p>
              </div>

              {/* OAuth */}
              <div className="space-y-2.5">
                <Button
                  variant="outline"
                  onClick={() => handleOAuth('google')}
                  disabled={loading}
                  className="w-full h-11 rounded-full border-border hover:border-primary/50 bg-card hover:bg-card/80 text-sm font-medium gap-3"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleOAuth('github')}
                  disabled={loading}
                  className="w-full h-11 rounded-full border-border hover:border-primary/50 bg-card hover:bg-card/80 text-sm font-medium gap-3"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387..."/>
                  </svg>
                  Continue with GitHub
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">or</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11 rounded-xl bg-card/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 h-11 rounded-xl bg-card/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-semibold">
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Footer */}
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/auth/signup" className="text-primary font-semibold hover:underline">
                    Sign up
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span className="text-[11px]">Secure & encrypted</span>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </DesktopAuthWindow>
  );
};

export default SignIn;
