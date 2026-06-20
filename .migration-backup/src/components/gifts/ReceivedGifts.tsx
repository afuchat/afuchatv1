import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, TrendingUp, Sparkles, Pin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GiftImage } from './GiftImage';
import { GiftDetailSheet } from './GiftDetailSheet';
import { toast } from 'sonner';

interface OwnedGift {
  gift_id: string;
  count: number;
  gift: {
    id: string;
    name: string;
    emoji: string;
    rarity: string;
    description?: string;
    base_xp_cost: number;
  };
}

interface GiftStatistics {
  price_multiplier: number;
  total_sent: number;
  last_sale_price?: number | null;
}

interface ReceivedGiftsProps {
  userId: string;
}

const getRarityColor = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'epic': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'rare': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'uncommon': return 'bg-green-500/10 text-green-500 border-green-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const ReceivedGifts = ({ userId }: ReceivedGiftsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [ownedGifts, setOwnedGifts] = useState<OwnedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [giftStats, setGiftStats] = useState<Record<string, GiftStatistics>>({});
  const [profileName, setProfileName] = useState<string>('');
  const [pinnedGiftIds, setPinnedGiftIds] = useState<Set<string>>(new Set());
  
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    fetchOwnedGifts();
    fetchProfileName();
    if (isOwnProfile) {
      fetchPinnedGifts();
    }

    // Real-time subscription for new gifts
    const subscription = supabase
      .channel('user_gifts_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_gifts',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchOwnedGifts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, isOwnProfile]);

  const fetchPinnedGifts = async () => {
    const { data } = await supabase
      .from('pinned_gifts')
      .select('gift_id')
      .eq('user_id', userId);
    
    if (data) {
      setPinnedGiftIds(new Set(data.map(p => p.gift_id)));
    }
  };

  const fetchProfileName = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    if (data) {
      setProfileName(data.display_name);
    }
  };

  const fetchOwnedGifts = async () => {
    try {
      // Fetch user's owned gifts from user_gifts table
      const { data: userGifts, error: userGiftsError } = await supabase
        .from('user_gifts')
        .select('gift_id')
        .eq('user_id', userId);

      if (userGiftsError) throw userGiftsError;
      if (!userGifts || userGifts.length === 0) {
        setOwnedGifts([]);
        setTotalValue(0);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // Count gifts by gift_id
      const giftCounts = userGifts.reduce((acc, ug) => {
        acc[ug.gift_id] = (acc[ug.gift_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const giftIds = Object.keys(giftCounts);

      // Fetch gift details
      const { data: giftDetails, error: giftError } = await supabase
        .from('gifts')
        .select('id, name, emoji, rarity, description, base_xp_cost')
        .in('id', giftIds);

      if (giftError) throw giftError;

      // Fetch gift statistics
      const { data: statsData } = await supabase
        .from('gift_statistics')
        .select('gift_id, price_multiplier, total_sent, last_sale_price')
        .in('gift_id', giftIds);

      if (statsData) {
        const statsMap: Record<string, GiftStatistics> = {};
        statsData.forEach((stat: any) => {
          statsMap[stat.gift_id] = {
            price_multiplier: parseFloat(stat.price_multiplier),
            total_sent: stat.total_sent,
            last_sale_price: stat.last_sale_price,
          };
        });
        setGiftStats(statsMap);
      }

      // Format owned gifts with counts
      const formattedGifts: OwnedGift[] = (giftDetails || []).map((gift: any) => ({
        gift_id: gift.id,
        count: giftCounts[gift.id] || 0,
        gift: {
          id: gift.id,
          name: gift.name,
          emoji: gift.emoji,
          rarity: gift.rarity,
          description: gift.description,
          base_xp_cost: gift.base_xp_cost,
        },
      })).sort((a, b) => {
        // Sort by rarity (legendary > epic > rare > uncommon > common), then by count
        const rarityOrder: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        const rarityDiff = (rarityOrder[b.gift.rarity.toLowerCase()] || 0) - (rarityOrder[a.gift.rarity.toLowerCase()] || 0);
        if (rarityDiff !== 0) return rarityDiff;
        return b.count - a.count;
      });

      setOwnedGifts(formattedGifts);
      setTotalCount(userGifts.length);

      // Calculate total value
      const statsMap = statsData ? new Map(statsData.map((s: any) => [s.gift_id, s])) : new Map();
      const total = formattedGifts.reduce((sum, g) => {
        const stats = statsMap.get(g.gift_id);
        const baseCost = g.gift.base_xp_cost;
        const currentPrice = stats?.last_sale_price || baseCost;
        return sum + (currentPrice * g.count);
      }, 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error fetching owned gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePinToggle = async (e: React.MouseEvent, giftId: string) => {
    e.stopPropagation();
    
    if (pinnedGiftIds.has(giftId)) {
      const { error } = await supabase
        .from('pinned_gifts')
        .delete()
        .eq('user_id', userId)
        .eq('gift_id', giftId);
      
      if (!error) {
        setPinnedGiftIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(giftId);
          return newSet;
        });
        toast.success('Gift unpinned');
      }
    } else {
      if (pinnedGiftIds.size >= 6) {
        toast.error('You can only pin up to 6 gifts');
        return;
      }
      
      const { error } = await supabase
        .from('pinned_gifts')
        .insert({ user_id: userId, gift_id: giftId });
      
      if (!error) {
        setPinnedGiftIds(prev => new Set(prev).add(giftId));
        toast.success('Gift pinned to profile');
      }
    }
  };
  
  const isRareGift = (rarity: string) => {
    return ['rare', 'epic', 'legendary'].includes(rarity.toLowerCase());
  };

  const calculatePrice = (giftId: string, baseCost: number) => {
    const stats = giftStats[giftId];
    if (stats?.last_sale_price) return stats.last_sale_price;
    return baseCost;
  };

  const handleGiftClick = (gift: OwnedGift) => {
    setSelectedGiftId(gift.gift.id);
    setDetailsSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (ownedGifts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('gifts.noGiftsReceived')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-border/50 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {totalCount} Collectibles
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {ownedGifts.length} unique • {totalValue.toLocaleString()} ACoin value
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Gift className="h-12 w-12 text-primary relative" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ownedGifts.map((ownedGift) => (
          <Card 
            key={ownedGift.gift_id} 
            onClick={() => handleGiftClick(ownedGift)}
            className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group relative p-4 bg-card/50 border-border/50"
          >
            <div className="space-y-3">
              {/* Gift Image */}
              <div className="relative flex justify-center">
                <GiftImage
                  giftId={ownedGift.gift.id}
                  giftName={ownedGift.gift.name}
                  emoji={ownedGift.gift.emoji}
                  rarity={ownedGift.gift.rarity}
                  size="lg"
                  className="mx-auto"
                />
                <Badge className={`absolute -top-1 -right-1 ${getRarityColor(ownedGift.gift.rarity)} text-[10px] px-1.5 py-0.5`}>
                  {ownedGift.gift.rarity}
                </Badge>
                
                {/* Count Badge */}
                {ownedGift.count > 1 && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md">
                    x{ownedGift.count}
                  </div>
                )}
                
                {isOwnProfile && isRareGift(ownedGift.gift.rarity) && (
                  <Button
                    size="sm"
                    variant={pinnedGiftIds.has(ownedGift.gift.id) ? 'default' : 'ghost'}
                    className="absolute -top-1 -left-1 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handlePinToggle(e, ownedGift.gift.id)}
                  >
                    <Pin className={`h-3 w-3 ${pinnedGiftIds.has(ownedGift.gift.id) ? 'fill-current' : ''}`} />
                  </Button>
                )}
              </div>

              {/* Gift Details */}
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-sm truncate" title={ownedGift.gift.name}>{ownedGift.gift.name}</h3>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-bold text-primary">
                    {calculatePrice(ownedGift.gift_id, ownedGift.gift.base_xp_cost).toLocaleString()} ACoin
                  </span>
                </div>
                
                {(() => {
                  const currentPrice = calculatePrice(ownedGift.gift_id, ownedGift.gift.base_xp_cost);
                  const basePrice = ownedGift.gift.base_xp_cost;
                  const percentIncrease = ((currentPrice - basePrice) / basePrice * 100).toFixed(1);
                  
                  return currentPrice > basePrice ? (
                    <div className="flex items-center justify-center gap-0.5 text-[10px] text-green-500 font-semibold">
                      <TrendingUp className="h-2.5 w-2.5" />
                      <span>+{percentIncrease}%</span>
                    </div>
                  ) : null;
                })()}

                {giftStats[ownedGift.gift_id] && giftStats[ownedGift.gift_id].total_sent > 0 && (
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>{giftStats[ownedGift.gift_id].total_sent.toLocaleString()} sent</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <GiftDetailSheet
        giftId={selectedGiftId}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        recipientId={userId}
        recipientName={profileName}
        isOwnProfile={isOwnProfile}
      />
    </div>
  );
};
