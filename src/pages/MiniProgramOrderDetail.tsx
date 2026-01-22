import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Receipt, Calendar, Clock, MapPin, 
  Ticket, UtensilsCrossed, Car, CalendarCheck, Plane, Hotel,
  CheckCircle2, XCircle, AlertCircle, Loader2, Phone, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const orderTypeIcons: Record<string, any> = {
  event: Ticket,
  food: UtensilsCrossed,
  ride: Car,
  booking: CalendarCheck,
  flight: Plane,
  hotel: Hotel,
};

const orderTypeLabels: Record<string, string> = {
  event: 'Event Ticket',
  food: 'Food Order',
  ride: 'Ride Booking',
  booking: 'Service Booking',
  flight: 'Flight Booking',
  hotel: 'Hotel Reservation',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  processing: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  refunded: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const MiniProgramOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['mini-program-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mini_program_orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const cancelOrder = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('Order not found');
      
      // Update order status
      const { error: orderError } = await supabase
        .from('mini_program_orders')
        .update({ status: 'cancelled', payment_status: 'refunded' })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Refund ACoin to user
      const { data: profile } = await supabase
        .from('profiles')
        .select('acoin')
        .eq('id', user?.id)
        .single();

      if (profile) {
        const newBalance = (profile.acoin || 0) + order.total_amount;
        await supabase
          .from('profiles')
          .update({ acoin: newBalance })
          .eq('id', user?.id);

        // Record refund transaction
        await supabase
          .from('acoin_transactions')
          .insert({
            user_id: user?.id,
            amount: order.total_amount,
            transaction_type: 'refund',
            metadata: {
              order_id: order.id,
              order_number: order.order_number,
              order_type: order.order_type,
            },
          });
      }

      return true;
    },
    onSuccess: () => {
      toast.success('Order cancelled and refunded');
      queryClient.invalidateQueries({ queryKey: ['mini-program-order', id] });
      queryClient.invalidateQueries({ queryKey: ['mini-program-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-acoin-balance'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel order');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">This order doesn't exist or you don't have access</p>
          <Button onClick={() => navigate('/mini-program-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const Icon = orderTypeIcons[order.order_type] || Receipt;
  const itemDetails = order.item_details as Record<string, any>;
  const items = itemDetails?.items || [];
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/mini-program-orders')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold">Order Details</h1>
              <p className="text-sm text-muted-foreground">{order.order_number}</p>
            </div>
            <Badge 
              variant="outline" 
              className={`gap-1 ${statusColors[order.status]}`}
            >
              {order.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
              {order.status === 'cancelled' && <XCircle className="h-3 w-3" />}
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Order Type Badge */}
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-1">
              {orderTypeLabels[order.order_type]}
            </Badge>
            <p className="text-lg font-bold">{order.item_name}</p>
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-xl bg-card p-4 space-y-4">
          <h3 className="font-semibold">Order Items</h3>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item: any, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <div className="flex items-center justify-between mt-1 text-sm">
                      <span className="text-muted-foreground">
                        Qty: {item.quantity || 1}
                      </span>
                      <span className="font-medium">{item.price * (item.quantity || 1)} ACoin</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No items details available</p>
          )}
        </div>

        {/* Payment Summary */}
        <div className="rounded-xl bg-card p-4 space-y-3">
          <h3 className="font-semibold">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{order.subtotal} ACoin</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction Fee (2.6%)</span>
              <span>{order.transaction_fee} ACoin</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total Paid</span>
              <span className="text-primary">{order.total_amount} ACoin</span>
            </div>
          </div>
          <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'} className="w-full justify-center">
            {order.payment_status === 'paid' ? 'Payment Completed' : order.payment_status.toUpperCase()}
          </Badge>
        </div>

        {/* Order Details */}
        <div className="rounded-xl bg-card p-4 space-y-4">
          <h3 className="font-semibold">Order Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Order Date</p>
                <p className="font-medium">{format(new Date(order.created_at), 'MMMM d, yyyy h:mm a')}</p>
              </div>
            </div>
            {order.scheduled_date && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Scheduled For</p>
                  <p className="font-medium">{format(new Date(order.scheduled_date), 'MMMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            )}
            {itemDetails?.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{itemDetails.location}</p>
                </div>
              </div>
            )}
            {order.notes && (
              <div className="pt-2">
                <p className="text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted/50 p-2 rounded">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Support */}
        <div className="rounded-xl bg-muted/50 p-4">
          <h3 className="font-semibold mb-3">Need Help?</h3>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate('/support')}>
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
            <Button variant="outline" className="flex-1 gap-2" asChild>
              <a href="https://t.me/amkaweesi" target="_blank" rel="noopener noreferrer">
                <Phone className="h-4 w-4" />
                Live Chat
              </a>
            </Button>
          </div>
        </div>

        {/* Cancel Button */}
        {canCancel && (
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => cancelOrder.mutate()}
            disabled={cancelOrder.isPending}
          >
            {cancelOrder.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Cancel Order & Request Refund
          </Button>
        )}
      </main>
    </div>
  );
};

export default MiniProgramOrderDetail;
