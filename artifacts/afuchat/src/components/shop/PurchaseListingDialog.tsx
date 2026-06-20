import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Coins, Loader2, ShoppingCart, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PurchaseListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    acoin_price: number;
    price: number;
    currency: string;
    seller: {
      id: string;
      display_name: string;
    };
  };
  onSuccess?: () => void;
}

const TRANSACTION_FEE_PERCENT = 4.99;

export function PurchaseListingDialog({ open, onOpenChange, listing, onSuccess }: PurchaseListingDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userAcoin, setUserAcoin] = useState<number>(0);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  useEffect(() => {
    if (open && user) {
      setFetchingBalance(true);
      supabase
        .from('profiles')
        .select('acoin')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setUserAcoin(data?.acoin || 0);
          setFetchingBalance(false);
        });
    }
  }, [open, user]);

  const feeAmount = Math.ceil(listing.acoin_price * TRANSACTION_FEE_PERCENT / 100);
  const sellerReceives = listing.acoin_price - feeAmount;
  const hasEnoughBalance = userAcoin >= listing.acoin_price;

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      navigate('/auth/signin');
      return;
    }

    if (!hasEnoughBalance) {
      toast.error('Insufficient ACoin balance');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('purchase_listing', {
        p_listing_id: listing.id,
        p_buyer_id: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string } | null;

      if (result?.success) {
        toast.success('Purchase successful! 🎉', {
          description: `You bought "${listing.title}" for ${listing.acoin_price} ACoin`,
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result?.message || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Confirm Purchase
          </DialogTitle>
          <DialogDescription>
            Review your purchase details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold line-clamp-2">{listing.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sold by {listing.seller.display_name}
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Item Price</span>
              <span className="flex items-center gap-1 font-medium">
                <Coins className="h-4 w-4 text-primary" />
                {listing.acoin_price.toLocaleString()} ACoin
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Transaction Fee ({TRANSACTION_FEE_PERCENT}%)</span>
              <span className="text-muted-foreground">{feeAmount.toLocaleString()} ACoin</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Seller Receives</span>
                <span className="text-green-600">{sellerReceives.toLocaleString()} ACoin</span>
              </div>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center font-bold">
                <span>You Pay</span>
                <span className="flex items-center gap-1 text-primary">
                  <Coins className="h-4 w-4" />
                  {listing.acoin_price.toLocaleString()} ACoin
                </span>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${hasEnoughBalance ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
            {fetchingBalance ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasEnoughBalance ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">
              {fetchingBalance 
                ? 'Checking balance...'
                : hasEnoughBalance 
                  ? `Your balance: ${userAcoin.toLocaleString()} ACoin`
                  : `Insufficient balance (${userAcoin.toLocaleString()} ACoin). Need ${(listing.acoin_price - userAcoin).toLocaleString()} more.`
              }
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handlePurchase}
              disabled={loading || !hasEnoughBalance || fetchingBalance}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4" />
              )}
              {loading ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By purchasing, you agree to contact the seller to arrange delivery.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
