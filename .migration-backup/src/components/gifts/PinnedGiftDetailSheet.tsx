import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { GiftStatisticsSheet } from './GiftStatisticsSheet';
import { GiftImage } from './GiftImage';

interface GiftDetails {
  id: string;
  name: string;
  emoji: string;
  rarity: string;
  description: string | null;
  base_xp_cost: number;
  created_at: string;
  total_sent: number;
  price_multiplier: number;
  current_price: number;
  last_sender?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface PinnedGiftDetailSheetProps {
  giftId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getRarityColor = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary': return 'text-yellow-500';
    case 'epic': return 'text-purple-500';
    case 'rare': return 'text-blue-500';
    case 'uncommon': return 'text-green-500';
    default: return 'text-muted-foreground';
  }
};

const getRarityPercentage = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary': return '0.5%';
    case 'epic': return '2.4%';
    case 'rare': return '8.5%';
    case 'uncommon': return '23%';
    default: return '65.6%';
  }
};

export const PinnedGiftDetailSheet = ({ giftId, open, onOpenChange }: PinnedGiftDetailSheetProps) => {
  const [gift, setGift] = useState<GiftDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsSheetOpen, setStatsSheetOpen] = useState(false);

  useEffect(() => {
    if (giftId && open) {
      fetchGiftDetails();
    }
  }, [giftId, open]);

  const fetchGiftDetails = async () => {
    if (!giftId) return;
    
    setLoading(true);
    try {
      // Fetch gift details
      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .select('*')
        .eq('id', giftId)
        .single();

      if (giftError) throw giftError;

      // Fetch gift statistics
      const { data: statsData } = await supabase
        .from('gift_statistics')
        .select('total_sent, price_multiplier, last_sale_price')
        .eq('gift_id', giftId)
        .single();

      // Fetch last sender (most recent transaction)
      const { data: lastTransaction } = await supabase
        .from('gift_transactions')
        .select(`
          sender_id,
          profiles:sender_id (display_name, avatar_url)
        `)
        .eq('gift_id', giftId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const multiplier = statsData?.price_multiplier || 1;
      // Use last_sale_price if available, otherwise use base_xp_cost
      const currentPrice = statsData?.last_sale_price || giftData.base_xp_cost;

      setGift({
        ...giftData,
        total_sent: statsData?.total_sent || 0,
        price_multiplier: multiplier,
        current_price: currentPrice,
        last_sender: lastTransaction?.profiles as any,
      });
    } catch (error) {
      console.error('Error fetching gift details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Gift Details</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 pt-8">
            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : gift ? (
          <div className="space-y-6 pt-6 pb-8">
            {/* Gift Image */}
            <motion.div 
              className="flex justify-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse" />
                <div className="relative p-8">
                  <GiftImage
                    giftId={gift.id}
                    giftName={gift.name}
                    emoji={gift.emoji}
                    rarity={gift.rarity}
                    size="xl"
                  />
                </div>
              </div>
            </motion.div>

            {/* Gift Name */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold truncate">{gift.name}</h2>
              <p className="text-muted-foreground">Collectible #{gift.id.slice(0, 8)}</p>
            </div>

            {/* Details Table */}
            <div className="bg-muted/20 rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
              {/* Last Sender / Owner */}
              {gift.last_sender && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground font-medium">Last Sent By</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={gift.last_sender.avatar_url || undefined} />
                      <AvatarFallback>{gift.last_sender.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{gift.last_sender.display_name}</span>
                  </div>
                </div>
              )}

              {/* Rarity */}
              <div className="flex items-center justify-between p-4">
                <span className="text-muted-foreground font-medium">Rarity</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold capitalize">{gift.rarity}</span>
                  <Badge variant="secondary" className={getRarityColor(gift.rarity)}>
                    {getRarityPercentage(gift.rarity)}
                  </Badge>
                </div>
              </div>

              {/* Total Sent */}
              <div className="flex items-center justify-between p-4">
                <span className="text-muted-foreground font-medium">Total Sent</span>
                <span className="font-semibold">{gift.total_sent.toLocaleString()} times</span>
              </div>

              {/* Base Value */}
              <div className="flex items-center justify-between p-4">
                <span className="text-muted-foreground font-medium">Base Value</span>
                <span className="font-semibold">{gift.base_xp_cost.toLocaleString()} Nexa</span>
              </div>

              {/* Current Value */}
              <div className="flex items-center justify-between p-4">
                <span className="text-muted-foreground font-medium">Current Value</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">{gift.current_price.toLocaleString()} Nexa</span>
                  {(() => {
                    const percentIncrease = ((gift.current_price - gift.base_xp_cost) / gift.base_xp_cost * 100).toFixed(1);
                    return gift.current_price > gift.base_xp_cost ? (
                      <Badge variant="secondary" className="text-green-500 font-semibold">
                        +{percentIncrease}%
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center justify-between p-4">
                <span className="text-muted-foreground font-medium">Created</span>
                <span className="font-semibold">
                  {new Date(gift.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>

            {/* Description */}
            {gift.description && (
              <div className="bg-muted/20 rounded-2xl border border-border/50 p-4">
                <p className="text-sm text-muted-foreground text-center italic">
                  "{gift.description}"
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => onOpenChange(false)} 
                variant="outline"
                className="h-12 font-semibold rounded-xl"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  setStatsSheetOpen(true);
                }}
                className="h-12 font-semibold rounded-xl bg-primary hover:bg-primary/90"
              >
                Learn More
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>

      {/* Statistics Sheet */}
      <GiftStatisticsSheet 
        giftId={giftId}
        open={statsSheetOpen}
        onOpenChange={setStatsSheetOpen}
      />
    </Sheet>
  );
};
