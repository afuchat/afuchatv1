import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { PinnedGiftDetailSheet } from './PinnedGiftDetailSheet';
import { GiftImage } from './GiftImage';
import { useSubscription } from '@/hooks/useSubscription';

interface PinnedGift {
  id: string;
  gift: {
    id: string;
    name: string;
    emoji: string;
    rarity: string;
  };
}

interface PinnedGiftsDisplayProps {
  userId: string;
  className?: string;
}

export const PinnedGiftsDisplay = ({ userId, className = '' }: PinnedGiftsDisplayProps) => {
  const [pinnedGifts, setPinnedGifts] = useState<PinnedGift[]>([]);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { getMaxPinnedGifts } = useSubscription(userId);
  
  // Get max pinned gifts based on subscription tier
  const maxPinnedGifts = getMaxPinnedGifts();

  useEffect(() => {
    fetchPinnedGifts();
  }, [userId, maxPinnedGifts]);

  const fetchPinnedGifts = async () => {
    const { data, error } = await supabase
      .from('pinned_gifts')
      .select(`
        id,
        gift:gifts(id, name, emoji, rarity)
      `)
      .eq('user_id', userId)
      .order('pinned_at', { ascending: false })
      .limit(maxPinnedGifts);

    console.log('Pinned gifts data:', data, 'error:', error);

    if (!error && data) {
      setPinnedGifts(data as PinnedGift[]);
      console.log('Set pinned gifts:', data);
    }
  };

  if (pinnedGifts.length === 0) return null;

  // Positions for 1-3 gifts
  const positions = [
    { top: '-15%', left: '50%', transform: 'translate(-50%, -50%)' },
    { top: '12%', right: '-15%', transform: 'translate(50%, -50%)' },
    { top: '12%', left: '-15%', transform: 'translate(-50%, -50%)' },
  ];

  return (
    <>
      <div className="absolute inset-0 pointer-events-none">
        {pinnedGifts.map((pinnedGift, index) => {
          const position = positions[index % positions.length];
          return (
            <motion.div
              key={pinnedGift.id}
              className="absolute pointer-events-auto z-0 cursor-pointer"
              style={position}
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                rotate: 0
              }}
              transition={{ 
                delay: index * 0.1, 
                type: 'spring', 
                stiffness: 300, 
                damping: 20
              }}
              whileHover={{ 
                scale: 1.3, 
                rotate: 15,
                transition: { type: 'spring', stiffness: 400, damping: 10 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedGiftId(pinnedGift.gift.id);
                setDetailsOpen(true);
              }}
            >
              <GiftImage
                giftId={pinnedGift.gift.id}
                giftName={pinnedGift.gift.name}
                emoji={pinnedGift.gift.emoji}
                rarity={pinnedGift.gift.rarity}
                size="sm"
                className="pointer-events-none"
              />
            </motion.div>
          );
        })}
      </div>

      <PinnedGiftDetailSheet
        giftId={selectedGiftId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
};
