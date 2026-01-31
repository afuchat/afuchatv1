import { motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { GiftImage } from '@/components/gifts/GiftImage';

interface ChatGiftProps {
  gift: {
    id: string;
    gift_id: string;
    sender_id: string;
    receiver_id: string;
    xp_cost: number;
    message: string | null;
    is_anonymous: boolean;
    created_at: string;
    sender?: {
      display_name: string;
      avatar_url: string | null;
    };
    receiver?: {
      display_name: string;
      avatar_url: string | null;
    };
    gift?: {
      name: string;
      emoji: string;
      rarity: string;
      description: string;
    };
  };
  isOwn: boolean;
}

export const ChatGift = ({ gift, isOwn }: ChatGiftProps) => {
  const senderName = gift.is_anonymous ? 'Anonymous' : (gift.sender?.display_name || 'Someone');
  const receiverName = gift.receiver?.display_name || 'Someone';
  const giftInfo = gift.gift;
  const time = new Date(gift.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getRarityGlow = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'shadow-[0_0_20px_rgba(234,179,8,0.4)]';
      case 'epic':
        return 'shadow-[0_0_20px_rgba(168,85,247,0.4)]';
      case 'rare':
        return 'shadow-[0_0_20px_rgba(59,130,246,0.4)]';
      case 'uncommon':
        return 'shadow-[0_0_20px_rgba(34,197,94,0.4)]';
      default:
        return '';
    }
  };

  const getRarityAccent = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'text-yellow-500';
      case 'epic':
        return 'text-purple-500';
      case 'rare':
        return 'text-blue-500';
      case 'uncommon':
        return 'text-green-500';
      default:
        return 'text-primary';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div
        className={`${
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        } rounded-2xl ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'} max-w-[85%] overflow-hidden`}
      >
        {/* Gift Image Display - like how GIFs show */}
        <div className="p-2">
          <div className={`relative rounded-xl overflow-hidden bg-black/20 ${getRarityGlow(giftInfo?.rarity || '')}`}>
            {giftInfo ? (
              <div className="p-4 flex items-center justify-center min-h-[120px]">
                <GiftImage
                  giftId={gift.gift_id}
                  giftName={giftInfo.name}
                  emoji={giftInfo.emoji}
                  rarity={giftInfo.rarity}
                  size="lg"
                  className="drop-shadow-lg"
                />
              </div>
            ) : (
              <div className="p-6 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gift className="h-8 w-8 text-primary" />
                </div>
              </div>
            )}
            
            {/* Rarity sparkle overlay */}
            {giftInfo?.rarity && ['legendary', 'epic'].includes(giftInfo.rarity.toLowerCase()) && (
              <div className="absolute top-2 right-2">
                <Sparkles className={`h-4 w-4 ${getRarityAccent(giftInfo.rarity)} animate-pulse`} />
              </div>
            )}
          </div>
        </div>

        {/* Gift info caption */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Gift className={`h-3.5 w-3.5 ${getRarityAccent(giftInfo?.rarity || '')}`} />
            <span className={`text-xs font-semibold ${getRarityAccent(giftInfo?.rarity || '')}`}>
              {giftInfo?.name || 'Gift'}
            </span>
          </div>
          
          <p className="text-xs opacity-80">
            {isOwn ? (
              <>Sent to {receiverName}</>
            ) : (
              <>{senderName} sent you a gift!</>
            )}
          </p>
          
          {gift.message && (
            <p className="text-xs italic opacity-70 mt-1">
              "{gift.message}"
            </p>
          )}

          {/* Timestamp and cost */}
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] font-medium ${getRarityAccent(giftInfo?.rarity || '')} opacity-80`}>
              {gift.xp_cost.toLocaleString()} Nexa
            </span>
            <span className="text-[10px] opacity-70">{time}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
