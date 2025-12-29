import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { X, ChevronRight, Clock } from 'lucide-react';

interface RedEnvelope {
  id: string;
  total_amount: number;
  recipient_count: number;
  claimed_count: number;
  expires_at: string;
  sender: {
    display_name: string;
    avatar_url: string | null;
  };
}

export const UnclaimedRedEnvelopeBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [envelopes, setEnvelopes] = useState<RedEnvelope[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const dismissedUntil = sessionStorage.getItem('redEnvelopeBannerDismissed');
    if (dismissedUntil) {
      const dismissedTime = new Date(dismissedUntil);
      if (dismissedTime > new Date()) {
        setDismissed(true);
        return;
      }
    }
    fetchUnclaimedEnvelopes();
  }, [user]);

  useEffect(() => {
    if (envelopes.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % envelopes.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [envelopes.length]);

  // Countdown timer for current envelope
  useEffect(() => {
    if (envelopes.length === 0) return;
    const updateCountdown = () => {
      const expires = new Date(envelopes[currentIndex]?.expires_at || '');
      const diff = Math.max(0, expires.getTime() - Date.now());
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [envelopes, currentIndex]);

  const fetchUnclaimedEnvelopes = async () => {
    if (!user?.id) return;
    
    try {
      // First, get envelopes the user has already claimed
      const { data: claimedData } = await supabase
        .from('red_envelope_claims')
        .select('red_envelope_id')
        .eq('claimer_id', user.id);
      
      const claimedEnvelopeIds = new Set((claimedData || []).map(c => c.red_envelope_id));

      // Fetch available red envelopes
      const { data, error } = await supabase
        .from('red_envelopes')
        .select(`
          id,
          total_amount,
          recipient_count,
          claimed_count,
          expires_at,
          sender_id,
          profiles!red_envelopes_sender_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .neq('sender_id', user.id) // Don't show user's own envelopes
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return;

      if (data) {
        // Filter: not fully claimed AND not already claimed by this user
        const unclaimed = data
          .filter((e: any) => 
            (e.claimed_count || 0) < e.recipient_count && 
            !claimedEnvelopeIds.has(e.id)
          )
          .slice(0, 5);
          
        setEnvelopes(unclaimed.map((e: any) => ({
          id: e.id,
          total_amount: e.total_amount,
          recipient_count: e.recipient_count,
          claimed_count: e.claimed_count || 0,
          expires_at: e.expires_at,
          sender: {
            display_name: e.profiles?.display_name || 'Someone',
            avatar_url: e.profiles?.avatar_url
          }
        })));
      }
    } catch (error) {
      console.error('Error fetching red envelopes:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    const dismissUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
    sessionStorage.setItem('redEnvelopeBannerDismissed', dismissUntil.toISOString());
  };

  if (dismissed || envelopes.length === 0) return null;

  const currentEnvelope = envelopes[currentIndex];
  const remaining = currentEnvelope.recipient_count - currentEnvelope.claimed_count;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mx-3 mt-3 mb-2"
      >
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-orange-500 shadow-sm">
          <div className="flex items-center justify-between p-2.5 gap-2">
            {/* Left: Icon + Info */}
            <div 
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
              onClick={() => navigate(`/red-envelope?claim=${currentEnvelope.id}`)}
            >
              <span className="text-xl flex-shrink-0">🧧</span>
              
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-xs truncate">
                  {currentEnvelope.sender.display_name} shared a Red Envelope
                </p>
                <div className="flex items-center gap-2 text-white/70 text-[10px]">
                  <span>{remaining} left • {currentEnvelope.total_amount} Nexa</span>
                  <span className="flex items-center gap-0.5 bg-white/20 rounded px-1">
                    <Clock className="w-2.5 h-2.5" />
                    {countdown}
                  </span>
                </div>
              </div>
              
              <ChevronRight className="w-4 h-4 text-white/70 flex-shrink-0" />
            </div>

            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>

          {/* Pagination dots */}
          {envelopes.length > 1 && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1 pb-0.5">
              {envelopes.map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
