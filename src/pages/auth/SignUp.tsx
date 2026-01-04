import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, ChevronRight, Search, User, Briefcase, AlertTriangle, Gift, Crown, Link2 } from 'lucide-react';
import Logo from '@/components/Logo';
import afumailLogo from '@/assets/mini-apps/afumail-logo.png';
import { emailSchema } from '@/lib/validation';
import { countries } from '@/lib/countries';
import { getCountryFlag } from '@/lib/countryFlags';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AfuMailTermsDialog } from '@/components/afumail/AfuMailTermsDialog';

import { useAuth } from '@/contexts/AuthContext';
import { CustomLoader } from '@/components/ui/CustomLoader';

import signupBg from '@/assets/auth/signup-bg.jpg';

// AfuMail OAuth configuration
const AFUMAIL_CLIENT_ID_PREVIEW = '404c5ec3776ecbb26809295a7eace970';
const AFUMAIL_CLIENT_ID_PROD = '404c5ec3776ecbb26809295a7eace970';
const AFUMAIL_AUTH_URL = 'https://afuchatmail.vercel.app/auth';

const SignUp = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Redirect logged-in users immediately
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <CustomLoader size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <SignUpContent />;
};

const SignUpContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Country, 2: Account Type, 3: Registration Method, 4: Email/Password
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'business' | null>(null);
  const [showBusinessSheet, setShowBusinessSheet] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [afumailLoading, setAfumailLoading] = useState(false);
  const [showAfuMailTerms, setShowAfuMailTerms] = useState(false);

  // Check if linking account from existing user
  const isLinkingAccount = (location.state as any)?.linkingAccount === true;
  const linkToUserId = localStorage.getItem('afuchat_link_to_user');

  // Password validation states
  const hasSpecialChar = /[!@#$%^&*\-=+]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMinLength = password.length >= 8;

  // Capture referral code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Fetch referrer name on mount and store referral code in cookie immediately
  useEffect(() => {
    const fetchReferrerName = async () => {
      if (!referralCode) return;
      
      // Store referral code in cookie IMMEDIATELY when user lands on signup page
      document.cookie = `afuchat_referral=${referralCode}; path=/; max-age=3600; SameSite=Lax`;
      console.log('[SignUp] Stored referral code in cookie on page load:', referralCode);
      
      try {
        const { data, error } = await supabase.rpc('get_referrer_name', {
          referral_code_input: referralCode
        });
        
        if (data && !error && typeof data === 'string') {
          setReferrerName(data);
        }
      } catch (error) {
        console.error('Error fetching referrer:', error);
      }
    };
    
    fetchReferrerName();
  }, [referralCode]);

  const filteredCountries = countries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleCountrySelect = (selectedCountry: string) => {
    setCountry(selectedCountry);
    setStep(2);
  };

  const handleAccountTypeSelect = (type: 'personal' | 'business') => {
    if (type === 'business') {
      setShowBusinessSheet(true);
    } else {
      setAccountType(type);
      setStep(3); // Go to registration method
    }
  };

  const handleBusinessContinue = () => {
    setAccountType('business');
    setShowBusinessSheet(false);
    setStep(3); // Go to registration method
  };

  const handleEmailPasswordSubmit = async () => {
    try {
      emailSchema.parse(email);
      if (!hasSpecialChar || !hasLetter || !hasNumber || !hasMinLength) {
        toast.error('Password does not meet requirements');
        return;
      }
      handleEmailSignUp();
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || 'Please enter a valid email');
    }
  };

  const handleEmailSignUp = async () => {
    setLoading(true);
    try {
      const signupData: any = {
        country,
        is_business_mode: accountType === 'business',
      };

      if (referralCode) {
        signupData.referral_code = referralCode;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: signupData,
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          throw error;
        }
      } else {
        toast.success('Account created! Check your email for verification.');
        navigate('/auth/signin');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Store signup data for OAuth flows using localStorage (persists across OAuth redirects)
  const storeSignupDataForOAuth = () => {
    const signupData = {
      country,
      is_business_mode: accountType === 'business',
      referral_code: referralCode || null,
    };
    console.log('Storing signup data for OAuth:', signupData);
    
    // Use localStorage (persists across OAuth redirects)
    localStorage.setItem('pendingSignupData', JSON.stringify(signupData));
    
    // Also store referral code in a cookie (backup for referral)
    if (referralCode) {
      document.cookie = `afuchat_referral=${referralCode}; path=/; max-age=3600; SameSite=Lax`;
      console.log('Stored referral code in cookie:', referralCode);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    storeSignupDataForOAuth();
    try {
      // Include referral code in redirect URL as backup
      const redirectUrl = referralCode 
        ? `${window.location.origin}/onboarding?ref=${referralCode}`
        : `${window.location.origin}/onboarding`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up with Google');
      setGoogleLoading(false);
    }
  };

  const handleGithubSignUp = async () => {
    setGithubLoading(true);
    storeSignupDataForOAuth();
    try {
      // Include referral code in redirect URL as backup
      const redirectUrl = referralCode 
        ? `${window.location.origin}/onboarding?ref=${referralCode}`
        : `${window.location.origin}/onboarding`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up with GitHub');
      setGithubLoading(false);
    }
  };

  const handleAfuMailSignUp = () => {
    // Show terms dialog first
    setShowAfuMailTerms(true);
  };

  const proceedWithAfuMailOAuth = () => {
    setAfumailLoading(true);
    storeSignupDataForOAuth();
    
    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem('afumail_oauth_state', state);
    sessionStorage.setItem('afumail_oauth_flow', 'signup');
    
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

  const handleBack = () => {
    if (step === 1) {
      // Clear linking state if user cancels
      if (isLinkingAccount) {
        localStorage.removeItem('afuchat_link_to_user');
      }
      navigate('/');
    } else if (step === 4) {
      setStep(3); // Go back to registration method from email/password
    } else {
      setStep(step - 1);
    }
  };

  const progressWidth = `${(step / 4) * 100}%`;

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={signupBg} 
          alt="" 
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/95 to-background" />
      </div>
      {/* Linking Account Banner */}
      {isLinkingAccount && linkToUserId && (
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-400/10 border-b border-blue-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Creating linked account
              </p>
              <p className="text-xs text-muted-foreground">
                This account will be linked to your existing account after setup
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Banner */}
      {referralCode && !isLinkingAccount && (
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-primary/20 p-4">
        <div className="relative z-10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {referrerName ? `Invited by ${referrerName}` : 'You\'re using a referral link!'}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Crown className="h-3 w-3 text-amber-500" />
                You'll get 1 week free Premium upon signup
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <button onClick={handleBack} className="text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="text-lg font-medium">
          {isLinkingAccount ? 'Create linked account' : 'Create account'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: progressWidth }}
        />
      </div>

      {/* Step 1: Country Selection */}
      {step === 1 && (
        <div className="flex-1 flex flex-col p-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            What country do you live in?
          </h1>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {filteredCountries.map((c) => (
              <button
                key={c}
                onClick={() => handleCountrySelect(c)}
                className="w-full flex items-center justify-between py-4 text-foreground hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCountryFlag(c)}</span>
                  <span className="text-base">{c}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>

          {/* Search Input - Fixed at bottom */}
          <div className="pt-4 -mx-6 px-6 bg-background">
            <div className="relative">
              <Input
                placeholder="Search"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="h-14 pl-4 pr-12 text-base bg-muted/50 rounded-xl"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Account Type */}
      {step === 2 && (
        <div className="flex-1 flex flex-col p-6">
          <h1 className="text-2xl font-bold text-foreground mb-8">
            Select the type of account you want
          </h1>

          <div className="space-y-4">
            <button
              onClick={() => handleAccountTypeSelect('personal')}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <User className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="text-lg font-medium text-foreground">Personal</p>
                <p className="text-sm text-muted-foreground">
                  Connect with friends and share moments
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleAccountTypeSelect('business')}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <Briefcase className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="text-lg font-medium text-foreground">Small Business</p>
                <p className="text-sm text-muted-foreground">
                  Grow your business and reach more customers
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Registration Method */}
      {step === 3 && (
        <div className="flex-1 flex flex-col p-6">
          <h1 className="text-2xl font-bold text-foreground mb-8">
            Select how you prefer to register your account
          </h1>

          <div className="flex-1" />

          {/* Bottom Section */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              By creating an account, you consent that you have read and agree to our{' '}
              <Link to="/terms" className="text-primary underline">Terms of Services and Privacy Policy</Link>.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 rounded-xl bg-white hover:bg-gray-100"
                onClick={handleGoogleSignUp}
                disabled={googleLoading || githubLoading || afumailLoading || loading}
              >
                {googleLoading ? '...' : (
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
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
                className="flex-1 h-14 rounded-xl bg-[#24292F] hover:bg-[#24292F]/90 text-white"
                onClick={handleGithubSignUp}
                disabled={googleLoading || githubLoading || afumailLoading || loading}
              >
                {githubLoading ? '...' : (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 rounded-xl bg-white hover:bg-gray-50 border-2 border-blue-500"
                onClick={handleAfuMailSignUp}
                disabled={googleLoading || githubLoading || afumailLoading || loading}
              >
                {afumailLoading ? '...' : (
                  <img src={afumailLogo} alt="AfuMail" className="h-8 w-8 rounded-lg" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              onClick={() => setStep(4)}
              className="w-full h-14 text-base font-semibold rounded-xl"
            >
              Sign up with my email
            </Button>

          </div>

          <p className="text-center text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/auth/signin" className="text-primary font-semibold">Sign in</Link>
          </p>
        </div>
      )}

      {/* Step 4: Email and Password */}
      {step === 4 && (
        <div className="flex-1 flex flex-col p-6">
          {/* Security Warning */}
          <div className="bg-amber-900/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-400">Protect your account</p>
                <p className="text-sm text-amber-400/80">
                  Never use a password previously used or a password you use on another service
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 text-base bg-muted/50 rounded-xl px-4"
              />
              <p className="text-xs text-muted-foreground">This field is mandatory.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 text-base bg-muted/50 rounded-xl px-4 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="space-y-1 mt-3">
                <p className="text-sm text-muted-foreground">Password must contain the following:</p>
                <p className={`text-sm ${hasSpecialChar ? 'text-green-500' : 'text-muted-foreground'}`}>
                  1 special character (@!#$%^&*-=+)
                </p>
                <p className={`text-sm ${hasLetter ? 'text-green-500' : 'text-muted-foreground'}`}>
                  1 letter
                </p>
                <p className={`text-sm ${hasNumber ? 'text-green-500' : 'text-muted-foreground'}`}>
                  1 number
                </p>
                <p className={`text-sm ${hasMinLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                  8 characters
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              onClick={handleEmailPasswordSubmit}
              disabled={loading || !email || !password}
              className="w-full h-14 text-base font-semibold rounded-xl"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </div>
        </div>
      )}

      {/* Business Account Requirements Sheet */}
      <Sheet open={showBusinessSheet} onOpenChange={setShowBusinessSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl font-bold">BUSINESS ACCOUNT REQUIREMENTS</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-6">
            <p className="text-muted-foreground">
              You will be required to submit a copy of your articles of incorporation, tax ID, and IDs of beneficial owners with 25% ownership or more, among other documents about your company.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={handleBusinessContinue}
                className="w-full h-14 text-base font-semibold rounded-xl"
              >
                Continue as a small business
              </Button>
              <Button
                onClick={() => setShowBusinessSheet(false)}
                variant="outline"
                className="w-full h-14 text-base font-semibold rounded-xl"
              >
                Go back
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
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

export default SignUp;
