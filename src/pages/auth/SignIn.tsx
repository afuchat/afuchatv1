import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail } from 'lucide-react';
import Logo from '@/components/Logo';

import { emailSchema, passwordSchema } from '@/lib/validation';
import { AfuMailTermsDialog } from '@/components/afumail/AfuMailTermsDialog';

import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';

import signinBg from '@/assets/auth/signin-bg.jpg';

// AfuMail OAuth configuration
const AFUMAIL_CLIENT_ID_PREVIEW = '404c5ec3776ecbb26809295a7eace970';
const AFUMAIL_CLIENT_ID_PROD = '404c5ec3776ecbb26809295a7eace970';
const AFUMAIL_AUTH_URL = 'https://afuchatmail.vercel.app/auth';

const SignIn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [afumailLoading, setAfumailLoading] = useState(false);
  const [showAfuMailTerms, setShowAfuMailTerms] = useState(false);

  // Redirect logged-in users
  if (authLoading) {
    return <PageSkeleton variant="centered" />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Email not confirmed. Please check your inbox for a verification link.');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password.');
        } else {
          throw error;
        }
      } else {
        toast.success('Signed in successfully!');
        // AuthContext will handle redirect based on profile completion
        navigate('/home', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setGithubLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with GitHub');
      setGithubLoading(false);
    }
  };

  const handleAfuMailSignIn = () => {
    // Show terms dialog first
    setShowAfuMailTerms(true);
  };

  const proceedWithAfuMailOAuth = () => {
    setAfumailLoading(true);
    
    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem('afumail_oauth_state', state);
    sessionStorage.setItem('afumail_oauth_flow', 'signin');
    
    // Use production URL + client ID on production, preview URL otherwise
    const isProduction = window.location.hostname === 'afuchat.com';
    const redirectUri = isProduction 
      ? 'https://afuchat.com/auth/afumail/callback'
      : `${window.location.origin}/auth/afumail/callback`;
    const clientId = isProduction ? AFUMAIL_CLIENT_ID_PROD : AFUMAIL_CLIENT_ID_PREVIEW;
    const scope = 'openid profile email read:mailbox read:messages read:folders search write:messages write:drafts';
    
    const authUrl = `${AFUMAIL_AUTH_URL}?oauth=true&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&response_type=code`;
    
    window.location.href = authUrl;
  };

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={signinBg} 
          alt="" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
      </div>
      
      {/* Logo */}
      <div className="relative z-10 p-4 shrink-0">
        <Logo size="sm" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 justify-between py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-6">Welcome back</h1>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base bg-muted/50 rounded-xl px-4"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-muted-foreground text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base bg-muted/50 rounded-xl px-4 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground"
              disabled={loading || googleLoading || githubLoading}
            >
              {loading ? 'Signing in...' : 'Continue'}
            </Button>
          </form>

          {/* Other ways to log in */}
          <div className="mt-6">
            <p className="text-foreground font-medium mb-3 text-sm">Other ways to log in</p>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl bg-white hover:bg-gray-100 text-foreground"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || githubLoading || afumailLoading || loading}
              >
                {googleLoading ? '...' : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl bg-[#24292F] hover:bg-[#24292F]/90 text-white"
                onClick={handleGithubSignIn}
                disabled={googleLoading || githubLoading || afumailLoading || loading}
              >
                {githubLoading ? '...' : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 text-white"
                onClick={handleAfuMailSignIn}
                disabled={googleLoading || githubLoading || afumailLoading || loading}
              >
                {afumailLoading ? '...' : (
                  <div className="flex flex-col items-center gap-0.5">
                    <Mail className="h-5 w-5" />
                    <span className="text-[10px] font-medium">AfuMail</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom links */}
        <div className="text-center space-y-3 pb-4">
          <Link
            to="/auth/forgot-password"
            className="text-foreground underline text-sm"
          >
            Forgot password?
          </Link>
          
          <p className="text-muted-foreground text-sm">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="text-primary font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom gradient accent */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/30 via-primary/10 to-transparent pointer-events-none z-0" />

      {/* AfuMail Terms Dialog */}
      <AfuMailTermsDialog
        open={showAfuMailTerms}
        onAccept={() => {
          setShowAfuMailTerms(false);
          proceedWithAfuMailOAuth();
        }}
        onDecline={() => setShowAfuMailTerms(false)}
      />
    </div>
  );
};

export default SignIn;
