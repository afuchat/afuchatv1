import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { GiftImage } from '@/components/gifts/GiftImage';

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

const GiftDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gift, setGift] = useState<Gift | null>(null);
  const [stats, setStats] = useState<GiftStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchGiftDetails();
    }
  }, [id]);

  const fetchGiftDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch gift details
      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .select('*')
        .eq('id', id)
        .single();

      if (giftError) throw giftError;
      setGift(giftData);

      // Fetch gift statistics
      const { data: statsData } = await supabase
        .from('gift_statistics')
        .select('*')
        .eq('gift_id', id)
        .single();

      const currentPrice = Math.round(giftData.base_xp_cost * (statsData?.price_multiplier || 1));
      
      // Fetch transaction data for detailed stats
      const { data: allTransactions } = await supabase
        .from('gift_transactions')
        .select('xp_cost, created_at')
        .eq('gift_id', id)
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
        price_history: generatePriceHistory(giftData.base_xp_cost, statsData?.price_multiplier || 1),
        initial_sale_date: initialSaleDate,
        initial_price: initialPrice,
        last_sale_date: lastSaleDate,
        last_price: lastPrice,
        min_price: minPrice,
        avg_price: avgPrice,
        price_change_percent: priceChangePercent
      });

      // Fetch recent transactions
      const { data: transactions, error: txError } = await supabase
        .from('gift_transactions')
        .select(`
          id,
          created_at,
          xp_cost,
          sender:sender_id(display_name, handle, avatar_url),
          receiver:receiver_id(display_name, handle, avatar_url)
        `)
        .eq('gift_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!txError && transactions) {
        setRecentTransactions(transactions as any);
      }

    } catch (error) {
      console.error('Error fetching gift details:', error);
      toast.error('Failed to load gift details');
      navigate('/gifts');
    } finally {
      setLoading(false);
    }
  };

  const generatePriceHistory = (basePrice: number, currentMultiplier: number) => {
    const history = [];
    const daysBack = 30;
    
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate price fluctuation
      const randomFactor = 0.8 + (Math.random() * 0.4);
      const multiplier = currentMultiplier * randomFactor;
      const price = Math.round(basePrice * multiplier);
      
      history.push({
        date: date.toISOString().split('T')[0],
        price,
        multiplier
      });
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

  if (loading || !gift || !stats) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hidden lg:inline-flex"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <GiftImage
              giftId={gift.id}
              giftName={gift.name}
              emoji={gift.emoji}
              rarity={gift.rarity}
              size="xl"
            />
            <div>
              <h1 className="text-2xl font-bold">{gift.name}</h1>
              <Badge className={getRarityColor(gift.rarity)}>{gift.rarity}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Main Info Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-muted-foreground">{gift.description || 'A special gift to share with friends'}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Added {new Date(gift.created_at).toLocaleDateString()}
                  </span>
                </div>
                {gift.season && (
                  <Badge variant="outline">{gift.season}</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Price & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-3xl font-bold text-primary">
                {stats.current_price.toLocaleString()} Nexa
              </p>
              <p className="text-xs text-muted-foreground">
                Base: {gift.base_xp_cost.toLocaleString()} Nexa
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Price Multiplier</p>
              </div>
              <p className="text-3xl font-bold">
                {stats.price_multiplier.toFixed(2)}x
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.price_multiplier >= 1 ? '+' : ''}{((stats.price_multiplier - 1) * 100).toFixed(0)}% from base
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
              <p className="text-3xl font-bold">
                {stats.total_sent.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </div>
          </Card>
        </div>

        {/* Comprehensive Statistics Table */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gift Statistics
          </h3>
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
          </div>
        </Card>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Transactions
            </h3>
            <div className="space-y-4">
              {recentTransactions.map(tx => (
                <div key={tx.id}>
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
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GiftDetail;
