import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { X, ChevronRight, ChevronLeft, Clock } from 'lucide-react';

interface ChristmasGift {
  id: string;
  name: string;
  emoji: string;
  rarity: string;
  base_xp_cost: number;
}

export const ChristmasGiftsBanner = () => {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState<ChristmasGift[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 });

  useEffect(() => {
    // Check if already dismissed
    const dismissedUntil = sessionStorage.getItem('christmasBannerDismissed');
    if (dismissedUntil) {
      const dismissedTime = new Date(dismissedUntil);
      if (dismissedTime > new Date()) {
        setDismissed(true);
        return;
      }
    }

    // Check if it's Christmas season (December 1 - January 6)
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    
    const isChristmasSeason = 
      (month === 11) || // December
      (month === 0 && day <= 6); // January 1-6
    
    if (isChristmasSeason) {
      setShowBanner(true);
      fetchChristmasGifts();
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!showBanner) return;

    const calculateCountdown = () => {
      const now = new Date();
      let endDate: Date;
      
      if (now.getMonth() === 11) {
        endDate = new Date(now.getFullYear() + 1, 0, 7, 0, 0, 0);
      } else {
        endDate = new Date(now.getFullYear(), 0, 7, 0, 0, 0);
      }

      const diff = endDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown({ days, hours, mins });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [showBanner]);

  // Auto-slide carousel
  useEffect(() => {
    if (gifts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % gifts.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [gifts.length]);

  const fetchChristmasGifts = async () => {
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select('id, name, emoji, rarity, base_xp_cost')
        .or('season.eq.christmas,season.eq.winter')
        .limit(6);

      if (!error && data && data.length > 0) {
        setGifts(data);
      } else {
        // Fallback: fetch any gifts with Christmas-related names
        const { data: fallbackData } = await supabase
          .from('gifts')
          .select('id, name, emoji, rarity, base_xp_cost')
          .or('name.ilike.%christmas%,name.ilike.%xmas%,name.ilike.%winter%,name.ilike.%snow%')
          .limit(6);
        
        if (fallbackData && fallbackData.length > 0) {
          setGifts(fallbackData);
        }
      }
    } catch (error) {
      console.error('Error fetching Christmas gifts:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    const dismissUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
    sessionStorage.setItem('christmasBannerDismissed', dismissUntil.toISOString());
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % gifts.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + gifts.length) % gifts.length);
  };

  if (dismissed || !showBanner) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-3 mt-3 mb-2"
    >
      <div 
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-green-700 shadow-lg cursor-pointer"
        onClick={() => navigate('/christmas-gifts')}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1 left-2 text-lg">❄️</div>
          <div className="absolute bottom-1 right-2 text-lg">🎄</div>
        </div>

        <div className="relative p-3">
          {/* Top row: Title + Countdown + Dismiss */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎅</span>
              <span className="text-white font-bold text-sm">Christmas Gifts</span>
            </div>
            
            {/* Countdown */}
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3 text-yellow-300" />
              <span className="text-[10px] text-white font-medium">
                {countdown.days}d {countdown.hours}h {countdown.mins}m
              </span>
            </div>

            {/* Dismiss */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>

          {/* Carousel */}
          {gifts.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Prev button */}
              {gifts.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
              )}

              {/* Gift display */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-3xl">{gifts[currentIndex]?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {gifts[currentIndex]?.name}
                      </p>
                      <p className="text-white/70 text-xs">
                        {gifts[currentIndex]?.base_xp_cost} Nexa • {gifts[currentIndex]?.rarity}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next button */}
              {gifts.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          )}

          {/* Pagination dots */}
          {gifts.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-2">
              {gifts.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center justify-center mt-2">
            <span className="text-white/80 text-xs flex items-center gap-1">
              Tap to explore limited editions
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
