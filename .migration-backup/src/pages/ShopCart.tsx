import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, CreditCard, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CustomLoader } from '@/components/ui/CustomLoader';

interface CartProduct {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    image_url: string | null;
  };
}

interface Merchant {
  id: string;
  name: string;
  commission_rate: number;
}

export default function ShopCart() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

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
            product:merchant_products(id, name, price, stock, image_url, merchant_id)
          `)
          .eq('user_id', user!.id),
        supabase
          .from('merchants')
          .select('id, name, commission_rate')
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

  const updateQuantity = async (itemId: string, productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await supabase.from('shopping_cart').delete().eq('id', itemId);
      setCartItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      await supabase
        .from('shopping_cart')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      setCartItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeItem = async (itemId: string) => {
    await supabase.from('shopping_cart').delete().eq('id', itemId);
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('Item removed from cart');
  };

  const proceedToCheckout = () => {
    navigate(`/shop/${merchantId}/checkout`);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity, 
    0
  );

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
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view cart</h2>
          <Button onClick={() => navigate('/auth/signin')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-32">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Shopping Cart</h1>
              <p className="text-xs text-muted-foreground">
                {merchant?.name} • {cartItems.length} items
              </p>
            </div>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cart is empty</h2>
            <p className="text-muted-foreground mb-4">Add some products to get started</p>
            <Button onClick={() => navigate(`/shop/${merchantId}`)}>
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cartItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-3 flex gap-3">
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.product?.image_url ? (
                        <img 
                          src={item.product.image_url} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2">{item.product?.name}</h3>
                      <p className="text-primary font-semibold mt-1">
                        UGX {(item.product?.price || 0).toLocaleString()}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.product_id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-medium w-6 text-center">{item.quantity}</span>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.product_id, item.quantity + 1)}
                            disabled={item.quantity >= (item.product?.stock || 0)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Checkout Footer */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">UGX {subtotal.toLocaleString()}</span>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={proceedToCheckout}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}