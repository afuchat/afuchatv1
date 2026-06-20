import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Package, CheckCircle, Clock, XCircle, Truck, 
  MessageCircle, Store, CreditCard, ShieldCheck 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { CustomLoader } from '@/components/ui/CustomLoader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  commission_amount: number;
  commission_rate: number;
  status: string;
  payment_status: string;
  created_at: string;
  merchant_id: string;
  buyer_id: string;
  buyer: {
    display_name: string;
    avatar_url: string | null;
    handle: string;
  };
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending_payment: { 
    label: 'Pending Payment', 
    icon: <Clock className="h-4 w-4" />, 
    color: 'bg-yellow-500/10 text-yellow-500' 
  },
  payment_recorded: { 
    label: 'Payment Recorded', 
    icon: <CreditCard className="h-4 w-4" />, 
    color: 'bg-blue-500/10 text-blue-500' 
  },
  fulfilled: { 
    label: 'Fulfilled', 
    icon: <Truck className="h-4 w-4" />, 
    color: 'bg-purple-500/10 text-purple-500' 
  },
  completed: { 
    label: 'Completed', 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: 'bg-green-500/10 text-green-500' 
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: <XCircle className="h-4 w-4" />, 
    color: 'bg-destructive/10 text-destructive' 
  },
};

const orderStatuses = [
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'payment_recorded', label: 'Payment Recorded' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function MerchantOrderDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user && orderNumber) {
      checkMerchantAndFetchOrder();
    }
  }, [user, orderNumber]);

  const checkMerchantAndFetchOrder = async () => {
    try {
      // Check if user is a merchant
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!merchant) {
        setIsMerchant(false);
        setLoading(false);
        return;
      }

      setIsMerchant(true);

      // Fetch order with merchant validation
      const { data: orderData } = await supabase
        .from('merchant_orders')
        .select(`
          id,
          order_number,
          total_amount,
          commission_amount,
          commission_rate,
          status,
          payment_status,
          created_at,
          merchant_id,
          buyer_id,
          buyer:profiles!merchant_orders_buyer_id_fkey(display_name, avatar_url, handle)
        `)
        .eq('order_number', orderNumber)
        .eq('merchant_id', merchant.id)
        .single();

      if (orderData) {
        setOrder(orderData as unknown as Order);

        const { data: itemsData } = await supabase
          .from('merchant_order_items')
          .select('id, product_name, product_price, quantity, subtotal')
          .eq('order_id', orderData.id);

        if (itemsData) {
          setItems(itemsData);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('merchant_orders')
        .update({ 
          status: newStatus,
          payment_status: newStatus === 'payment_recorded' || newStatus === 'fulfilled' || newStatus === 'completed' 
            ? 'paid' 
            : order.payment_status
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Order status updated to ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleContactBuyer = async () => {
    if (!user || !order) return;

    try {
      // Check for existing chat
      const { data: existingChat } = await supabase
        .from('merchant_customer_chats')
        .select('chat_id')
        .eq('merchant_id', order.merchant_id)
        .eq('customer_id', order.buyer_id)
        .maybeSingle();

      let chatId = existingChat?.chat_id;

      if (!chatId) {
        // Create new chat
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            created_by: user.id,
            is_group: false,
            name: null
          })
          .select('id')
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;

        await supabase.from('chat_members').insert([
          { chat_id: chatId, user_id: user.id },
          { chat_id: chatId, user_id: order.buyer_id }
        ]);

        await supabase.from('merchant_customer_chats').insert({
          merchant_id: order.merchant_id,
          customer_id: order.buyer_id,
          chat_id: chatId
        });
      }

      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error contacting buyer:', error);
      toast.error('Failed to start chat');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <CustomLoader size="lg" />
        </div>
      </Layout>
    );
  }

  if (!isMerchant) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <ShieldCheck className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Merchant Access Only</h2>
          <p className="text-muted-foreground text-center mb-4">
            This page is only accessible to registered merchants.
          </p>
          <Button onClick={() => navigate('/home')}>Go Home</Button>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <Button onClick={() => navigate('/merchant/orders')}>View All Orders</Button>
        </div>
      </Layout>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending_payment;
  const netAmount = order.total_amount - order.commission_amount;

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <h1 className="font-semibold">Manage Order</h1>
              </div>
              <p className="text-xs text-muted-foreground">{order.order_number}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                  {order.buyer.avatar_url ? (
                    <img 
                      src={order.buyer.avatar_url} 
                      alt={order.buyer.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium">
                      {order.buyer.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{order.buyer.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{order.buyer.handle}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleContactBuyer}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Management */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between mb-4">
                <Badge className={status.color}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <Select
                  value={order.status}
                  onValueChange={handleStatusChange}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Total</span>
                <span className="font-medium">UGX {order.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Platform Commission ({order.commission_rate}%)</span>
                <span>- UGX {order.commission_amount.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-semibold text-green-600">
                  <span>Your Earnings</span>
                  <span>UGX {netAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      UGX {item.product_price.toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-sm">
                    UGX {item.subtotal.toLocaleString()}
                  </p>
                </div>
              ))}
              
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>UGX {order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
