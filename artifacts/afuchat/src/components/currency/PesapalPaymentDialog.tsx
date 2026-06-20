import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Coins, CreditCard, Loader2, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PesapalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AcoinPackage {
  acoin: number;
  label: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  priceUSD: string;
}

export const PesapalPaymentDialog = ({ open, onOpenChange, onSuccess }: PesapalPaymentDialogProps) => {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<AcoinPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  // Fetch user country for currency
  const { data: profile } = useQuery({
    queryKey: ['profile-country', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch packages with pricing
  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['pesapal-packages', profile?.country],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pesapal-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-packages', country: profile?.country }),
        }
      );
      return response.json();
    },
    enabled: open,
  });

  const packages: AcoinPackage[] = packagesData?.packages || [];

  // Check pending payment status
  useEffect(() => {
    if (!pendingReference) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pesapal-payment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check-status', merchantReference: pendingReference }),
          }
        );
        const data = await response.json();

        if (data.status === 'completed') {
          toast.success('Payment Successful', {
            description: `${data.acoinAmount} ACoin has been added to your wallet!`,
          });
          setPendingReference(null);
          setIsProcessing(false);
          onSuccess?.();
          onOpenChange(false);
        } else if (data.status === 'failed') {
          toast.error('Payment Failed', {
            description: 'Your payment could not be processed. Please try again.',
          });
          setPendingReference(null);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [pendingReference, onSuccess, onOpenChange]);

  const handlePurchase = async () => {
    if (!selectedPackage || !user) return;

    setIsProcessing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pesapal-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-order',
            userId: user.id,
            acoinAmount: selectedPackage.acoin,
            callbackUrl: `${window.location.origin}/wallet?payment=callback`,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.redirectUrl) {
        setPendingReference(data.merchantReference);
        // Open PesaPal payment page in new tab
        window.open(data.redirectUrl, '_blank');
        toast.info('Payment Window Opened', {
          description: 'Complete your payment in the new tab. This dialog will update automatically.',
        });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Payment Error', {
        description: error.message || 'Failed to initiate payment',
      });
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number, symbol: string) => {
    return `${symbol} ${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Buy ACoin
          </DialogTitle>
          <DialogDescription>
            Pay with Mobile Money, Card, or Bank Transfer via PesaPal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Methods Info */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Supports MTN, Airtel, Visa, Mastercard & more</span>
          </div>

          {/* Package Selection */}
          {packagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {packages.map((pkg) => (
                <Card
                  key={pkg.acoin}
                  className={cn(
                    'p-3 cursor-pointer transition-all border-2',
                    selectedPackage?.acoin === pkg.acoin
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-border'
                  )}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold">{pkg.label}</span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(pkg.amount, pkg.currencySymbol)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ ${pkg.priceUSD} USD
                  </p>
                </Card>
              ))}
            </div>
          )}

          {/* Pending Payment Status */}
          {pendingReference && (
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-600">Waiting for Payment</p>
                <p className="text-sm text-muted-foreground">
                  Complete payment in the new tab. This will update automatically.
                </p>
              </div>
            </div>
          )}

          {/* Purchase Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!selectedPackage || isProcessing}
            onClick={handlePurchase}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : selectedPackage ? (
              <>
                Pay {formatPrice(selectedPackage.amount, selectedPackage.currencySymbol)}
              </>
            ) : (
              'Select a Package'
            )}
          </Button>

          {/* Security Note */}
          <p className="text-xs text-center text-muted-foreground">
            Payments are processed securely by PesaPal. Your ACoin will be credited instantly after payment confirmation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
