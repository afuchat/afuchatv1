import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageSkeleton } from '@/components/skeletons';
import { toast } from 'sonner';

const AfuMailCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution in React StrictMode
    if (processedRef.current) return;
    processedRef.current = true;
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(searchParams.get('error_description') || 'Authorization failed');
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      // Check if this code was already processed
      const processedCode = sessionStorage.getItem('afumail_processed_code');
      if (processedCode === code) {
        console.log('Code already processed, skipping');
        return;
      }
      // Mark code as being processed
      sessionStorage.setItem('afumail_processed_code', code);

      // Verify state matches what we stored
      const storedState = sessionStorage.getItem('afumail_oauth_state');
      if (state !== storedState) {
        setError('Invalid state parameter');
        return;
      }

      try {
        // Exchange code for tokens via our edge function
        // Use production URL + client ID on production, preview URL otherwise
        const isProduction = window.location.hostname === 'afuchat.com';
        const redirectUri = isProduction 
          ? 'https://afuchat.com/auth/afumail/callback'
          : `${window.location.origin}/auth/afumail/callback`;
        const clientId = isProduction 
          ? '60fb051c2f63890df5617523fcf81a8d'
          : '2cff133dc0b104ab8d819cb47fbbfdc3';

        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('afumail-auth', {
          body: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            user_id: 'oauth_signup',
          },
        });

        if (tokenError || !tokenData?.access_token) {
          throw new Error(tokenError?.message || 'Failed to exchange authorization code');
        }

        // Get user info from AfuMail
        const AFUMAIL_API_BASE = 'https://vfcukxlzqfeehhkiogpf.supabase.co/functions/v1/afumail-api';

        const userInfoResponse = await fetch(`${AFUMAIL_API_BASE}/api/user/me`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user info from AfuMail');
        }

        const userInfo = await userInfoResponse.json();

        // AfuMail may not include an email on /api/user/me.
        // Fallback to /mailbox which returns { email_address, storage_used, storage_limit }.
        let afumailEmail: string | undefined =
          userInfo.email
          || userInfo.mail
          || userInfo.preferred_email
          || userInfo.emailAddress
          || userInfo.email_address
          || userInfo.primary_email
          || userInfo.address
          || userInfo.username
          || (Array.isArray(userInfo.accounts)
            ? userInfo.accounts.find((a: any) => a?.email || a?.email_address || a?.address)?.email
              || userInfo.accounts.find((a: any) => a?.email || a?.email_address || a?.address)?.email_address
              || userInfo.accounts.find((a: any) => a?.email || a?.email_address || a?.address)?.address
            : undefined);

        if (!afumailEmail) {
          const mailboxRes = await fetch(`${AFUMAIL_API_BASE}/mailbox`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (mailboxRes.ok) {
            const mailbox = await mailboxRes.json();
            afumailEmail = mailbox.email_address || mailbox.email || mailbox.address;
          }
        }

        if (!afumailEmail) {
          const keys = userInfo && typeof userInfo === 'object' ? Object.keys(userInfo) : [];
          throw new Error(
            `Email not found in AfuMail response. Available fields: ${keys.join(', ') || 'none'} (also checked /mailbox).`
          );
        }

        const name = userInfo.name || userInfo.display_name || userInfo.displayName || userInfo.full_name || afumailEmail.split('@')[0];

        // Get signup data if this is coming from signup flow
        const pendingSignupData = localStorage.getItem('pendingSignupData');
        const signupData = pendingSignupData ? JSON.parse(pendingSignupData) : null;
        const isSignupFlow = sessionStorage.getItem('afumail_oauth_flow') === 'signup';

        // Signin flow - use magic link to authenticate existing user
        if (!isSignupFlow) {
          // Check if user exists by trying to send magic link
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: afumailEmail,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: `${window.location.origin}/home`,
            },
          });

          if (otpError) {
            if (otpError.message.includes('Signups not allowed') || otpError.message.includes('not found')) {
              toast.error('No account found with this email. Please sign up first.');
              navigate('/auth/signup');
              return;
            }
            throw otpError;
          }

          // Clean up
          sessionStorage.removeItem('afumail_oauth_state');
          sessionStorage.removeItem('afumail_oauth_flow');
          sessionStorage.removeItem('afumail_processed_code');

          toast.success('Check your email for a sign-in link!');
          navigate('/auth/signin');
          return;
        }

        // Signup flow - create new account
        const afumailPassword = `afumail_${userInfo.id}_${crypto.randomUUID().slice(0, 8)}`;
        
        const { error: signUpError } = await supabase.auth.signUp({
          email: afumailEmail,
          password: afumailPassword,
          options: {
            data: {
              display_name: name,
              afumail_user_id: userInfo.id,
              country: signupData?.country,
              is_business_mode: signupData?.is_business_mode,
            },
            emailRedirectTo: `${window.location.origin}/complete-profile`,
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            toast.info('This email is already registered. Please sign in.');
            navigate('/auth/signin');
            return;
          }
          throw signUpError;
        }

        // Clean up
        localStorage.removeItem('pendingSignupData');
        sessionStorage.removeItem('afumail_oauth_state');
        sessionStorage.removeItem('afumail_oauth_flow');
        sessionStorage.removeItem('afumail_processed_code');

        toast.success('Account created! Complete your profile.');
        navigate('/complete-profile');
      } catch (err: unknown) {
        console.error('AfuMail OAuth error:', err);
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        // Clean up processed code on error so user can retry
        sessionStorage.removeItem('afumail_processed_code');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Authentication Failed</h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate('/auth/signin')}
            className="text-primary underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <PageSkeleton variant="centered" />
      <p className="mt-4 text-muted-foreground">Authenticating with AfuMail...</p>
    </div>
  );
};

export default AfuMailCallback;
