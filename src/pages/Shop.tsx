import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Store, Package } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { PageSkeleton } from '@/components/skeletons';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, ShoppingCart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { GiftImage } from '@/components/gifts/GiftImage';
import { invalidateGiftPricingCache } from '@/hooks/useGiftPricing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserListings } from '@/components/shop/UserListings';

interface GiftMarketplaceListing {
  id: string;
  asking_price: number;
  created_at: string;
  user_id: string;
  seller: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
  gift: {
    id: string;
    name: string;
    emoji: string;
    rarity: string;
    description: string | null;
    base_xp_cost: number;
  };
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

const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

export default function Shop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<GiftMarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<GiftMarketplaceListing | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
    fetchMarketplaceListings();
    if (user) {
      fetchUserXP();
    }
  }, [user]);

  const fetchUserXP = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();
    if (data) setUserXP(data.xp);
  };

  const fetchMarketplaceListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          id,
          asking_price,
          created_at,
          user_id,
          seller:profiles!marketplace_listings_user_id_fkey (
            display_name,
            handle,
            avatar_url
          ),
          gift:gifts (
            id,
            name,
            emoji,
            rarity,
            description,
            base_xp_cost
          )
        `)
        .eq('is_active', true)
        .not('gift_id', 'is', null);

      if (error) throw error;

      // Sort listings by asking price (cheapest first)
      const sortedListings = (data || []).sort((a: any, b: any) => a.asking_price - b.asking_price);

      setListings(sortedListings as any);
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedListing || !user) {
      toast.error('Please sign in to purchase');
      return;
    }

    if (userXP < selectedListing.asking_price) {
      toast.error('Insufficient Nexa balance');
      return;
    }

    setPurchasing(true);
    try {
      // Use database function to handle purchase atomically
      const { data, error } = await supabase.rpc('purchase_marketplace_gift', {
        p_listing_id: selectedListing.id,
        p_buyer_id: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        toast.error(result.error || 'Failed to purchase gift');
        return;
      }

      toast.success(`You purchased ${selectedListing.gift.name}! Check your profile gifts.`);
      setSelectedListing(null);
      
      // Invalidate gift pricing cache so prices update everywhere
      invalidateGiftPricingCache();
      
      fetchMarketplaceListings();
      fetchUserXP();
    } catch (error) {
      console.error('Error purchasing gift:', error);
      toast.error('Failed to purchase gift');
    } finally {
      setPurchasing(false);
    }
  };

  const groupedListings = listings.reduce((acc, listing) => {
    const rarity = listing.gift.rarity.toLowerCase();
    if (!acc[rarity]) {
      acc[rarity] = [];
    }
    acc[rarity].push(listing);
    return acc;
  }, {} as Record<string, GiftMarketplaceListing[]>);

  const isOwnListing = selectedListing && user?.id === selectedListing.user_id;

  if (loading) {
    return <PageSkeleton variant="centered" />;
  }

  return (
    <>
      <SEO 
        title="Gift Marketplace - Buy Rare Gifts"
        description="Browse and purchase rare, epic, and legendary gifts from other users"
      />

      <div className="min-h-screen pb-24 lg:pb-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Gift Marketplace</h1>
              </div>
              {user && (
                <Button size="sm" onClick={() => navigate('/marketplace')}>
                  <Package className="h-4 w-4 mr-2" />
                  My Listings
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for Gift Marketplace and Local Marketplace */}
        <div className="max-w-7xl mx-auto py-6 pb-24 lg:pb-6 px-4">
          <Tabs defaultValue="gifts" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="gifts">Gift Marketplace</TabsTrigger>
              <TabsTrigger value="local">Local Products</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gifts">
              {listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <Store className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No gifts available</h2>
                  <p className="text-muted-foreground">Check back later for new listings</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {rarityOrder.map((rarity) => {
                    const rarityListings = groupedListings[rarity];
                    if (!rarityListings || rarityListings.length === 0) return null;

                    return (
                      <div key={rarity} className="space-y-3">
                        {/* Category Header */}
                        <div className="flex items-center gap-2">
                          <Badge className={`${getRarityColor(rarity)} font-semibold`} variant="outline">
                            {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {rarityListings.length} {rarityListings.length === 1 ? 'gift' : 'gifts'}
                          </span>
                        </div>
                        
                        {/* Horizontal Scroll Container */}
                        <div className="relative">
                          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                            {rarityListings.map((listing) => (
                              <motion.button
                                key={`${listing.id}-${listing.user_id}`}
                                onClick={() => setSelectedListing(listing)}
                                className="flex-shrink-0 snap-start flex flex-col items-center gap-3 py-4 px-2 min-w-[120px] group"
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              >
                                {/* Gift Image with Glow Effect */}
                                <div className="relative">
                                  <div className={`absolute inset-0 blur-xl opacity-30 group-hover:opacity-50 transition-opacity ${
                                    rarity === 'legendary' ? 'bg-yellow-500' :
                                    rarity === 'epic' ? 'bg-purple-500' :
                                    rarity === 'rare' ? 'bg-blue-500' :
                                    rarity === 'uncommon' ? 'bg-green-500' : 'bg-gray-500'
                                  }`} />
                                  <GiftImage
                                    giftId={listing.gift.id}
                                    giftName={listing.gift.name}
                                    emoji={listing.gift.emoji}
                                    rarity={listing.gift.rarity}
                                    size="lg"
                                  />
                                </div>
                                
                                {/* Gift Name */}
                                <p className="text-sm font-semibold text-center truncate max-w-[100px] group-hover:text-primary transition-colors" title={listing.gift.name}>
                                  {listing.gift.name}
                                </p>
                                
                                {/* Price & Seller */}
                                <div className="flex flex-col items-center gap-1">
                                  <p className="text-base font-bold text-primary">
                                    {listing.asking_price.toLocaleString()}
                                    <span className="text-xs font-medium text-muted-foreground ml-1">Nexa</span>
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    @{listing.seller.handle}
                                  </p>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="local">
              <UserListings />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Purchase Sheet */}
      <Sheet open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <SheetContent side="bottom" className="max-h-[65vh] flex flex-col rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-0">
          {selectedListing && (
            <>
              <SheetHeader className="space-y-0.5 pb-2 pt-4 px-6 border-b border-border/40 flex-shrink-0">
                <SheetTitle className="text-base font-bold">
                  Gift Details
                </SheetTitle>
                <SheetDescription className="text-[10px] text-muted-foreground">
                  Complete information about this exclusive gift
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-2 mt-2 px-6 pb-2 overflow-y-auto flex-1">
                {/* Gift Display with Animation */}
                <motion.div 
                  className="flex flex-col items-center text-center space-y-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <GiftImage
                      giftId={selectedListing.gift.id}
                      giftName={selectedListing.gift.name}
                      emoji={selectedListing.gift.emoji}
                      rarity={selectedListing.gift.rarity}
                      size="xl"
                    />
                    <div className="absolute -bottom-1 -right-1">
                      <Badge className={`${getRarityColor(selectedListing.gift.rarity)} px-2 py-0.5 text-[10px] font-semibold shadow-lg`}>
                        {selectedListing.gift.rarity}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="text-base font-bold tracking-tight truncate">
                    {selectedListing.gift.name}
                  </h3>
                  {selectedListing.gift.description && (
                    <p className="text-[10px] text-muted-foreground max-w-md leading-tight px-2">
                      {selectedListing.gift.description}
                    </p>
                  )}
                </motion.div>

                {/* Price Card */}
                <motion.div 
                  className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="relative text-center py-3 px-2">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wider">
                      Price
                    </p>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <p className="text-xl font-bold text-primary tracking-tight">
                        {selectedListing.asking_price.toLocaleString()}
                      </p>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Nexa
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Seller Info Card */}
                <motion.div 
                  className="rounded-lg bg-card/50 border border-border/50 p-2 shadow-md backdrop-blur-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                        <AvatarImage src={selectedListing.seller.avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {selectedListing.seller.display_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Seller
                        </p>
                        <p className="text-sm font-semibold">
                          {selectedListing.seller.display_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          @{selectedListing.seller.handle}
                        </p>
                      </div>
                    </div>
                    <User className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                </motion.div>

                {/* Your Balance */}
                {user && (
                  <motion.div 
                    className="rounded-lg bg-muted/30 border border-border/30 p-2 shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                          Your Balance
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-base font-bold">
                            {userXP.toLocaleString()}
                          </p>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Nexa
                          </span>
                        </div>
                      </div>
                      {userXP < selectedListing.asking_price && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                          Insufficient
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Fixed Footer with Purchase Button */}
              <div className="flex-shrink-0 border-t border-border/40 p-4 pb-6 bg-background/95 backdrop-blur-xl">
                {!isOwnListing && (
                  <Button
                    onClick={handlePurchase}
                    disabled={purchasing || !user || userXP < selectedListing.asking_price}
                    className="w-full h-10 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    size="sm"
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Complete Purchase
                      </>
                    )}
                  </Button>
                )}

                {isOwnListing && (
                  <Button
                    onClick={() => navigate('/marketplace')}
                    variant="secondary"
                    className="w-full h-10 text-sm font-semibold"
                    size="sm"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    View Your Listings
                  </Button>
                )}

                {!user && (
                  <Button
                    onClick={() => navigate('/auth/signin')}
                    variant="outline"
                    className="w-full h-10 font-semibold text-sm"
                  >
                    Sign in to purchase
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
