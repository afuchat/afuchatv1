import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Sparkles, Calendar } from 'lucide-react';
import { GiftImage } from './GiftImage';

interface GiftStats {
  current_price: number;
  total_sent: number;
  price_multiplier: number;
  initial_sale_date: string | null;
  initial_price: number | null;
  last_sale_date: string | null;
  last_price: number | null;
  min_price: number | null;
  avg_price: number | null;
  price_change_percent: number | null;
}

interface RecentTransaction {
  id: string;
  sender: {
    display_name: string;
    handle: string;
  };
  receiver: {
    display_name: string;
    handle: string;
  };
  created_at: string;
  xp_cost: number;
}

interface GiftDetails {
  id: string;
  name: string;
  emoji: string;
  rarity: string;
  description: string | null;
  base_xp_cost: number;
  created_at: string;
}

interface GiftStatisticsSheetProps {
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

export const GiftStatisticsSheet = ({ giftId, open, onOpenChange }: GiftStatisticsSheetProps) => {
  const [gift, setGift] = useState<GiftDetails | null>(null);
  const [stats, setStats] = useState<GiftStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(false);

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
      setGift(giftData);

      // Fetch gift statistics
      const { data: statsData } = await supabase
        .from('gift_statistics')
        .select('*')
        .eq('gift_id', giftId)
        .single();

      // Use last_sale_price if available, otherwise use base_xp_cost
      const currentPrice = statsData?.last_sale_price || giftData.base_xp_cost;

      // Fetch transaction data for detailed stats
      const { data: allTransactions } = await supabase
        .from('gift_transactions')
        .select('xp_cost, created_at')
        .eq('gift_id', giftId)
        .order('created_at', { ascending: true });

      let initialSaleDate = null;
      let initialPrice = null;
      let lastSaleDate = null;
      let lastPrice = null;
      let minPrice = null;
      let avgPrice = null;
      let priceChangePercent = null;

      if (allTransactions && allTransactions.length > 0) {
        initialSaleDate = allTransactions[0].created_at;
        initialPrice = allTransactions[0].xp_cost;
        lastSaleDate = allTransactions[allTransactions.length - 1].created_at;
        lastPrice = allTransactions[allTransactions.length - 1].xp_cost;
        
        const prices = allTransactions.map(tx => tx.xp_cost);
        minPrice = Math.min(...prices);
        avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        
        if (initialPrice > 0) {
          priceChangePercent = ((lastPrice - initialPrice) / initialPrice) * 100;
        }
      }

      setStats({
        current_price: currentPrice,
        total_sent: statsData?.total_sent || 0,
        price_multiplier: statsData?.price_multiplier || 1,
        initial_sale_date: initialSaleDate,
        initial_price: initialPrice,
        last_sale_date: lastSaleDate,
        last_price: lastPrice,
        min_price: minPrice,
        avg_price: avgPrice,
        price_change_percent: priceChangePercent
      });

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('gift_transactions')
        .select(`
          id,
          created_at,
          xp_cost,
          sender:sender_id(display_name, handle),
          receiver:receiver_id(display_name, handle)
        `)
        .eq('gift_id', giftId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactions) {
        setRecentTransactions(transactions as any);
      }

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
          <SheetTitle>Gift Statistics</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 pt-8">
            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : gift && stats ? (
          <div className="space-y-6 pt-6 pb-8">
            {/* Gift Header */}
            <motion.div 
              className="flex flex-col items-center gap-4"
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
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold truncate">{gift.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-semibold capitalize">{gift.rarity}</span>
                  <Badge variant="secondary" className={getRarityColor(gift.rarity)}>
                    {getRarityPercentage(gift.rarity)}
                  </Badge>
                </div>
              </div>
            </motion.div>

            {/* Current Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/20 rounded-2xl border border-border/50 p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">
                  {stats.current_price.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Current Price</p>
              </div>

              <div className="bg-muted/20 rounded-2xl border border-border/50 p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {(() => {
                    const percentIncrease = ((stats.current_price - gift.base_xp_cost) / gift.base_xp_cost * 100).toFixed(1);
                    return stats.current_price > gift.base_xp_cost ? `+${percentIncrease}%` : '0%';
                  })()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Increase</p>
              </div>

              <div className="bg-muted/20 rounded-2xl border border-border/50 p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">
                  {stats.total_sent.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Sent</p>
              </div>
            </div>

            {/* Detailed Statistics */}
            <div className="bg-muted/20 rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
              {stats.initial_sale_date && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground font-medium">Initial Sale</span>
                  <span className="font-semibold">
                    {new Date(stats.initial_sale_date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              
              {stats.initial_price && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground font-medium">Initial Price</span>
                  <span className="font-semibold">{stats.initial_price.toLocaleString()} Nexa</span>
                </div>
              )}

              {stats.last_sale_date && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground font-medium">Last Sale</span>
                  <span className="font-semibold">
                    {new Date(stats.last_sale_date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              )}

              {stats.last_price && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground font-medium">Last Price</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{stats.last_price.toLocaleString()} Nexa</span>
                    {stats.price_change_percent !== null && (
                      <Badge variant="secondary" className={stats.price_change_percent >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {stats.price_change_percent >= 0 ? '+' : ''}{stats.price_change_percent.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {stats.min_price && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground font-medium">Minimum Price</span>
                  <span className="font-semibold">{stats.min_price.toLocaleString()} Nexa</span>
                </div>
              )}

              {stats.avg_price && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground font-medium">Average Price</span>
                  <span className="font-semibold">{stats.avg_price.toLocaleString()} Nexa</span>
                </div>
              )}

              <div className="flex items-center justify-between p-4">
                <span className="text-muted-foreground font-medium">Base Value</span>
                <span className="font-semibold">{gift.base_xp_cost.toLocaleString()} Nexa</span>
              </div>

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

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recent Transactions
                </h3>
                <div className="space-y-3">
                  {recentTransactions.map(tx => (
                    <div key={tx.id} className="bg-muted/20 rounded-2xl border border-border/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">@{tx.sender.handle}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">@{tx.receiver.handle}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{tx.xp_cost.toLocaleString()} Nexa</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {gift.description && (
              <div className="bg-muted/20 rounded-2xl border border-border/50 p-4">
                <p className="text-sm text-muted-foreground text-center italic">
                  "{gift.description}"
                </p>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
