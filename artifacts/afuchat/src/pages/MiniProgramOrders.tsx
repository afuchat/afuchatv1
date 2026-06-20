import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Receipt, Calendar, Ticket, UtensilsCrossed, Car, 
  CalendarCheck, Plane, Hotel, Clock, ChevronRight, Loader2,
  Package, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { MiniProgramHeader } from '@/components/mini-programs/MiniProgramHeader';
import { format } from 'date-fns';

const orderTypeIcons: Record<string, any> = {
  event: Ticket,
  food: UtensilsCrossed,
  ride: Car,
  booking: CalendarCheck,
  flight: Plane,
  hotel: Hotel,
};

const orderTypeLabels: Record<string, string> = {
  event: 'Event',
  food: 'Food',
  ride: 'Ride',
  booking: 'Booking',
  flight: 'Flight',
  hotel: 'Hotel',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  processing: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  refunded: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const MiniProgramOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['mini-program-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mini_program_orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = order.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || order.order_type === activeTab;
    return matchesSearch && matchesTab;
  }) || [];

  const activeOrders = filteredOrders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status));
  const completedOrders = filteredOrders.filter(o => ['completed'].includes(o.status));
  const cancelledOrders = filteredOrders.filter(o => ['cancelled', 'refunded'].includes(o.status));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled':
      case 'refunded':
        return <XCircle className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MiniProgramHeader />

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-sm text-muted-foreground">
              {orders?.length || 0} total orders
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search orders by name or order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'event', 'food', 'ride', 'booking', 'flight', 'hotel'].map((type) => (
            <Button
              key={type}
              variant={activeTab === type ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(type)}
              className="shrink-0 gap-2"
            >
              {type !== 'all' && (() => {
                const Icon = orderTypeIcons[type];
                return <Icon className="h-4 w-4" />;
              })()}
              {type === 'all' ? 'All Orders' : orderTypeLabels[type]}
            </Button>
          ))}
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50">
            <TabsTrigger value="active" className="gap-2">
              <Clock className="h-4 w-4" />
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelled ({cancelledOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6 space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No active orders</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => navigate(`/mini-program-orders/${order.id}`)} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 space-y-4">
            {completedOrders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No completed orders</p>
              </div>
            ) : (
              completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => navigate(`/mini-program-orders/${order.id}`)} />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6 space-y-4">
            {cancelledOrders.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No cancelled orders</p>
              </div>
            ) : (
              cancelledOrders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => navigate(`/mini-program-orders/${order.id}`)} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

interface OrderCardProps {
  order: any;
  onClick: () => void;
}

const OrderCard = ({ order, onClick }: OrderCardProps) => {
  const Icon = orderTypeIcons[order.order_type] || Package;
  const itemDetails = order.item_details as Record<string, any>;
  const firstItem = itemDetails?.items?.[0];

  return (
    <div 
      className="rounded-xl bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {firstItem?.image ? (
          <img 
            src={firstItem.image} 
            alt={order.item_name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{order.item_name}</p>
              <p className="text-sm text-muted-foreground">{order.order_number}</p>
            </div>
            <Badge 
              variant="outline" 
              className={`shrink-0 gap-1 ${statusColors[order.status]}`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(order.created_at), 'MMM d, yyyy')}
            </div>
            <Badge variant="secondary" className="gap-1">
              {orderTypeLabels[order.order_type]}
            </Badge>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="font-bold text-primary">{order.total_amount} ACoin</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniProgramOrders;
