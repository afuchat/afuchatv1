import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MessageCircle, Gift, Sparkles, Newspaper, Crown, Loader2, Mail } from 'lucide-react';
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

const TelegramIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// Standard welcome carousel for all users (including Telegram)
const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isTelegram = useIsTelegram();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [tgLoading, setTgLoading] = useState(false);

  // Auto-login for Telegram Mini App users
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  
  useEffect(() => {
    const check = async () => {
      if (loading) return;
      if (!user) {
        // If in Telegram, try auto-login immediately
        if (!autoLoginAttempted && window.Telegram?.WebApp?.initData) {
          setAutoLoginAttempted(true);
          setTgLoading(true);
          try {
            const initData = window.Telegram.WebApp.initData;
            const { data, error } = await supabase.functions.invoke('telegram-web-auth', {
              body: { initData },
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Login failed');
            if (data?.token) {
              const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: data.token,
                type: 'magiclink',
              });
              if (verifyError) throw verifyError;
              // Auth state will update via onAuthStateChange, which re-triggers this effect
              return;
            }
          } catch (err: any) {
            console.log('[TG Auto-Login] Failed:', err?.message);
            // Silent fail — user can tap "Continue with Telegram" manually
          } finally {
            setTgLoading(false);
          }
        }
        setCheckingProfile(false);
        return;
      }

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

  const handleTelegramLogin = async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      toast.error('No Telegram session found. Please reopen the app.');
      return;
    }

    setTgLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-web-auth', {
        body: { initData },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Login failed');

      if (data?.token) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token,
          type: 'magiclink',
        });
        if (verifyError) throw verifyError;
        toast.success('Welcome!');
        navigate('/home', { replace: true });
        return;
      }

      throw new Error('No authentication token received');
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Please try again.');
    } finally {
      setTgLoading(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  // Telegram Mini App user info
  const tgUser = isTelegram ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden touch-none">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full h-full">
        {/* Image area */}
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

        {/* Content area */}
        <div className="flex-1 flex flex-col px-6 pt-6 pb-8 min-h-0">
          {/* Dots */}
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

          {/* Text */}
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

          {/* Actions */}
          <div className="space-y-3 flex-shrink-0">
            {isLastSlide ? (
              <>
                {/* In TMA: show Telegram login + connect existing account */}
                {isTelegram ? (
                  <>
                    {/* Telegram user preview */}
                    {tgUser && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 mb-1">
                        {tgUser.photo_url ? (
                          <img src={tgUser.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#229ED9] flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{tgUser.first_name?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {tgUser.first_name} {tgUser.last_name || ''}
                          </p>
                          {tgUser.username && (
                            <p className="text-xs text-muted-foreground truncate">@{tgUser.username}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Create / Login with Telegram */}
                    <button
                      onClick={handleTelegramLogin}
                      disabled={tgLoading}
                      className="w-full h-12 rounded-xl bg-[#229ED9] text-white font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-[#1e8ec4] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {tgLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TelegramIcon />
                      )}
                      {tgLoading ? 'Connecting...' : 'Continue with Telegram'}
                    </button>

                    {/* Connect existing account */}
                    <button
                      onClick={() => navigate('/auth/signin')}
                      className="w-full h-12 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2.5 hover:bg-secondary/80 active:scale-[0.98] transition-all"
                    >
                      <Mail className="h-4 w-4" />
                      Connect existing account
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate('/auth/signup')} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate('/auth/signin')} className="w-full h-12 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all">
                      I already have an account
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button onClick={goNext} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all">
                  Next <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => {
                  setDirection(1);
                  setCurrentSlide(slides.length - 1);
                }} className="w-full h-12 rounded-xl text-muted-foreground font-medium text-sm hover:text-foreground active:scale-[0.98] transition-all">
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
