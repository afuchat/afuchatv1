import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MessageCircle, Gift, Sparkles, Newspaper, Crown, Loader2 } from 'lucide-react';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import { toast } from 'sonner';

import welcomeHero from '@/assets/onboarding/welcome-hero.jpg';
import featureChat from '@/assets/onboarding/feature-chat.jpg';
import featureFeed from '@/assets/onboarding/feature-feed.jpg';
import featureGifts from '@/assets/onboarding/feature-gifts.jpg';
import featurePremium from '@/assets/onboarding/feature-premium.jpg';

const slides = [
  { id: 'welcome', image: welcomeHero, icon: Sparkles, title: 'Welcome to AfuChat', description: 'Your social universe. Chat, share, earn, and explore — all in one place.' },
  { id: 'chat', image: featureChat, icon: MessageCircle, title: 'Real-time Chat', description: 'Message friends and communities instantly with voice, photos, stickers, and more.' },
  { id: 'feed', image: featureFeed, icon: Newspaper, title: 'Your Personal Feed', description: 'Discover posts, stories, and trending content tailored just for you.' },
  { id: 'gifts', image: featureGifts, icon: Gift, title: 'Send & Receive Gifts', description: 'Share joy with red envelopes, rare collectibles, and seasonal surprises.' },
  { id: 'premium', image: featurePremium, icon: Crown, title: 'Go Premium', description: 'Unlock exclusive badges, themes, AI features, and stand out from the crowd.' },
];

// Telegram-native login screen
const TelegramLoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [autoLogging, setAutoLogging] = useState(true);
  const navigate = useNavigate();

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const initData = window.Telegram?.WebApp?.initData;

  const doLogin = async () => {
    if (!initData) {
      toast.error('No Telegram session found. Please reopen the app.');
      setAutoLogging(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[TG Login] Invoking telegram-web-auth with initData');
      const { data, error } = await supabase.functions.invoke('telegram-web-auth', {
        body: { initData },
      });

      console.log('[TG Login] Response:', { data, error });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Login failed');
      }

      // Verify the magic link token to get session
      if (data?.token) {
        console.log('[TG Login] Verifying OTP token');
        const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token,
          type: 'magiclink',
        });
        
        if (verifyError) {
          console.error('[TG Login] OTP verify error:', verifyError);
          throw verifyError;
        }
        
        console.log('[TG Login] Session established');
        toast.success('Welcome!');
        navigate('/home', { replace: true });
        return;
      }

      throw new Error('No authentication token received');
    } catch (err: any) {
      console.error('[TG Login] Error:', err);
      toast.error(err?.message || 'Login failed. Please try again.');
      setAutoLogging(false);
    } finally {
      setLoading(false);
    }
  };

  // Auto-login on mount
  useEffect(() => {
    if (initData) {
      doLogin();
    } else {
      setAutoLogging(false);
    }
  }, []);

  const firstName = tgUser?.first_name || 'User';
  const lastName = tgUser?.last_name || '';
  const photoUrl = tgUser?.photo_url;
  const username = tgUser?.username;

  // Show loading while auto-login is in progress
  if (autoLogging) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background touch-none select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-[#229ED9]/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#229ED9] animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden touch-none select-none">
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-col items-center gap-6"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={firstName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#229ED9]/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#229ED9] flex items-center justify-center ring-4 ring-[#229ED9]/20">
                <span className="text-3xl font-bold text-white">
                  {firstName[0]?.toUpperCase()}
                </span>
              </div>
            )}
            {/* Telegram badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#229ED9] flex items-center justify-center shadow-lg">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
          </div>

          {/* User info */}
          <div className="text-center space-y-1 flex-shrink-0">
            <h1 className="text-xl font-bold text-foreground">
              {firstName} {lastName}
            </h1>
            {username && (
              <p className="text-sm text-muted-foreground">@{username}</p>
            )}
          </div>

          {/* Login button */}
          <button
            onClick={doLogin}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[#229ED9] text-white font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-[#1e8ec4] active:scale-[0.98] transition-all disabled:opacity-50 mt-2 flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            )}
            {loading ? 'Connecting...' : 'Continue with Telegram'}
          </button>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed mt-2 flex-shrink-0">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline">Terms</a> and{' '}
            <a href="/privacy" className="underline">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// Standard welcome carousel for non-Telegram users
const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isTelegram = useIsTelegram();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const check = async () => {
      if (loading) return;
      if (!user) { setCheckingProfile(false); return; }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, handle')
          .eq('id', user.id)
          .maybeSingle();

        setShouldRedirect(profile?.display_name && profile?.handle ? '/home' : '/onboarding');
      } catch {
        setShouldRedirect('/home');
      } finally {
        setCheckingProfile(false);
      }
    };
    check();
  }, [user, loading]);

  if (loading || checkingProfile) return <PageSkeleton variant="centered" />;
  if (shouldRedirect) return <Navigate to={shouldRedirect} replace />;

  // Telegram Mini App: show dedicated Telegram login
  if (isTelegram) return <TelegramLoginScreen />;

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  const goNext = () => {
    if (isLastSlide) return;
    setDirection(1);
    setCurrentSlide(prev => prev + 1);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden touch-none">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full h-full">
        {/* Image area - using flex-basis for predictable sizing */}
        <div className="relative w-full flex-shrink-0" style={{ height: '40%' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content area - fills remaining space */}
        <div className="flex-1 flex flex-col px-6 pt-6 pb-8 min-h-0">
          {/* Dots - always in sync with content */}
          <div className="flex items-center justify-center gap-1.5 mb-6 flex-shrink-0">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-6 bg-primary' : index < currentSlide ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>

          {/* Text - animates with image */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center space-y-2 flex-shrink-0"
            >
              <h1 className="text-2xl font-black tracking-tight text-foreground">{slide.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{slide.description}</p>
            </motion.div>
          </AnimatePresence>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions - pinned to bottom */}
          <div className="space-y-3 flex-shrink-0">
            {isLastSlide ? (
              <>
                <button onClick={() => navigate('/auth/signup')} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all">
                  Get Started <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => navigate('/auth/signin')} className="w-full h-12 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all">
                  I already have an account
                </button>
              </>
            ) : (
              <>
                <button onClick={goNext} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all">
                  Next <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => navigate('/auth/signup')} className="w-full h-12 rounded-xl text-muted-foreground font-medium text-sm hover:text-foreground active:scale-[0.98] transition-all">
                  Skip
                </button>
              </>
            )}
          </div>

          {isLastSlide && (
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed mt-4 flex-shrink-0">
              By continuing, you agree to our{' '}
              <a href="/terms" className="underline">Terms</a> and{' '}
              <a href="/privacy" className="underline">Privacy Policy</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
