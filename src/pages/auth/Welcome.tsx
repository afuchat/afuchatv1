import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MessageCircle, Gift, Sparkles, Newspaper, Crown } from 'lucide-react';
import { useEffect } from 'react';

import welcomeHero from '@/assets/onboarding/welcome-hero.jpg';
import featureChat from '@/assets/onboarding/feature-chat.jpg';
import featureFeed from '@/assets/onboarding/feature-feed.jpg';
import featureGifts from '@/assets/onboarding/feature-gifts.jpg';
import featurePremium from '@/assets/onboarding/feature-premium.jpg';

const slides = [
  {
    id: 'welcome',
    image: welcomeHero,
    icon: Sparkles,
    title: 'Welcome to AfuChat',
    description: 'Your social universe. Chat, share, earn, and explore — all in one place.',
    accent: 'primary',
  },
  {
    id: 'chat',
    image: featureChat,
    icon: MessageCircle,
    title: 'Real-time Chat',
    description: 'Message friends and communities instantly with voice, photos, stickers, and more.',
    accent: 'primary',
  },
  {
    id: 'feed',
    image: featureFeed,
    icon: Newspaper,
    title: 'Your Personal Feed',
    description: 'Discover posts, stories, and trending content tailored just for you.',
    accent: 'primary',
  },
  {
    id: 'gifts',
    image: featureGifts,
    icon: Gift,
    title: 'Send & Receive Gifts',
    description: 'Share joy with red envelopes, rare collectibles, and seasonal surprises.',
    accent: 'primary',
  },
  {
    id: 'premium',
    image: featurePremium,
    icon: Crown,
    title: 'Go Premium',
    description: 'Unlock exclusive badges, themes, AI features, and stand out from the crowd.',
    accent: 'primary',
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
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
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        
        {/* Image area */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted">
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
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
          
          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-6 bg-primary'
                    : index < currentSlide
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-muted-foreground/20'
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
              className="text-center space-y-2 mb-8"
            >
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {slide.title}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="space-y-3">
            {isLastSlide ? (
              <>
                <button
                  onClick={() => navigate('/auth/signup')}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/auth/signin')}
                  className="w-full h-12 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-colors"
                >
                  I already have an account
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={goNext}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/auth/signup')}
                  className="w-full h-12 rounded-xl text-muted-foreground font-medium text-sm hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </>
            )}
          </div>

          {/* Legal - only on last slide */}
          {isLastSlide && (
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed mt-4">
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
