import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, CheckCircle, Clock, XCircle, Truck, MessageCircle, User, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { PageSkeleton } from '@/components/skeletons';
import { ButtonLoader } from '@/components/ui/CustomLoader';

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
  status: string;
  payment_status: string;
  created_at: string;
  merchant_id: string;
  buyer_id: string;
  buyer?: {
    display_name: string;
    handle: string;
    avatar_url: string;
  };
  merchant: {
    name: string;
    user_id: string;
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
  processing: { 
    label: 'Processing', 
    icon: <Package className="h-4 w-4" />, 
    color: 'bg-orange-500/10 text-orange-500' 
  },
  shipped: { 
    label: 'Shipped', 
    icon: <Truck className="h-4 w-4" />, 
    color: 'bg-purple-500/10 text-purple-500' 
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

const statusFlow = ['pending_payment', 'payment_recorded', 'processing', 'shipped', 'completed'];

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactingSupport, setContactingSupport] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isMerchant = user && order?.merchant?.user_id === user.id;

  useEffect(() => {
    if (user && orderNumber) {
      fetchOrder();
    }
  }, [user, orderNumber]);

  const fetchOrder = async () => {
    try {
      const { data: orderData } = await supabase
        .from('merchant_orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          payment_status,
          created_at,
          merchant_id,
          buyer_id,
          buyer:profiles!merchant_orders_buyer_id_fkey(display_name, handle, avatar_url),
          merchant:merchants(name, user_id)
        `)
        .eq('order_number', orderNumber)
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

  const getOrCreateSystemNotificationChat = async (userId: string): Promise<string | null> => {
    try {
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('is_system_notifications', true)
        .eq('created_by', userId)
        .maybeSingle();

      if (existingChat) return existingChat.id;

      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          name: 'ShopShack Updates',
          is_system_notifications: true,
          is_group: false,
          created_by: userId
        })
        .select('id')
        .single();

      if (error) throw error;

      await supabase.from('chat_members').insert({
        chat_id: newChat.id,
        user_id: userId
      });

      return newChat.id;
    } catch (error) {
      console.error('Error creating system notification chat:', error);
      return null;
    }
  };

  const sendStatusNotification = async (newStatus: string) => {
    if (!order) return;

    const statusLabel = statusConfig[newStatus]?.label || newStatus;
    
    try {
      // Notify buyer
      const buyerChatId = await getOrCreateSystemNotificationChat(order.buyer_id);
      if (buyerChatId) {
        await supabase.from('messages').insert({
          chat_id: buyerChatId,
          sender_id: order.buyer_id,
          encrypted_content: `📦 **Order Status Updated**\n\nOrder: ${order.order_number}\nNew Status: ${statusLabel}\n\n[VIEW_ORDER:${order.order_number}]`,
          order_context: {
            order_number: order.order_number,
            status: newStatus,
            type: 'status_update'
          }
        });
      }

      // Notify merchant
      const merchantChatId = await getOrCreateSystemNotificationChat(order.merchant.user_id);
      if (merchantChatId) {
        await supabase.from('messages').insert({
          chat_id: merchantChatId,
          sender_id: order.merchant.user_id,
          encrypted_content: `📦 **Order Status Updated**\n\nOrder: ${order.order_number}\nNew Status: ${statusLabel}\n\n[VIEW_ORDER:${order.order_number}]`,
          order_context: {
            order_number: order.order_number,
            status: newStatus,
            type: 'status_update'
          }
        });
      }
    } catch (error) {
      console.error('Error sending status notification:', error);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('merchant_orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({ ...order, status: newStatus });
      
      // Send notifications to both parties
      await sendStatusNotification(newStatus);
      
      toast.success(`Order status updated to ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleContactBuyer = async () => {
    if (!user || !order) return;

    setContactingSupport(true);
    try {
      const { data: existingChat } = await supabase
        .from('merchant_customer_chats')
        .select('chat_id')
        .eq('merchant_id', order.merchant_id)
        .eq('customer_id', order.buyer_id)
        .maybeSingle();

      let chatId = existingChat?.chat_id;

      if (!chatId) {
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
      toast.error('Failed to start chat with buyer');
    } finally {
      setContactingSupport(false);
    }
  };

  const handleContactSupport = async () => {
    if (!user || !order) {
      toast.error('Please sign in to contact support');
      return;
    }

    setContactingSupport(true);
    try {
      const { data: existingChat } = await supabase
        .from('merchant_customer_chats')
        .select('chat_id')
        .eq('merchant_id', order.merchant_id)
        .eq('customer_id', user.id)
        .maybeSingle();

      let chatId = existingChat?.chat_id;

      if (!chatId) {
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
          { chat_id: chatId, user_id: order.merchant.user_id }
        ]);

        await supabase.from('merchant_customer_chats').insert({
          merchant_id: order.merchant_id,
          customer_id: user.id,
          chat_id: chatId
        });
      }

      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        encrypted_content: `📦 **Order Support Request**\n\nOrder: ${order.order_number}\nTotal: UGX ${order.total_amount.toLocaleString()}\nStatus: ${statusConfig[order.status]?.label || order.status}\n\nHow can we help you today?`,
        order_context: {
          order_id: order.id,
          order_number: order.order_number,
          status: order.status
        }
      });

      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error contacting support:', error);
      toast.error('Failed to start chat with support');
    } finally {
      setContactingSupport(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageSkeleton variant="full" />
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <Button onClick={() => navigate('/orders')}>View All Orders</Button>
        </div>
      </Layout>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending_payment;
  const currentStatusIndex = statusFlow.indexOf(order.status);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < statusFlow.length - 1 
    ? statusFlow[currentStatusIndex + 1] 
    : null;

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{isMerchant ? 'Manage Order' : 'Order Details'}</h1>
              <p className="text-xs text-muted-foreground">{order.order_number}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Merchant: Buyer Info Card */}
          {isMerchant && order.buyer && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-3">
                  {order.buyer.avatar_url ? (
                    <img 
                      src={order.buyer.avatar_url} 
                      alt={order.buyer.display_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{order.buyer.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{order.buyer.handle}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleContactBuyer}
                    disabled={contactingSupport}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Badge className={status.color}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              
              <div className="text-center py-6">
                <Package className="h-12 w-12 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-bold">UGX {order.total_amount.toLocaleString()}</h2>
                <p className="text-muted-foreground">{order.merchant.name}</p>
              </div>

              {/* Merchant: Status Management */}
              {isMerchant && order.status !== 'completed' && order.status !== 'cancelled' && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm font-medium text-center">Update Order Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {nextStatus && (
                      <Button
                        onClick={() => handleUpdateStatus(nextStatus)}
                        disabled={updatingStatus}
                        className="col-span-2"
                      >
                        {updatingStatus ? <ButtonLoader /> : (
                          <>
                            {statusConfig[nextStatus]?.icon}
                            <span className="ml-2">Mark as {statusConfig[nextStatus]?.label}</span>
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateStatus('cancelled')}
                      disabled={updatingStatus}
                      className={nextStatus ? '' : 'col-span-2'}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel Order
                    </Button>
                  </div>
                </div>
              )}

              {/* Buyer: Payment Instructions */}
              {!isMerchant && order.status === 'pending_payment' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
                  <h3 className="font-medium text-yellow-600 mb-2">Payment Instructions</h3>
                  <p className="text-sm text-muted-foreground">
                    Please pay directly to {order.merchant.name}. Your order will be processed 
                    once payment is confirmed by the merchant.
                  </p>
                </div>
              )}

              {/* Buyer: Contact Seller Button */}
              {!isMerchant && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleContactSupport}
                  disabled={contactingSupport}
                >
                  {contactingSupport ? (
                    <ButtonLoader />
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact {order.merchant.name}
                    </>
                  )}
                </Button>
              )}
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
