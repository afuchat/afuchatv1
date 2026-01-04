import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';

// Import onboarding images
import welcomeHero from '@/assets/onboarding/welcome-hero.jpg';
import featureFeed from '@/assets/onboarding/feature-feed.jpg';
import featureChat from '@/assets/onboarding/feature-chat.jpg';
import featureGifts from '@/assets/onboarding/feature-gifts.jpg';
import featurePremium from '@/assets/onboarding/feature-premium.jpg';

interface Slide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  description: string;
}

const slides: Slide[] = [
  {
    id: 0,
    image: welcomeHero,
    title: 'Welcome to',
    subtitle: 'AfuChat',
    description: 'Connect with friends, share moments, and join the conversation',
  },
  {
    id: 1,
    image: featureFeed,
    title: 'Discover',
    subtitle: 'Your Feed',
    description: 'See posts from friends and creators you follow. Like, comment, and share your thoughts',
  },
  {
    id: 2,
    image: featureChat,
    title: 'Chat',
    subtitle: 'Instantly',
    description: 'Send messages, voice notes, and media to friends with real-time delivery',
  },
  {
    id: 3,
    image: featureGifts,
    title: 'Send & Receive',
    subtitle: 'Gifts',
    description: 'Share the joy with red envelopes, rare gifts, and Nexa rewards',
  },
  {
    id: 4,
    image: featurePremium,
    title: 'Go',
    subtitle: 'Premium',
    description: 'Get verified, unlock AI features, ad-free experience, and exclusive benefits',
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  // Check if logged-in user should be redirected
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (loading) return;
      
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, handle')
          .eq('id', user.id)
          .maybeSingle();

        const hasEssentialFields = profile?.display_name && profile?.handle;
        
        if (!hasEssentialFields) {
          setShouldRedirect('/onboarding');
        } else {
          setShouldRedirect('/home');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setShouldRedirect('/home');
      } finally {
        setCheckingProfile(false);
      }
    };

    checkUserAndRedirect();
  }, [user, loading]);

  // Show loader while checking auth state
  if (loading || checkingProfile) {
    return <PageSkeleton variant="centered" />;
  }

  // Redirect logged-in users
  if (shouldRedirect) {
    return <Navigate to={shouldRedirect} replace />;
  }

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <Logo size="sm" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/home')}
          className="text-foreground/70 hover:text-foreground"
        >
          Skip
        </Button>
      </div>

      {/* Main Carousel Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Image Section */}
            <div className="relative h-[55%] overflow-hidden">
              <img
                src={slides[currentSlide].image}
                alt={slides[currentSlide].subtitle}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col items-center justify-start px-6 pt-6 pb-4 text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-lg font-medium text-muted-foreground">
                  {slides[currentSlide].title}
                </h2>
                <h1 className="text-4xl font-bold text-primary mt-1">
                  {slides[currentSlide].subtitle}
                </h1>
                <p className="text-muted-foreground mt-4 max-w-xs mx-auto leading-relaxed">
                  {slides[currentSlide].description}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {!isFirstSlide && (
          <button
            onClick={goToPrevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {!isLastSlide && (
          <button
            onClick={goToNextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-6 pb-8 space-y-6">
        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide
                  ? 'w-8 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        {isLastSlide ? (
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/auth/signup')}
              className="w-full h-12 text-base font-semibold rounded-xl"
              size="lg"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate('/auth/signin')}
              variant="outline"
              className="w-full h-12 text-base font-semibold rounded-xl"
              size="lg"
            >
              Sign In
            </Button>
          </div>
        ) : (
          <Button
            onClick={goToNextSlide}
            className="w-full h-12 text-base font-semibold rounded-xl"
            size="lg"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default Welcome;
