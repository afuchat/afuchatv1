import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountMode } from '@/contexts/AccountModeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, TrendingUp, DollarSign, UserCheck, Clock, CheckCircle, XCircle, 
  Briefcase, Package, ShoppingBag, Store, ChevronRight, Edit, Eye, Plus
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AffiliateRequest {
  id: string;
  user_id: string;
  notes: string | null;
  requested_at: string;
  status: string;
  profiles: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
}

interface Affiliate {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  xp: number;
}

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

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
}

interface BusinessStats {
  totalAffiliates: number;
  pendingRequests: number;
  totalEngagement: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  totalRevenue: number;
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

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode, canUseBusiness } = useAccountMode();
  const [loading, setLoading] = useState(true);
  const [isOrganizationVerified, setIsOrganizationVerified] = useState<boolean | null>(null);
  const [stats, setStats] = useState<BusinessStats>({ 
    totalAffiliates: 0, 
    pendingRequests: 0, 
    totalEngagement: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalRevenue: 0
  });
  const [affiliateRequests, setAffiliateRequests] = useState<AffiliateRequest[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'approve' | 'reject'; requestId: string | null }>({
    open: false,
    type: 'approve',
    requestId: null
  });
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null
  });
  const [commissionRate, setCommissionRate] = useState<string>('10');
  const [paymentTerms, setPaymentTerms] = useState<string>('Monthly payment based on affiliate performance');

  useEffect(() => {
    if (!user) return;
    checkOrganizationVerification();
    fetchDashboardData();
  }, [user]);

  const checkOrganizationVerification = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_organization_verified')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setIsOrganizationVerified(data.is_organization_verified || false);
      }
    } catch (error) {
      console.error('Error checking organization verification:', error);
      setIsOrganizationVerified(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if user is a merchant
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (merchant) {
        setMerchantId(merchant.id);
        
        // Fetch orders
        const { data: ordersData } = await supabase
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
          .eq('merchant_id', merchant.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (ordersData) {
          setOrders(ordersData as unknown as Order[]);
        }

        // Fetch products
        const { data: productsData } = await supabase
          .from('merchant_products')
          .select('id, name, price, stock, category, image_url, is_available')
          .eq('merchant_id', merchant.id)
          .order('name');

        if (productsData) {
          setProducts(productsData);
        }

        // Calculate order stats
        const pendingOrders = ordersData?.filter(o => o.status === 'pending_payment' || o.status === 'payment_recorded').length || 0;
        const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.total_amount - o.commission_amount), 0) || 0;

        setStats(prev => ({
          ...prev,
          totalOrders: ordersData?.length || 0,
          pendingOrders,
          totalProducts: productsData?.length || 0,
          totalRevenue
        }));
      }

      // Fetch pending affiliate requests
      const { data: requests, error: requestsError } = await supabase
        .from('affiliate_requests')
        .select(`
          id,
          user_id,
          notes,
          requested_at,
          status,
          profiles!affiliate_requests_user_id_fkey (
            display_name,
            handle,
            avatar_url
          )
        `)
        .eq('business_profile_id', user.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;
      setAffiliateRequests(requests as any || []);

      // Fetch current affiliates
      const { data: affiliateData, error: affiliatesError } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, xp')
        .eq('affiliated_business_id', user.id)
        .eq('is_affiliate', true)
        .order('display_name');

      if (affiliatesError) throw affiliatesError;
      setAffiliates(affiliateData || []);

      // Calculate affiliate stats
      const totalEngagement = affiliateData?.reduce((sum, affiliate) => sum + affiliate.xp, 0) || 0;
      setStats(prev => ({
        ...prev,
        totalAffiliates: affiliateData?.length || 0,
        pendingRequests: requests?.length || 0,
        totalEngagement
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!approveDialog.requestId) return;
    
    const commissionValue = parseFloat(commissionRate);
    if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
      toast.error('Please enter a valid commission rate between 0 and 100');
      return;
    }

    setProcessingRequest(approveDialog.requestId);
    try {
      const { data, error } = await supabase.rpc('approve_affiliate_by_business', {
        p_request_id: approveDialog.requestId,
        p_commission_rate: commissionValue,
        p_payment_terms: paymentTerms
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (result.success) {
        toast.success('Affiliate request approved!');
        fetchDashboardData();
        setApproveDialog({ open: false, requestId: null });
        setCommissionRate('10');
        setPaymentTerms('Monthly payment based on affiliate performance');
      } else {
        toast.error(result.message || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const { data, error } = await supabase.rpc('reject_affiliate_by_business', {
        p_request_id: requestId,
        p_notes: null
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (result.success) {
        toast.success('Affiliate request rejected');
        fetchDashboardData();
      } else {
        toast.error(result.message || 'Failed to reject request');
      }
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setProcessingRequest(null);
      setConfirmDialog({ open: false, type: 'reject', requestId: null });
    }
  };

  if (!canUseBusiness) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Business features are not enabled for your account.</p>
      </div>
    );
  }

  // Show verification pending state
  if (isOrganizationVerified === false) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader 
          title="Business Hub" 
          subtitle="Verification Required"
          icon={<Briefcase className="h-5 w-5 text-primary" />}
        />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Verification Pending</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your business account is pending verification. Once verified as an organization, you'll be able to access your Business Hub to manage orders, products, and receive affiliate requests.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2 text-sm">What happens after verification?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Manage your product catalog and orders</li>
                <li>• Receive and approve affiliate requests</li>
                <li>• Build your affiliate team</li>
                <li>• Track revenue and performance</li>
              </ul>
            </div>
            <Button onClick={() => navigate('/home')} variant="outline">
              Back to Home
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Still checking verification status
  if (isOrganizationVerified === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader 
        title="Business Hub" 
        subtitle="Manage orders, products & affiliates"
        icon={<Briefcase className="h-5 w-5 text-primary" />}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="text-xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{stats.pendingOrders}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{stats.totalProducts}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold">UGX {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Tabs */}
        <Card className="p-4">
          <Tabs defaultValue="orders">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="orders" className="text-xs">
                <ShoppingBag className="h-4 w-4 mr-1" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs">
                <Package className="h-4 w-4 mr-1" />
                Catalog
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs">
                Requests
                {stats.pendingRequests > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">{stats.pendingRequests}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="text-xs">
                <Users className="h-4 w-4 mr-1" />
                Team
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Orders from customers will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/merchant/orders/${order.order_number}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={statusColors[order.status] || statusColors.pending_payment}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center overflow-hidden">
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
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{order.buyer.display_name}</p>
                            <p className="text-xs text-muted-foreground">{order.order_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">UGX {order.total_amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.created_at), 'MMM d')}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                  
                  {orders.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => navigate('/merchant/orders')}
                    >
                      View All Orders
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Products/Catalog Tab */}
            <TabsContent value="products" className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No products in catalog</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Products synced from your store will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.slice(0, 10).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{product.name}</p>
                              {!product.is_available && (
                                <Badge variant="secondary" className="text-xs">Hidden</Badge>
                              )}
                            </div>
                            <p className="text-sm text-primary font-semibold">
                              UGX {product.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {product.stock} • {product.category || 'Uncategorized'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/product/${product.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                  
                  {products.length > 10 && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => merchantId && navigate(`/shop/${merchantId}`)}
                    >
                      View All Products ({products.length})
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Affiliate Requests Tab */}
            <TabsContent value="requests" className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : affiliateRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending affiliate requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {affiliateRequests.map((request) => (
                    <Card key={request.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">{request.profiles.display_name}</h3>
                              <span className="text-muted-foreground text-xs">@{request.profiles.handle}</span>
                            </div>
                            {request.notes && (
                              <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{request.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(request.requested_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => setApproveDialog({ open: true, requestId: request.id })}
                            disabled={processingRequest === request.id}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDialog({ open: true, type: 'reject', requestId: request.id })}
                            disabled={processingRequest === request.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Affiliates/Team Tab */}
            <TabsContent value="affiliates" className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : affiliates.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No affiliates yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Approve affiliate requests to grow your network
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Total Nexa: <span className="font-semibold text-foreground">{stats.totalEngagement.toLocaleString()}</span>
                    </p>
                  </div>
                  {affiliates.map((affiliate) => (
                    <Card key={affiliate.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {affiliate.avatar_url ? (
                            <img 
                              src={affiliate.avatar_url} 
                              alt={affiliate.display_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-semibold text-primary">
                                {affiliate.display_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm">{affiliate.display_name}</h3>
                              <Badge variant="secondary" className="text-xs">Affiliate</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {affiliate.xp.toLocaleString()} Nexa
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/@${affiliate.handle}`)}
                        >
                          View
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ ...approveDialog, open })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Affiliate Request</DialogTitle>
            <DialogDescription>
              Configure commission rate and payment terms for this affiliate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Textarea
                id="payment-terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Monthly payment based on affiliate performance"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog({ open: false, requestId: null })}
              disabled={processingRequest !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveRequest}
              disabled={processingRequest !== null}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open && confirmDialog.type === 'reject'} 
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Affiliate Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this affiliate request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.requestId && handleRejectRequest(confirmDialog.requestId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BusinessDashboard;
