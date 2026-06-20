import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { ButtonLoader, CustomLoader } from '@/components/ui/CustomLoader';

interface ReceivedGift {
  id: string;
  gift: {
    id: string;
    name: string;
    emoji: string;
    rarity: string;
    base_xp_cost: number;
  };
  created_at: string;
}

interface ListGiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onListingCreated?: () => void;
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

export const ListGiftDialog = ({ open, onOpenChange, onListingCreated }: ListGiftDialogProps) => {
  const { user } = useAuth();
  const [receivedGifts, setReceivedGifts] = useState<ReceivedGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<ReceivedGift | null>(null);
  const [askingPrice, setAskingPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchReceivedRareGifts();
    }
  }, [open, user]);

  const fetchReceivedRareGifts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch gifts received by user that are rare or better
      const { data, error } = await supabase
        .from('gift_transactions')
        .select(`
          id,
          created_at,
          gift:gifts (
            id,
            name,
            emoji,
            rarity,
            base_xp_cost
          )
        `)
        .eq('receiver_id', user.id)
        .in('gift.rarity', ['rare', 'epic', 'legendary'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out gifts already listed
      const { data: existingListings } = await supabase
        .from('marketplace_listings')
        .select('gift_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('gift_id', 'is', null);

      const listedGiftIds = new Set(existingListings?.map(l => l.gift_id) || []);
      const availableGifts = (data || [])
        .filter(g => g.gift !== null)
        .filter(g => !listedGiftIds.has(g.gift.id));

      setReceivedGifts(availableGifts as any);
    } catch (error) {
      console.error('Error fetching received gifts:', error);
      toast.error('Failed to load your gifts');
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedPrice = async (giftId: string, basePrice: number) => {
    // Check if there's a last sale price (dynamic pricing)
    const { data: stats } = await supabase
      .from('gift_statistics')
      .select('last_sale_price')
      .eq('gift_id', giftId)
      .maybeSingle();

    // If there's a last sale price, use it; otherwise use base price
    return stats?.last_sale_price || basePrice;
  };

  const handleGiftSelection = async (receivedGift: ReceivedGift) => {
    setSelectedGift(receivedGift);
    // Auto-populate with suggested price based on last sale
    const suggestedPrice = await getSuggestedPrice(
      receivedGift.gift.id,
      receivedGift.gift.base_xp_cost
    );
    setAskingPrice(suggestedPrice.toString());
  };

  const handleListGift = async () => {
    if (!selectedGift || !askingPrice || !user) return;

    const price = parseInt(askingPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .insert({
          user_id: user.id,
          gift_id: selectedGift.gift.id,
          asking_price: price,
          is_active: true,
        });

      if (error) throw error;

      toast.success('Gift listed successfully!');
      onListingCreated?.();
      onOpenChange(false);
      setSelectedGift(null);
      setAskingPrice('');
    } catch (error) {
      console.error('Error listing gift:', error);
      toast.error('Failed to list gift');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>List Rare Gift for Sale</DialogTitle>
          <DialogDescription>
            Select a rare gift you've received to list on the marketplace
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CustomLoader size="md" />
          </div>
        ) : receivedGifts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>You don't have any rare gifts available to list</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gift Selection */}
            <div className="space-y-2">
              <Label>Select Gift</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {receivedGifts.map((receivedGift) => (
                  <button
                    key={receivedGift.id}
                    onClick={() => handleGiftSelection(receivedGift)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedGift?.id === receivedGift.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{receivedGift.gift.emoji}</div>
                    <p className="text-sm font-medium truncate">{receivedGift.gift.name}</p>
                    <p className={`text-xs capitalize ${getRarityColor(receivedGift.gift.rarity)}`}>
                      {receivedGift.gift.rarity}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Asking Price */}
            {selectedGift && (
              <div className="space-y-2">
                <Label htmlFor="price">Asking Price (Nexa)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter price in Nexa"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Suggested price based on last sale: {askingPrice ? parseInt(askingPrice).toLocaleString() : selectedGift.gift.base_xp_cost.toLocaleString()} Nexa
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleListGift}
                className="flex-1"
                disabled={!selectedGift || !askingPrice || submitting}
              >
                {submitting && <ButtonLoader className="mr-2" />}
                List Gift
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
