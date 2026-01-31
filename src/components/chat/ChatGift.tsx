import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

  const getRarityGradient = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'from-yellow-500/20 to-amber-600/20';
      case 'epic':
        return 'from-purple-500/20 to-violet-600/20';
      case 'rare':
        return 'from-blue-500/20 to-cyan-600/20';
      case 'uncommon':
        return 'from-green-500/20 to-emerald-600/20';
      default:
        return 'from-muted/50 to-muted/30';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'border-yellow-500/30';
      case 'epic':
        return 'border-purple-500/30';
      case 'rare':
        return 'border-blue-500/30';
      case 'uncommon':
        return 'border-green-500/30';
      default:
        return 'border-border/30';
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <Card className={`max-w-xs ${getRarityBorder(giftInfo?.rarity || '')} bg-gradient-to-br ${getRarityGradient(giftInfo?.rarity || '')} overflow-hidden`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Gift Image */}
            <div className="flex-shrink-0">
              {giftInfo ? (
                <GiftImage
                  giftId={gift.gift_id}
                  giftName={giftInfo.name}
                  emoji={giftInfo.emoji}
                  rarity={giftInfo.rarity}
                  size="sm"
                  className="drop-shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>

            {/* Gift Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">Gift</span>
              </div>

              <p className="text-sm font-medium">
                {isOwn ? (
                  <>You sent a <span className="text-primary">{giftInfo?.name || 'gift'}</span> to {receiverName}</>
                ) : (
                  <>{senderName} sent a <span className="text-primary">{giftInfo?.name || 'gift'}</span></>
                )}
              </p>

              {gift.message && (
                <p className="text-xs italic mt-1 text-muted-foreground">
                  "{gift.message}"
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(gift.created_at).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                <span className="text-[10px] font-medium text-primary/80">
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
