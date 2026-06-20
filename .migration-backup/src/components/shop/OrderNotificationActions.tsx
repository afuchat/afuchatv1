import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Eye, MessageCircle, CheckCircle, XCircle, RefreshCw, Truck, Package } from 'lucide-react';
import { toast } from 'sonner';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { useAuth } from '@/contexts/AuthContext';

interface OrderContext {
  order_number?: string;
  order_id?: string;
  customer_id?: string;
  customer_name?: string;
  total?: number;
  status?: string;
  type?: 'new_order' | 'cancellation' | 'refund_request' | 'status_update';
}

interface OrderNotificationActionsProps {
  orderContext: OrderContext;
  isAdmin?: boolean;
}

const SHOP_ADMIN_USER_ID = '629333cf-087e-4283-8a09-a44282dda98b';

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
        name: 'Shop Updates',
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

export function OrderNotificationActions({ orderContext, isAdmin }: OrderNotificationActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleViewOrder = () => {
    if (orderContext.order_number) {
      navigate(`/orders/${orderContext.order_number}`);
    }
  };

  const handleContactCustomer = async () => {
    if (!orderContext.customer_id) return;
    
    setLoading('contact');
    try {
      // Get merchant info
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', SHOP_ADMIN_USER_ID)
        .single();

      if (!merchant) {
        toast.error('Merchant not found');
        return;
      }

      // Check for existing chat with this customer
      const { data: existingChat } = await supabase
        .from('merchant_customer_chats')
        .select('chat_id')
        .eq('merchant_id', merchant.id)
        .eq('customer_id', orderContext.customer_id)
        .maybeSingle();

      if (existingChat?.chat_id) {
        navigate(`/chat/${existingChat.chat_id}`);
      } else {
        // Create new chat
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            created_by: SHOP_ADMIN_USER_ID,
            is_group: false
          })
          .select('id')
          .single();

        if (error) throw error;

        // Add members
        await supabase.from('chat_members').insert([
          { chat_id: newChat.id, user_id: SHOP_ADMIN_USER_ID },
          { chat_id: newChat.id, user_id: orderContext.customer_id }
        ]);

        // Track relationship
        await supabase.from('merchant_customer_chats').insert({
          merchant_id: merchant.id,
          customer_id: orderContext.customer_id,
          chat_id: newChat.id
        });

        navigate(`/chat/${newChat.id}`);
      }
    } catch (error) {
      console.error('Error contacting customer:', error);
      toast.error('Failed to open chat');
    } finally {
      setLoading(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'payment_recorded': 'Payment Confirmed',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'fulfilled': 'Fulfilled',
      'refunded': 'Refunded',
      'refund_rejected': 'Refund Rejected',
      'pending': 'Pending'
    };
    return labels[status] || status;
  };

  const getStatusEmoji = (status: string) => {
    const emojis: Record<string, string> = {
      'payment_recorded': '💳',
      'processing': '⚙️',
      'shipped': '🚚',
      'completed': '✅',
      'cancelled': '❌',
      'fulfilled': '📦',
      'refunded': '💰',
      'refund_rejected': '🚫',
      'pending': '⏳'
    };
    return emojis[status] || '✅';
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!orderContext.order_number) return;
    
    setLoading(newStatus);
    try {
      const { error } = await supabase
        .from('merchant_orders')
        .update({ status: newStatus })
        .eq('order_number', orderContext.order_number);

      if (error) throw error;

      const emoji = getStatusEmoji(newStatus);
      const label = getStatusLabel(newStatus);

      // Send status update to merchant's system notification chat
      const merchantChatId = await getOrCreateSystemNotificationChat(SHOP_ADMIN_USER_ID);
      if (merchantChatId) {
        await supabase.from('messages').insert({
          chat_id: merchantChatId,
          sender_id: SHOP_ADMIN_USER_ID,
          encrypted_content: `${emoji} **Order Status Updated**\n\nOrder: ${orderContext.order_number}\nNew Status: ${label}\n\n[VIEW_ORDER:${orderContext.order_number}]`,
          order_context: {
            ...orderContext,
            status: newStatus,
            type: 'status_update'
          }
        });
      }

      // Send notification to customer's system notification chat
      if (orderContext.customer_id) {
        const customerChatId = await getOrCreateSystemNotificationChat(orderContext.customer_id);
        if (customerChatId) {
          await supabase.from('messages').insert({
            chat_id: customerChatId,
            sender_id: orderContext.customer_id,
            encrypted_content: `${emoji} **Order Update**\n\nYour order **${orderContext.order_number}** has been updated to: **${label}**\n\n[VIEW_ORDER:${orderContext.order_number}]`,
            order_context: {
              ...orderContext,
              status: newStatus,
              type: 'status_update'
            }
          });
        }
      }

      toast.success(`Order marked as ${label}`);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setLoading(null);
    }
  };

  // Customer view - show tracking buttons only
  if (!isAdmin) {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={handleViewOrder}>
          <Package className="h-3 w-3 mr-1" />
          View Order
        </Button>
        {orderContext.status && ['fulfilled', 'payment_recorded'].includes(orderContext.status) && (
          <Button size="sm" variant="outline" onClick={handleViewOrder}>
            <Truck className="h-3 w-3 mr-1" />
            Track
          </Button>
        )}
      </div>
    );
  }

  // Admin/Merchant view
  return (
    <div className="space-y-2 mt-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleViewOrder}>
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleContactCustomer}
          disabled={loading === 'contact'}
        >
          {loading === 'contact' ? (
            <CustomLoader size="sm" />
          ) : (
            <>
              <MessageCircle className="h-3 w-3 mr-1" />
              Chat
            </>
          )}
        </Button>
      </div>
      
      {orderContext.type === 'new_order' && (
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleUpdateStatus('payment_recorded')}
            disabled={loading === 'payment_recorded'}
          >
            {loading === 'payment_recorded' ? (
              <CustomLoader size="sm" />
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirm Payment
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => handleUpdateStatus('cancelled')}
            disabled={loading === 'cancelled'}
          >
            {loading === 'cancelled' ? (
              <CustomLoader size="sm" />
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Cancel
              </>
            )}
          </Button>
        </div>
      )}

      {orderContext.type === 'refund_request' && (
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleUpdateStatus('refunded')}
            disabled={loading === 'refunded'}
          >
            {loading === 'refunded' ? (
              <CustomLoader size="sm" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Approve Refund
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleUpdateStatus('refund_rejected')}
            disabled={loading === 'refund_rejected'}
          >
            Reject Refund
          </Button>
        </div>
      )}
    </div>
  );
}