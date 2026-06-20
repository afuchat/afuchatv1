import { Card, CardContent } from '@/components/ui/card';
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

  const getRarityGradient = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'from-yellow-500/20 to-amber-600/20 border-yellow-500/30';
      case 'epic':
        return 'from-purple-500/20 to-violet-600/20 border-purple-500/30';
      case 'rare':
        return 'from-blue-500/20 to-primary/20 border-blue-500/30';
      case 'uncommon':
        return 'from-green-500/20 to-emerald-600/20 border-green-500/30';
      default:
        return 'from-primary/10 to-primary/5 border-primary/20';
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
    <div className="flex justify-center mb-3">
      <Card className={`bg-gradient-to-br ${getRarityGradient(giftInfo?.rarity || '')} max-w-xs w-full`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Gift Image */}
            <div className="flex-shrink-0">
              {giftInfo ? (
                <GiftImage
                  giftId={gift.gift_id}
                  giftName={giftInfo.name}
                  emoji={giftInfo.emoji}
                  rarity={giftInfo.rarity}
                  size="md"
                  className="drop-shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gift className="h-7 w-7 text-primary" />
                </div>
              )}
            </div>

            {/* Gift Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className={`h-3.5 w-3.5 ${getRarityAccent(giftInfo?.rarity || '')}`} />
                <span className={`text-xs font-semibold ${getRarityAccent(giftInfo?.rarity || '')}`}>
                  {giftInfo?.name || 'Gift'} 🎁
                </span>
              </div>

              <p className="text-sm font-medium">
                {isOwn ? (
                  <>You sent a gift to <span className={getRarityAccent(giftInfo?.rarity || '')}>{receiverName}</span></>
                ) : (
                  <><span className={getRarityAccent(giftInfo?.rarity || '')}>{senderName}</span> sent you a gift!</>
                )}
              </p>

              {gift.message && (
                <p className="text-xs italic mt-1 text-muted-foreground line-clamp-2">
                  "{gift.message}"
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">{time}</span>
                <span className={`text-[11px] font-semibold ${getRarityAccent(giftInfo?.rarity || '')}`}>
                  {gift.xp_cost.toLocaleString()} Nexa
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
