import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MessageCircle, Gift, Sparkles, Globe } from 'lucide-react';

const features = [
  {
    icon: MessageCircle,
    title: 'Connect & Chat',
    desc: 'Real-time messaging with friends and communities',
  },
  {
    icon: Gift,
    title: 'Send Gifts',
    desc: 'Share joy with red envelopes and rare collectibles',
  },
  {
    icon: Sparkles,
    title: 'AI Powered',
    desc: 'Smart features powered by cutting-edge AI',
  },
  {
    icon: Globe,
    title: 'Mini Programs',
    desc: 'Games, shops, travel, and more — all in one app',
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full space-y-12"
        >
          {/* Brand */}
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Afu<span className="text-primary">Chat</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Your social universe. Chat, share, earn, and explore — all in one place.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="space-y-2"
              >
                <f.icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-4">
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
          </div>

          {/* Legal */}
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline">Terms</a> and{' '}
            <a href="/privacy" className="underline">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
