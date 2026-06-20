import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Wallet, CheckCircle2, AlertCircle, Receipt, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const TRANSACTION_FEE_PERCENT = 2.6;

interface CheckoutItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  image?: string;
}

interface MiniProgramCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderType: 'event' | 'food' | 'ride' | 'booking' | 'flight' | 'hotel';
  items: CheckoutItem[];
  itemDetails?: Record<string, any>;
  scheduledDate?: Date;
  notes?: string;
  onSuccess?: (orderId: string) => void;
}

export const MiniProgramCheckout = ({
  open,
  onOpenChange,
  orderType,
  items,
  itemDetails = {},
  scheduledDate,
  notes,
  onSuccess,
}: MiniProgramCheckoutProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'review' | 'processing' | 'success' | 'error'>('review');
  const [orderId, setOrderId] = useState<string | null>(null);

  // Fetch user's ACoin balance
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['user-acoin-balance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('acoin, display_name')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const transactionFee = Math.ceil((subtotal * TRANSACTION_FEE_PERCENT) / 100);
  const totalAmount = subtotal + transactionFee;
  const hasEnoughBalance = (profile?.acoin || 0) >= totalAmount;

  // Process payment mutation
  const processPayment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (!hasEnoughBalance) throw new Error('Insufficient ACoin balance');

      // Deduct ACoin from user's wallet
      const newBalance = (profile?.acoin || 0) - totalAmount;
      
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ acoin: newBalance })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      // Record the ACoin transaction
      const { error: transactionError } = await supabase
        .from('acoin_transactions')
        .insert({
          user_id: user.id,
          amount: -totalAmount,
          transaction_type: `mini_program_${orderType}`,
          fee_charged: transactionFee,
          metadata: {
            order_type: orderType,
            items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity || 1 })),
            subtotal,
            transaction_fee: transactionFee,
          },
        });

      if (transactionError) throw transactionError;

      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('mini_program_orders')
        .insert({
          user_id: user.id,
          order_type: orderType,
          item_id: items[0].id,
          item_name: items.map(i => i.name).join(', '),
          item_details: {
            ...itemDetails,
            items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity || 1, image: i.image })),
          },
          subtotal,
          transaction_fee: transactionFee,
          total_amount: totalAmount,
          status: 'confirmed',
          payment_status: 'paid',
          scheduled_date: scheduledDate?.toISOString(),
          notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      return orderData;
    },
    onSuccess: (data) => {
      setOrderId(data.id);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['user-acoin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['mini-program-orders'] });
      onSuccess?.(data.id);
    },
    onError: (error: Error) => {
      console.error('Payment error:', error);
      setStep('error');
      toast.error(error.message || 'Payment failed. Please try again.');
    },
  });

  const handleConfirmPayment = () => {
    setStep('processing');
    processPayment.mutate();
  };

  const handleClose = () => {
    if (step === 'success') {
      onOpenChange(false);
      setStep('review');
    } else if (step !== 'processing') {
      onOpenChange(false);
      setStep('review');
    }
  };

  const getOrderTypeLabel = () => {
    const labels: Record<string, string> = {
      event: 'Event Ticket',
      food: 'Food Order',
      ride: 'Ride Booking',
      booking: 'Service Booking',
      flight: 'Flight Booking',
      hotel: 'Hotel Reservation',
    };
    return labels[orderType] || 'Order';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {step === 'success' ? 'Order Confirmed!' : 'Checkout'}
          </DialogTitle>
          <DialogDescription>
            {step === 'review' && `Complete your ${getOrderTypeLabel().toLowerCase()} payment`}
            {step === 'processing' && 'Processing your payment...'}
            {step === 'success' && 'Your order has been placed successfully'}
            {step === 'error' && 'There was an issue with your payment'}
          </DialogDescription>
        </DialogHeader>

        {step === 'review' && (
          <div className="space-y-4">
            {/* Order Items */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground">
                        {item.quantity && item.quantity > 1 ? `x${item.quantity}` : ''}
                      </span>
                      <span className="font-medium">{item.price * (item.quantity || 1)} ACoin</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Price Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal} ACoin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction Fee ({TRANSACTION_FEE_PERCENT}%)</span>
                <span>{transactionFee} ACoin</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{totalAmount} ACoin</span>
              </div>
            </div>

            <Separator />

            {/* Wallet Balance */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="font-medium">Your Balance</span>
              </div>
              <div className="text-right">
                {loadingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className={`font-bold ${hasEnoughBalance ? 'text-foreground' : 'text-destructive'}`}>
                      {profile?.acoin || 0} ACoin
                    </span>
                    {!hasEnoughBalance && (
                      <p className="text-xs text-destructive">Insufficient balance</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {hasEnoughBalance ? (
                <Button className="flex-1 gap-2" onClick={handleConfirmPayment}>
                  Pay {totalAmount} ACoin
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={() => navigate('/wallet')}>
                  Top Up Wallet
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Processing Payment</p>
            <p className="text-sm text-muted-foreground">Please wait while we confirm your order...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold">Payment Successful!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalAmount} ACoin has been deducted from your wallet
              </p>
            </div>
            <Badge variant="secondary" className="text-base px-4 py-1">
              {getOrderTypeLabel()}
            </Badge>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Close
              </Button>
              <Button className="flex-1" onClick={() => navigate('/mini-program-orders')}>
                View Orders
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold">Payment Failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                Something went wrong. Please try again.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => setStep('review')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
