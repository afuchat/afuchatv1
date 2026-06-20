import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Package, Plus, Trash2, Store, TrendingUp, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { ListGiftDialog } from '@/components/marketplace/ListGiftDialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { GiftMarketplaceCard } from '@/components/marketplace/GiftMarketplaceCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';

interface MarketplaceListing {
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

interface MyListing {
  id: string;
  asking_price: number;
  created_at: string;
  gift: {
    id: string;
    name: string;
    emoji: string;
    rarity: string;
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

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium, tier } = usePremiumStatus();
  const [allListings, setAllListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('browse');

  useEffect(() => {
    fetchAllListings();
    if (user) {
      fetchMyListings();
    }
  }, [user]);

  const fetchAllListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          id,
          asking_price,
          created_at,
          user_id,
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch seller profiles
      const userIds = [...new Set((data || []).map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const listingsWithSellers = (data || []).map(listing => ({
        ...listing,
        seller: profileMap.get(listing.user_id) || {
          display_name: 'Unknown',
          handle: 'unknown',
          avatar_url: null
        }
      }));

      setAllListings(listingsWithSellers as any);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          id,
          asking_price,
          created_at,
          gift:gifts (
            id,
            name,
            emoji,
            rarity,
            base_xp_cost
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMyListings((data || []) as any);
    } catch (error) {
      console.error('Error fetching my listings:', error);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    setDeleting(listingId);
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ is_active: false })
        .eq('id', listingId);

      if (error) throw error;

      toast.success('Listing removed');
      fetchMyListings();
      fetchAllListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to remove listing');
    } finally {
      setDeleting(null);
    }
  };

  const handleListGift = () => {
    if (!user) {
      toast.error('Please sign in to list gifts');
      return;
    }
    
    // Check premium tier for listing
    if (!isPremium || tier !== 'platinum') {
      toast.error('Platinum subscription required to list gifts');
      navigate('/premium');
      return;
    }
    
    setListDialogOpen(true);
  };

  const canList = isPremium && tier === 'platinum';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CustomLoader />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Gift Marketplace"
        description="Buy and sell rare gifts on the marketplace"
      />

      <div className="min-h-screen bg-background pb-24 lg:pb-4">
        <PageHeader 
          title="Gift Marketplace" 
          subtitle="Trade rare gifts with others"
          icon={<Store className="h-5 w-5 text-primary" />}
          rightContent={
            <Button onClick={handleListGift} disabled={!canList}>
              {canList ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  List Gift
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Platinum Only
                </>
              )}
            </Button>
          }
        />

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="browse" className="gap-2">
                <Store className="h-4 w-4" />
                Browse Market
              </TabsTrigger>
              <TabsTrigger value="my-listings" className="gap-2">
                <Package className="h-4 w-4" />
                My Listings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              {allListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Store className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No listings available</h2>
                  <p className="text-muted-foreground mb-6">Be the first to list a rare gift!</p>
                  {canList && (
                    <Button onClick={handleListGift}>
                      <Plus className="h-4 w-4 mr-2" />
                      List Your First Gift
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Stats Banner */}
                  <div className="flex items-center gap-4 p-4 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-bold text-lg">{allListings.length} Active Listings</p>
                      <p className="text-sm text-muted-foreground">Trade rare and legendary gifts</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allListings.map((listing) => (
                      <GiftMarketplaceCard
                        key={listing.id}
                        listing={listing}
                        onPurchaseComplete={() => {
                          fetchAllListings();
                          fetchMyListings();
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="my-listings">
              {!user ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Sign in to view your listings</h2>
                  <p className="text-muted-foreground">Manage your gift marketplace listings</p>
                </div>
              ) : myListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No active listings</h2>
                  <p className="text-muted-foreground mb-6">Start by listing a rare gift for sale</p>
                  {canList ? (
                    <Button onClick={handleListGift}>
                      <Plus className="h-4 w-4 mr-2" />
                      List Your First Gift
                    </Button>
                  ) : (
                    <Button onClick={() => navigate('/premium')} variant="outline">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Platinum to List
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myListings.map((listing) => (
                    <Card key={listing.id} className="p-6">
                      <div className="space-y-4">
                        {/* Gift Display */}
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="text-6xl p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-full">
                            {listing.gift.emoji}
                          </div>
                          <h3 className="text-xl font-bold">{listing.gift.name}</h3>
                          <Badge className={getRarityColor(listing.gift.rarity)}>
                            {listing.gift.rarity}
                          </Badge>
                        </div>

                        {/* Price */}
                        <div className="text-center py-4 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">Listed Price</p>
                          <p className="text-3xl font-bold text-primary">
                            {listing.asking_price.toLocaleString()}
                            <span className="text-lg text-muted-foreground ml-2">Nexa</span>
                          </p>
                          {(() => {
                            const percentIncrease = ((listing.asking_price - listing.gift.base_xp_cost) / listing.gift.base_xp_cost * 100).toFixed(1);
                            return (
                              <>
                                <p className="text-sm font-semibold text-green-500 mt-1">
                                  +{percentIncrease}% market increase
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Base price: {listing.gift.base_xp_cost.toLocaleString()} Nexa
                                </p>
                              </>
                            );
                          })()}
                        </div>

                        {/* Actions */}
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteListing(listing.id)}
                          disabled={deleting === listing.id}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Listing
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ListGiftDialog
        open={listDialogOpen}
        onOpenChange={setListDialogOpen}
        onListingCreated={() => {
          fetchMyListings();
          fetchAllListings();
        }}
      />
    </>
  );
}