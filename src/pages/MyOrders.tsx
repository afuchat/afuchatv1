import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, ShoppingBag, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { OrderListSkeleton } from '@/components/skeletons';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  merchant: {
    name: string;
    logo_url: string | null;
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

export default function MyOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data } = await supabase
        .from('merchant_orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          created_at,
          merchant:merchants(name, logo_url)
        `)
        .eq('buyer_id', user!.id)
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
        <OrderListSkeleton />
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view orders</h2>
          <Button onClick={() => navigate('/auth/signin')}>Sign In</Button>
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
            <div>
              <h1 className="font-semibold">My Orders</h1>
              <p className="text-xs text-muted-foreground">{orders.length} orders</p>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
            <Button onClick={() => navigate('/home')}>Browse Products</Button>
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
                  onClick={() => navigate(`/orders/${order.order_number}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={statusColors[order.status] || statusColors.pending_payment}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        {order.merchant.logo_url ? (
                          <img 
                            src={order.merchant.logo_url} 
                            alt={order.merchant.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{order.merchant.name}</p>
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