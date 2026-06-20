import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Gift as GiftIcon } from 'lucide-react';
import { GiftImage } from './GiftImage';

interface Gift {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  base_xp_cost: number;
  rarity: string;
  season: string | null;
  current_price?: number;
  total_sent?: number;
  price_multiplier?: number;
}

interface GiftPreviewModalProps {
  gift: Gift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendGift?: () => void;
}

export const GiftPreviewModal = ({ gift, open, onOpenChange, onSendGift }: GiftPreviewModalProps) => {
  const [isRotating, setIsRotating] = useState(true);

  if (!gift) return null;

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'epic': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'rare': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'uncommon': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'shadow-[0_0_80px_rgba(234,179,8,0.4)]';
      case 'epic': return 'shadow-[0_0_60px_rgba(168,85,247,0.4)]';
      case 'rare': return 'shadow-[0_0_40px_rgba(59,130,246,0.4)]';
      case 'uncommon': return 'shadow-[0_0_30px_rgba(34,197,94,0.3)]';
      default: return '';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto p-0 rounded-t-3xl bg-gradient-to-b from-background via-background to-primary/10" onOpenChange={onOpenChange}>
        <div className="relative">
          {/* 3D Preview Section */}
          <div className="relative h-96 flex items-center justify-center p-8 perspective-1000">
            <div
              className={`relative ${isRotating ? 'animate-[spin_8s_linear_infinite]' : ''}`}
              style={{ transformStyle: 'preserve-3d' }}
              onMouseEnter={() => setIsRotating(false)}
              onMouseLeave={() => setIsRotating(true)}
            >
              <div className={`relative ${getRarityGlow(gift.rarity)}`}>
                <GiftImage
                  giftId={gift.id}
                  giftName={gift.name}
                  emoji={gift.emoji}
                  rarity={gift.rarity}
                  size="xl"
                  className="transform-gpu transition-transform duration-500 hover:scale-110"
                />
              </div>
            </div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Details Section */}
          <div className="p-6 space-y-6 border-t border-border/50 bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl">
            <SheetHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <SheetTitle className="text-2xl font-bold flex items-center gap-2 truncate">
                    <span className="truncate">{gift.name}</span>
                    <Badge className={`${getRarityColor(gift.rarity)} text-xs flex-shrink-0`}>
                      {gift.rarity}
                    </Badge>
                  </SheetTitle>
                  {gift.description && (
                    <p className="text-sm text-muted-foreground">{gift.description}</p>
                  )}
                </div>
              </div>
            </SheetHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-xs font-medium text-muted-foreground mb-2">Price</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {(gift.current_price || gift.base_xp_cost).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">Nexa</span>
                  {gift.price_multiplier && gift.price_multiplier !== 1 && (
                    <Badge variant="secondary" className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {((gift.price_multiplier - 1) * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>

              {gift.total_sent !== undefined && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Total Sent</div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <span className="text-3xl font-extrabold text-foreground">
                      {gift.total_sent.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Season info */}
            {gift.season && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">🎄 Seasonal Item</span>
                  <Badge variant="outline" className="text-xs">
                    {gift.season}
                  </Badge>
                </div>
              </div>
            )}

            {/* Action button */}
            {onSendGift && (
              <Button
                onClick={onSendGift}
                className="w-full h-14 text-lg font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 bg-gradient-to-r from-primary via-accent to-primary"
                size="lg"
              >
                <GiftIcon className="h-5 w-5 mr-2" />
                Send This Gift
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
