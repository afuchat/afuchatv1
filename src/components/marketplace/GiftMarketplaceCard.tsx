import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ShoppingCart, User, Clock } from 'lucide-react';
import { ButtonLoader, CustomLoader } from '@/components/ui/CustomLoader';
import { motion } from 'framer-motion';

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
  };
}

interface GiftMarketplaceCardProps {
  listing: GiftMarketplaceListing;
  onPurchaseComplete: () => void;
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

export const GiftMarketplaceCard = ({ listing, onPurchaseComplete }: GiftMarketplaceCardProps) => {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
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

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      return;
    }

    if (userXP < listing.asking_price) {
      toast.error('Insufficient Nexa balance');
      return;
    }

    setPurchasing(true);
    try {
      // Deduct Nexa from buyer
      const { error: buyerError } = await supabase
        .from('profiles')
        .update({ xp: userXP - listing.asking_price })
        .eq('id', user.id);

      if (buyerError) throw buyerError;

      // Add Nexa to seller
      const { data: sellerData } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', listing.user_id)
        .single();

      if (sellerData) {
        const { error: sellerError } = await supabase
          .from('profiles')
          .update({ xp: sellerData.xp + listing.asking_price })
          .eq('id', listing.user_id);

        if (sellerError) throw sellerError;
      }

      // Create gift transaction (transfer from seller to buyer)
      const { error: txError } = await supabase
        .from('gift_transactions')
        .insert({
          gift_id: listing.gift.id,
          sender_id: listing.user_id,
          receiver_id: user.id,
          xp_cost: listing.asking_price,
        });

      if (txError) throw txError;

      // Mark listing as inactive
      const { error: listingError } = await supabase
        .from('marketplace_listings')
        .update({ is_active: false })
        .eq('id', listing.id);

      if (listingError) throw listingError;

      // Update last sale price - use the actual asking price (what it sold for)
      await supabase
        .from('gift_statistics')
        .upsert({
          gift_id: listing.gift.id,
          last_sale_price: listing.asking_price,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'gift_id'
        });

      toast.success(`You purchased ${listing.gift.name}!`);
      onPurchaseComplete();
    } catch (error) {
      console.error('Error purchasing gift:', error);
      toast.error('Failed to purchase gift');
    } finally {
      setPurchasing(false);
    }
  };

  const isOwnListing = user?.id === listing.user_id;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-6 hover:border-primary/50 transition-all">
        <div className="space-y-4">
          {/* Gift Display */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl" />
              <div className="relative text-6xl p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-full">
                {listing.gift.emoji}
            </div>
          </div>
          <h3 className="text-xl font-bold truncate">{listing.gift.name}</h3>
          <Badge className={getRarityColor(listing.gift.rarity)}>
            {listing.gift.rarity}
            </Badge>
            {listing.gift.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {listing.gift.description}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="text-center py-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Price</p>
            <p className="text-3xl font-bold text-primary">
              {listing.asking_price.toLocaleString()}
              <span className="text-lg text-muted-foreground ml-2">Nexa</span>
            </p>
          </div>

          {/* Seller Info */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Seller:</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={listing.seller.avatar_url || undefined} />
                <AvatarFallback>{listing.seller.display_name[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium">@{listing.seller.handle}</span>
            </div>
          </div>

          {/* Purchase Button */}
          {!isOwnListing && (
            <Button
              disabled
              className="w-full opacity-70"
            >
              <Clock className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          )}

          {isOwnListing && (
            <Badge variant="secondary" className="w-full justify-center py-2">
              Your Listing
            </Badge>
          )}

          {!user && (
            <Button variant="outline" className="w-full" disabled>
              Sign in to purchase
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
