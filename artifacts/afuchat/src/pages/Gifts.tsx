import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GiftsSkeleton } from '@/components/skeletons';
import { Gift, TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { GiftImage } from '@/components/gifts/GiftImage';
import { GiftDetailSheet } from '@/components/gifts/GiftDetailSheet';
import { GiftPreviewModal } from '@/components/gifts/GiftPreviewModal';
import { SelectRecipientDialog } from '@/components/gifts/SelectRecipientDialog';
import { PageHeader } from '@/components/PageHeader';
import { SEO } from '@/components/SEO';

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
}

interface GiftWithStats extends Gift {
  current_price: number;
  total_sent: number;
  price_multiplier: number;
}

interface OwnedGift {
  gift: Gift;
  received_count: number;
  last_received: string;
}

const Gifts = () => {
  const { user } = useAuth();
  const [allGifts, setAllGifts] = useState<GiftWithStats[]>([]);
  const [ownedGifts, setOwnedGifts] = useState<OwnedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftWithStats | null>(null);
  const [recipientSelectorOpen, setRecipientSelectorOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchGifts();
    if (user) {
      fetchOwnedGifts();
    }
  }, [user]);

  const fetchGifts = async () => {
    try {
      const { data: gifts, error: giftsError } = await supabase
        .from('gifts')
        .select('*')
        .order('base_xp_cost', { ascending: true });

      if (giftsError) throw giftsError;

      const { data: stats, error: statsError } = await supabase
        .from('gift_statistics')
        .select('*');

      if (statsError) throw statsError;

      const giftsWithStats = gifts?.map(gift => {
        const stat = stats?.find(s => s.gift_id === gift.id);
        // Use last_sale_price if available, otherwise use base_xp_cost
        const currentPrice = stat?.last_sale_price || gift.base_xp_cost;
        
        return {
          ...gift,
          current_price: currentPrice,
          total_sent: stat?.total_sent || 0,
          price_multiplier: stat?.price_multiplier || 1
        };
      }) || [];

      setAllGifts(giftsWithStats);
    } catch (error) {
      console.error('Error fetching gifts:', error);
      toast.error('Failed to load gifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnedGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gift_transactions')
        .select('gift_id, created_at, gifts(*)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const giftMap = new Map<string, OwnedGift>();
      
      data?.forEach(transaction => {
        if (transaction.gifts) {
          const giftId = transaction.gift_id;
          if (giftMap.has(giftId)) {
            const existing = giftMap.get(giftId)!;
            existing.received_count++;
            if ((transaction.created_at ?? '') > existing.last_received) {
              existing.last_received = transaction.created_at ?? '';
            }
          } else {
            giftMap.set(giftId, {
              gift: transaction.gifts as unknown as Gift,
              received_count: 1,
              last_received: transaction.created_at ?? ''
            });
          }
        }
      });

      setOwnedGifts(Array.from(giftMap.values()));
    } catch (error) {
      console.error('Error fetching owned gifts:', error);
    }
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

  const handleGiftClick = (gift: GiftWithStats) => {
    setSelectedGift(gift);
    setPreviewModalOpen(true);
  };

  const handleSendGift = () => {
    if (selectedGift) {
      setPreviewModalOpen(false);
      setRecipientSelectorOpen(true);
    }
  };

  const handleRecipientSelected = async (recipient: { id: string; name: string }): Promise<void> => {
    setSelectedRecipient(recipient);
    setSelectedGiftId(selectedGift?.id || null);
    setSheetOpen(true);
  };

  if (loading) {
    return <GiftsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-4">
      <SEO 
        title="Gifts — AfuChat"
        description="Send beautiful virtual gifts to your friends on AfuChat. Choose from a variety of gifts, including seasonal specials. Use your Nexa points to spread joy!"
        image="https://afuchat.com/og/gifts.jpg"
      />
      <PageHeader title="Gifts" subtitle="Send special gifts to friends" />

      <div className="max-w-6xl mx-auto p-3 sm:p-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="all">All Gifts</TabsTrigger>
            <TabsTrigger value="owned">My Collection</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {allGifts.map(gift => (
                  <div
                    key={gift.id}
                    className="cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1 group relative p-2 sm:p-4"
                    onClick={() => handleGiftClick(gift)}
                  >
                    <div className="relative space-y-2">
                      <div className="relative">
                        <GiftImage
                          giftId={gift.id}
                          giftName={gift.name}
                          emoji={gift.emoji}
                          rarity={gift.rarity}
                          size="lg"
                          className="mx-auto"
                        />
                        <Badge className={`absolute -top-2 -right-2 ${getRarityColor(gift.rarity)} text-[10px] px-1.5 py-0.5`}>
                          {gift.rarity}
                        </Badge>
                      </div>

                      <div className="text-center max-w-full overflow-hidden">
                        <h3 className="font-semibold text-xs truncate max-w-[80px] mx-auto" title={gift.name}>{gift.name}</h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          Base: {gift.base_xp_cost} Nexa
                        </p>
                      </div>

                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-bold text-primary">
                            {gift.current_price.toLocaleString()} Nexa
                          </span>
                        </div>
                        {(() => {
                          const percentIncrease = ((gift.current_price - gift.base_xp_cost) / gift.base_xp_cost * 100).toFixed(1);
                          return gift.current_price > gift.base_xp_cost ? (
                            <div className="flex items-center justify-center gap-0.5 text-[10px] text-green-500 font-semibold">
                              <TrendingUp className="h-2.5 w-2.5" />
                              <span>+{percentIncrease}%</span>
                            </div>
                          ) : null;
                        })()}

                        {gift.total_sent > 0 && (
                          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>{gift.total_sent.toLocaleString()} sent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </TabsContent>

          <TabsContent value="owned" className="space-y-6">
            {!user ? (
              <Card className="p-8 text-center">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Sign in to view your collection</h3>
                <p className="text-sm text-muted-foreground">
                  Log in to see all the gifts you've received
                </p>
              </Card>
            ) : ownedGifts.length === 0 ? (
              <Card className="p-8 text-center">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No gifts yet</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't received any gifts yet. Start connecting with friends!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                {ownedGifts.map(({ gift, received_count, last_received }) => {
                  const giftWithStats = allGifts.find(g => g.id === gift.id) || {
                    ...gift,
                    current_price: gift.base_xp_cost,
                    total_sent: 0,
                    price_multiplier: 1
                  };
                  
                  return (
                    <div
                      key={gift.id}
                      className="cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1 group relative p-2 sm:p-4"
                      onClick={() => handleGiftClick(giftWithStats)}
                    >
                      <div className="space-y-2">
                        <div className="relative">
                          <GiftImage
                            giftId={gift.id}
                            giftName={gift.name}
                            emoji={gift.emoji}
                            rarity={gift.rarity}
                            size="lg"
                            className="mx-auto"
                          />
                          <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs font-bold px-1.5 py-0.5">
                            x{received_count}
                          </Badge>
                        </div>

                        <div className="text-center max-w-full overflow-hidden">
                          <h3 className="font-semibold text-xs truncate max-w-[80px] mx-auto" title={gift.name}>{gift.name}</h3>
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground font-medium">
                              Base: {gift.base_xp_cost} Nexa
                            </p>
                            <p className="text-xs font-bold text-primary">
                              {giftWithStats.current_price.toLocaleString()} Nexa
                            </p>
                            {(() => {
                              const percentIncrease = ((giftWithStats.current_price - gift.base_xp_cost) / gift.base_xp_cost * 100).toFixed(1);
                              return giftWithStats.current_price > gift.base_xp_cost ? (
                                <div className="flex items-center justify-center gap-0.5 text-[10px] text-green-500 font-semibold">
                                  <TrendingUp className="h-2.5 w-2.5" />
                                  <span>+{percentIncrease}%</span>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
          </TabsContent>
        </Tabs>
      </div>

      <GiftPreviewModal
        gift={selectedGift}
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        onSendGift={handleSendGift}
      />

      <SelectRecipientDialog
        open={recipientSelectorOpen}
        onOpenChange={setRecipientSelectorOpen}
        onSelectRecipient={handleRecipientSelected}
      />

      <GiftDetailSheet
        giftId={selectedGiftId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        recipientId={selectedRecipient?.id}
        recipientName={selectedRecipient?.name}
      />
    </div>
  );
};

export default Gifts;
