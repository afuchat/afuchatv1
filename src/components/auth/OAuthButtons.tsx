import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsTelegram } from '@/hooks/useIsTelegram';

interface OAuthButtonsProps {
  loading?: boolean;
  isSignUp?: boolean;
}

export const OAuthButtons = ({ loading: parentLoading, isSignUp }: OAuthButtonsProps) => {
  const [loading, setLoading] = useState(false);
  const isDisabled = parentLoading || loading;
  const isTelegram = useIsTelegram();

  const handleOAuth = async (provider: 'google' | 'apple' | 'github') => {
    if (isDisabled) return;

    if (isSignUp) {
      localStorage.setItem(
        'pendingSignupData',
        JSON.stringify({
          referral_code: new URLSearchParams(window.location.search).get('ref') || undefined,
        })
      );
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error?.message || `Failed to continue with ${provider}`);
      setLoading(false);
    }
  };

  const handleTelegramLogin = () => {
    if (isDisabled) return;

    if (isSignUp) {
      localStorage.setItem(
        'pendingSignupData',
        JSON.stringify({
          referral_code: new URLSearchParams(window.location.search).get('ref') || undefined,
        })
      );
    }

    // If inside Telegram Mini App, use the native WebApp auth
    if (isTelegram && window.Telegram?.WebApp) {
      // The user is already authenticated via Telegram — use initData
      const initData = window.Telegram.WebApp.initData;
      if (initData) {
        setLoading(true);
        // Call the telegram-web-auth edge function with initData
        supabase.functions.invoke('telegram-web-auth', {
          body: { initData },
        }).then(({ data, error }) => {
          if (error) {
            toast.error('Telegram login failed');
            setLoading(false);
            return;
          }
          if (data?.access_token) {
            supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            }).then(() => {
              toast.success('Welcome!');
              window.location.href = '/home';
            });
          } else {
            toast.error('Telegram login failed');
            setLoading(false);
          }
        });
        return;
      }
    }

    // Fallback: Open Telegram OAuth in browser
    const botId = '8171589498';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/telegram-callback`);
    const telegramAuthUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(window.location.origin)}&request_access=write&return_to=${redirectUri}`;
    
    window.location.href = telegramAuthUrl;
  };

  const buttonClass = "w-12 h-12 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3">
      {/* Telegram prominent button (shown everywhere, primary in TMA) */}
      {isTelegram && (
        <button
          onClick={handleTelegramLogin}
          disabled={isDisabled}
          className="w-full h-12 rounded-xl bg-[#229ED9] text-white font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-[#1e8ec4] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          {isDisabled ? 'Connecting...' : 'Continue with Telegram'}
        </button>
      )}

      {/* Icon row: Google, Apple, and Telegram (icon only when not in TMA) */}
      <div className="flex items-center justify-center gap-4">
        {/* Google */}
        <button onClick={() => handleOAuth('google')} disabled={isDisabled} className={buttonClass} title="Continue with Google">
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </button>

        {/* Apple */}
        <button onClick={() => handleOAuth('apple')} disabled={isDisabled} className={buttonClass} title="Continue with Apple">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        </button>

        {/* Telegram icon (only when NOT in TMA, since TMA has the full button above) */}
        {!isTelegram && (
          <button onClick={handleTelegramLogin} disabled={isDisabled} className={buttonClass} title="Continue with Telegram">
            <svg className="h-5 w-5 text-[#229ED9]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
