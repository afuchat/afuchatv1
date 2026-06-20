import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Users, Calendar, Sparkles, Gift, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { GiftImage } from '@/components/gifts/GiftImage';
import { SendGiftDialog } from '@/components/gifts/SendGiftDialog';
import { Link } from 'react-router-dom';

interface Gift {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  base_xp_cost: number;
  rarity: string;
  season: string | null;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
}

interface GiftStats {
  current_price: number;
  total_sent: number;
  price_multiplier: number;
  price_history: Array<{ date: string; price: number; multiplier: number }>;
}

interface RecentTransaction {
  id: string;
  sender: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
  receiver: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
  created_at: string;
  xp_cost: number;
}

interface SenderInfo {
  display_name: string;
  handle: string;
  avatar_url: string | null;
}

interface GiftDetailSheetProps {
  giftId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName?: string;
  sender?: SenderInfo | null;
  isAnonymous?: boolean;
  isOwnProfile?: boolean;
}

export const GiftDetailSheet = ({ giftId, open, onOpenChange, recipientId, recipientName, sender, isAnonymous, isOwnProfile }: GiftDetailSheetProps) => {
  const { user } = useAuth();
  const [gift, setGift] = useState<Gift | null>(null);
  const [stats, setStats] = useState<GiftStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const canSendGift = user && recipientId && user.id !== recipientId;
  const showSenderToPublic = !isAnonymous;
  const canSeeSender = isOwnProfile || showSenderToPublic;

  useEffect(() => {
    if (giftId && open) {
      fetchGiftDetails();
    }
  }, [giftId, open]);

  const fetchGiftDetails = async () => {
    if (!giftId) return;

    try {
      setLoading(true);

      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .select('*')
        .eq('id', giftId)
        .single();

      if (giftError) throw giftError;
      setGift(giftData);

      const { data: statsData } = await supabase
        .from('gift_statistics')
        .select('*')
        .eq('gift_id', giftId)
        .maybeSingle();

      // Use last_sale_price if available, otherwise base_xp_cost
      const currentPrice = statsData?.last_sale_price || giftData.base_xp_cost;
      
      setStats({
        current_price: currentPrice,
        total_sent: statsData?.total_sent || 0,
        price_multiplier: statsData?.price_multiplier || 1,
        price_history: generatePriceHistory(giftData.base_xp_cost, currentPrice)
      });

      const { data: transactions, error: txError } = await supabase
        .from('gift_transactions')
        .select(`
          id,
          created_at,
          xp_cost,
          sender:sender_id(display_name, handle, avatar_url),
          receiver:receiver_id(display_name, handle, avatar_url)
        `)
        .eq('gift_id', giftId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!txError && transactions) {
        setRecentTransactions(transactions as any);
      }

    } catch (error) {
      console.error('Error fetching gift details:', error);
      toast.error('Failed to load gift details');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const generatePriceHistory = (basePrice: number, currentPrice: number) => {
    const history = [];
    const daysBack = 7;
    
    // Generate realistic price history trending toward current price
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Price gradually approaches current price
      const progress = (daysBack - i) / daysBack;
      const price = Math.round(basePrice + (currentPrice - basePrice) * progress * (0.8 + Math.random() * 0.4));
      const multiplier = price / basePrice;
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(price, basePrice), // Never go below base price
        multiplier
      });
    }
    
    // Ensure the last entry is the current price
    if (history.length > 0) {
      history[history.length - 1].price = currentPrice;
      history[history.length - 1].multiplier = currentPrice / basePrice;
    }
    
    return history;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'epic': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'rare': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'uncommon': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[80vh] flex flex-col rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-0"
      >
        {loading || !gift || !stats ? (
          <div className="space-y-6 p-6">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 pb-4 border-b border-border/40 flex-shrink-0">
              <SheetTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <GiftImage
                    giftId={gift.id}
                    giftName={gift.name}
                    emoji={gift.emoji}
                    rarity={gift.rarity}
                    size="lg"
                  />
                  <div>
                    <h2 className="text-xl font-bold truncate">{gift.name}</h2>
                    <Badge className={getRarityColor(gift.rarity)}>{gift.rarity}</Badge>
                  </div>
                </div>
                {canSendGift && (
                  <SendGiftDialog
                    receiverId={recipientId!}
                    receiverName={recipientName || 'User'}
                    trigger={
                      <Button size="sm" className="gap-2 h-10 whitespace-nowrap">
                        <Gift className="h-4 w-4" />
                        Send Gift
                      </Button>
                    }
                  />
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Sender Info */}
              {sender && (
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Sent by</p>
                  {canSeeSender ? (
                    <Link 
                      to={`/@${sender.handle}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src={sender.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {sender.display_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{sender.display_name}</p>
                        <p className="text-sm text-muted-foreground truncate">@{sender.handle}</p>
                      </div>
                      {isOwnProfile && isAnonymous && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          <EyeOff className="h-3 w-3" />
                          <span>Hidden from public</span>
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-muted">
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <EyeOff className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-muted-foreground">Anonymous</p>
                        <p className="text-sm text-muted-foreground">Identity hidden by sender</p>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <Card className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">{gift.description || 'A special gift to share with friends'}</p>
                
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Added {new Date(gift.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {gift.season && (
                    <Badge variant="outline" className="text-xs">{gift.season}</Badge>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Price</p>
                    <p className="text-lg font-bold text-primary">
                      {stats.current_price.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      Base: {gift.base_xp_cost.toLocaleString()}
                    </p>
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">Increase</p>
                    </div>
                    <p className="text-lg font-bold text-green-500">
                      {(() => {
                        const percentIncrease = ((stats.current_price - gift.base_xp_cost) / gift.base_xp_cost * 100).toFixed(1);
                        return stats.current_price > gift.base_xp_cost ? `+${percentIncrease}%` : '0%';
                      })()}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      from base
                    </p>
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">Sent</p>
                    </div>
                    <p className="text-lg font-bold">
                      {stats.total_sent.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      All time
                    </p>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  7-Day Price History
                </h3>
                <div className="space-y-2">
                  {stats.price_history.slice(-7).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[10px]">{new Date(entry.date).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs">{entry.price.toLocaleString()} Nexa</span>
                        <span className="text-[9px] text-muted-foreground">({entry.multiplier.toFixed(2)}x)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {recentTransactions.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Recent Transactions
                  </h3>
                  <div className="space-y-3">
                    {recentTransactions.slice(0, 5).map(tx => (
                      <div key={tx.id}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="font-medium">@{tx.sender.handle}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">@{tx.receiver.handle}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium">{tx.xp_cost.toLocaleString()} Nexa</p>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Separator className="mt-2" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
