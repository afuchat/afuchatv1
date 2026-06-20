import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Store, ChevronRight, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CustomLoader } from '@/components/ui/CustomLoader';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  commission_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  buyer: {
    display_name: string;
    avatar_url: string | null;
  };
}

const statusColors: Record<string, string> = {
  pending_payment: 'bg-yellow-500/10 text-yellow-500',
  payment_recorded: 'bg-blue-500/10 text-blue-500',
  fulfilled: 'bg-purple-500/10 text-purple-500',
  completed: 'bg-green-500/10 text-green-500',
  cancelled: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  pending_payment: 'Pending Payment',
  payment_recorded: 'Payment Recorded',
  fulfilled: 'Fulfilled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MerchantOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkMerchantStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkMerchantStatus = async () => {
    try {
      // Check if user is a merchant
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (merchant) {
        setIsMerchant(true);
        setMerchantId(merchant.id);
        await fetchOrders(merchant.id);
      } else {
        setIsMerchant(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking merchant status:', error);
      setLoading(false);
    }
  };

  const fetchOrders = async (merchantId: string) => {
    try {
      const { data } = await supabase
        .from('merchant_orders')
        .select(`
          id,
          order_number,
          total_amount,
          commission_amount,
          status,
          payment_status,
          created_at,
          buyer:profiles!merchant_orders_buyer_id_fkey(display_name, avatar_url)
        `)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (data) {
        setOrders(data as unknown as Order[]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
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

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Store className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to manage orders</h2>
          <Button onClick={() => navigate('/auth/signin')}>Sign In</Button>
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
                <h1 className="font-semibold">Merchant Orders</h1>
              </div>
              <p className="text-xs text-muted-foreground">{orders.length} orders to manage</p>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground">Orders from customers will appear here</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/merchant/orders/${order.order_number}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={statusColors[order.status] || statusColors.pending_payment}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                        {order.buyer.avatar_url ? (
                          <img 
                            src={order.buyer.avatar_url} 
                            alt={order.buyer.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {order.buyer.display_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{order.buyer.display_name}</p>
                        <p className="text-xs text-muted-foreground">{order.order_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">UGX {order.total_amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
