import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, Shield, CheckCircle2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import DesktopAuthWindow from '@/components/desktop/DesktopAuthWindow';
import signupBg from '@/assets/auth/signup-bg.jpg';

const SignUp = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* Capture referral code */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');

    if (ref) {
      document.cookie = `afuchat_referral=${ref}; path=/; max-age=3600; SameSite=Lax`;
    }
  }, []);

  if (authLoading) {
    return <PageSkeleton variant="centered" />;
  }

  if (user) {
    return <Navigate to="/onboarding" replace />;
  }

  /* Password checks */
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Password must be at least 8 characters with letters and numbers');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data?.session) {
        toast.success('Account created successfully!');
        navigate('/onboarding', { replace: true });
      } else {
        toast.success('Account created! Please check your email to verify your account.');
      }

    } catch (error: any) {
      toast.error(error?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (loading) return;

    localStorage.setItem(
      'pendingSignupData',
      JSON.stringify({
        referral_code:
          new URLSearchParams(window.location.search).get('ref') || undefined,
      })
    );

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

    } catch (error: any) {
      toast.error(error?.message || `Failed to sign up with ${provider}`);
      setLoading(false);
    }
  };

  const PasswordCheck = ({ met, label }: { met: boolean; label: string }) => (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        met ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <CheckCircle2
        className={cn(
          'h-3 w-3',
          met ? 'text-primary' : 'text-muted-foreground/50'
        )}
      />
      {label}
    </div>
  );

  return (
    <DesktopAuthWindow>
      <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={signupBg}
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/85 to-background" />
        </div>

        {/* Decorative blur */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/8 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm space-y-8"
          >

            {/* Header */}
            <div className="text-center space-y-3">
              <Logo className="h-10 mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">
                Create Account
              </h1>
              <p className="text-sm text-muted-foreground">
                Join AfuChat and connect with friends
              </p>
            </div>

            {/* OAuth */}
            <div className="space-y-2.5">
              <Button
                variant="outline"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="w-full h-11 rounded-full text-sm gap-3"
              >
                Continue with Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuth('github')}
                disabled={loading}
                className="w-full h-11 rounded-full text-sm gap-3"
              >
                Continue with GitHub
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSignUp} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    id="email"
                    autoFocus
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 h-11"
                  />

                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    <PasswordCheck met={hasMinLength} label="8+ characters" />
                    <PasswordCheck met={hasLetter} label="Letters" />
                    <PasswordCheck met={hasNumber} label="Numbers" />
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full h-11"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/auth/signin"
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
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
    </DesktopAuthWindow>
  );
};

export default SignUp;
