import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, CreditCard, Package, Check, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { CheckoutContentSkeleton } from '@/components/skeletons';
import { formatPriceForCountry } from '@/lib/currencyUtils';



interface CartProduct {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

interface Merchant {
  id: string;
  name: string;
  commission_rate: number;
  user_id: string;
}

type CheckoutStep = 'address' | 'payment' | 'review' | 'confirmation';

const paymentMethods = [
  { id: 'mobile_money', label: 'Mobile Money', description: 'MTN, Airtel, or other mobile wallets' },
  { id: 'cash_on_delivery', label: 'Cash on Delivery', description: 'Pay when you receive your order' },
];

export default function Checkout() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [step, setStep] = useState<CheckoutStep>('address');
  const [orderResult, setOrderResult] = useState<{ order_number: string; total: number } | null>(null);

  // Form data
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');

  useEffect(() => {
    if (user && merchantId) {
      fetchCartAndMerchant();
    } else if (!user) {
      setLoading(false);
    }
  }, [user, merchantId]);

  const fetchCartAndMerchant = async () => {
    try {
      const [cartRes, merchantRes] = await Promise.all([
        supabase
          .from('shopping_cart')
          .select(`
            id,
            product_id,
            quantity,
            product:merchant_products(id, name, price, image_url, merchant_id)
          `)
          .eq('user_id', user!.id),
        supabase
          .from('merchants')
          .select('id, name, commission_rate, user_id')
          .eq('id', merchantId)
          .single()
      ]);

      if (merchantRes.data) {
        setMerchant(merchantRes.data);
      }

      if (cartRes.data) {
        const filtered = cartRes.data.filter(
          (item: any) => item.product?.merchant_id === merchantId
        );
        setCartItems(filtered as CartProduct[]);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const canProceedFromAddress = deliveryAddress.trim() && deliveryCity.trim() && deliveryPhone.trim();
  const canProceedFromPayment = paymentMethod;

  const handleNextStep = () => {
    if (step === 'address' && canProceedFromAddress) {
      setStep('payment');
    } else if (step === 'payment' && canProceedFromPayment) {
      setStep('review');
    }
  };

  const handlePrevStep = () => {
    if (step === 'payment') setStep('address');
    else if (step === 'review') setStep('payment');
    else navigate(-1);
  };

  const placeOrder = async () => {
    if (!merchant || !user || cartItems.length === 0) return;

    setIsOrdering(true);
    try {
      const { data, error } = await supabase.rpc('create_order_from_cart', {
        p_merchant_id: merchant.id
      });

      if (error) throw error;

      const result = data as { success: boolean; order_number?: string; total_amount?: number; message?: string };

      if (result.success && result.order_number) {
        // Update order with delivery info
        await supabase
          .from('merchant_orders')
          .update({
            notes: JSON.stringify({
              delivery_address: deliveryAddress,
              delivery_city: deliveryCity,
              delivery_phone: deliveryPhone,
              delivery_notes: deliveryNotes,
              payment_method: paymentMethod
            })
          })
          .eq('order_number', result.order_number);

        // Send notification to Shop Updates system chat
        await sendSystemNotification(result.order_number, result.total_amount || subtotal);

        setOrderResult({ order_number: result.order_number, total: result.total_amount || subtotal });
        setStep('confirmation');
      } else {
        toast.error(result.message || 'Failed to place order');
      }
    } catch (error: any) {
      console.error('Order error:', error);
      toast.error('Failed to place order');
    } finally {
      setIsOrdering(false);
    }
  };

  const getOrCreateSystemNotificationChat = async (userId: string): Promise<string | null> => {
    try {
      // Check if user already has a system notifications chat
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('is_system_notifications', true)
        .eq('created_by', userId)
        .maybeSingle();

      if (existingChat) {
        return existingChat.id;
      }

      // Create system notifications chat for this user
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

      // Add user as member
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

  const sendSystemNotification = async (orderNumber: string, total: number) => {
    if (!user || !merchant) return;

    try {
      // Get user profile for notification
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name, handle')
        .eq('id', user.id)
        .single();

      const customerName = userProfile?.display_name || userProfile?.handle || 'Customer';

      // Get or create system notification chat for buyer
      const buyerChatId = await getOrCreateSystemNotificationChat(user.id);
      
      // Get or create system notification chat for merchant
      const merchantChatId = await getOrCreateSystemNotificationChat(merchant.user_id);

      // Send notification to buyer's system chat
      if (buyerChatId) {
        await supabase.from('messages').insert({
          chat_id: buyerChatId,
          sender_id: user.id,
          encrypted_content: `✅ **Order Placed Successfully!**\n\n📦 Order: ${orderNumber}\n🏪 Merchant: ${merchant.name}\n💰 Total: UGX ${total.toLocaleString()}\n💳 Payment: ${paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Cash on Delivery'}\n\n[VIEW_ORDER:${orderNumber}]`,
          order_context: {
            order_number: orderNumber,
            merchant_id: merchant.id,
            merchant_name: merchant.name,
            total: total,
            payment_method: paymentMethod,
            type: 'order_placed'
          }
        });
      }

      // Send notification to merchant's system chat
      if (merchantChatId) {
        await supabase.from('messages').insert({
          chat_id: merchantChatId,
          sender_id: merchant.user_id,
          encrypted_content: `🆕 **New Order Received!**\n\n📦 Order: ${orderNumber}\n👤 Customer: ${customerName}\n💰 Total: UGX ${total.toLocaleString()}\n💳 Payment: ${paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Cash on Delivery'}\n\n[VIEW_ORDER:${orderNumber}]`,
          order_context: {
            order_number: orderNumber,
            customer_id: user.id,
            customer_name: customerName,
            total: total,
            payment_method: paymentMethod,
            type: 'new_order'
          }
        });
      }
    } catch (error) {
      console.error('Error sending order notifications:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <CheckoutContentSkeleton />
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to checkout</h2>
          <Button onClick={() => navigate('/auth/signin')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  if (cartItems.length === 0 && step !== 'confirmation') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Cart is empty</h2>
          <Button onClick={() => navigate(`/shop/${merchantId}`)}>Browse Products</Button>
        </div>
      </Layout>
    );
  }

  const steps = [
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'review', label: 'Review', icon: Package },
    { id: 'confirmation', label: 'Done', icon: Check },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-32">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={handlePrevStep}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Checkout</h1>
              <p className="text-xs text-muted-foreground">{merchant?.name}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    index <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStepIndex ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'address' && (
            <motion.div
              key="address"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      placeholder="Enter your street address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City / Area *</Label>
                    <Input
                      id="city"
                      placeholder="Enter city or area"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Delivery Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special instructions for delivery"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} />
                        <div className="flex-1">
                          <Label htmlFor={method.id} className="font-medium cursor-pointer">
                            {method.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          UGX {item.product.price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium text-sm">
                        UGX {(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>UGX {subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{deliveryAddress}</p>
                  <p>{deliveryCity}</p>
                  <p>{deliveryPhone}</p>
                  {deliveryNotes && <p className="text-muted-foreground">{deliveryNotes}</p>}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {paymentMethods.find(m => m.id === paymentMethod)?.label}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'confirmation' && orderResult && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 space-y-4"
            >
              <Card className="text-center py-8">
                <CardContent>
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Order Placed!</h2>
                  <p className="text-muted-foreground mb-4">
                    Your order has been placed successfully
                  </p>
                  <div className="bg-muted rounded-lg p-4 inline-block">
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-mono font-bold">{orderResult.order_number}</p>
                  </div>
                  <p className="text-2xl font-bold mt-4">
                    UGX {orderResult.total.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => navigate(`/orders/${orderResult.order_number}`)}
                >
                  View Order Details
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/home')}
                >
                  Continue Shopping
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Actions */}
        {step !== 'confirmation' && (
          <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">UGX {subtotal.toLocaleString()}</span>
            </div>

            {step === 'review' ? (
              <Button
                className="w-full"
                size="lg"
                onClick={placeOrder}
                disabled={isOrdering}
              >
                {isOrdering ? <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : 'Place Order'}
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={handleNextStep}
                disabled={
                  (step === 'address' && !canProceedFromAddress) ||
                  (step === 'payment' && !canProceedFromPayment)
                }
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
