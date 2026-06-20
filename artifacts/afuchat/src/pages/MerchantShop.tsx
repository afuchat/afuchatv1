import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingCart, Plus, Minus, Store, Package, Ban, MapPin, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { PageSkeleton } from '@/components/skeletons';
import { formatPriceForCountry } from '@/lib/currencyUtils';
// Shop branding now uses merchant data from database

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  category: string | null;
  image_url: string | null;
}

interface Merchant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  user_id: string;
}

interface CartItem {
  product_id: string;
  quantity: number;
}

export default function MerchantShop() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [contactingSupport, setContactingSupport] = useState(false);
  
  // Detect if running in iframe (embedded app viewer)
  const isInIframe = window.self !== window.top;

  useEffect(() => {
    fetchUserCountry();
  }, []);

  const fetchUserCountry = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', authUser.id)
          .single();
        if (profile?.country) {
          setUserCountry(profile.country);
        }
      }
    } catch (error) {
      console.error('Error fetching user country:', error);
    }
  };

  useEffect(() => {
    if (merchantId) {
      fetchMerchantAndProducts();
      if (user) fetchCart();
    }
  }, [merchantId, user]);

  const fetchMerchantAndProducts = async () => {
    try {
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id, name, description, logo_url, user_id')
        .eq('id', merchantId!)
        .single();

      if (merchantData) {
        setMerchant(merchantData);
      }

      const { data: productsData } = await supabase
        .from('merchant_products')
        .select('id, name, description, price, stock, category, image_url')
        .eq('merchant_id', merchantId!)
        .eq('is_available', true)
        .order('name');

      if (productsData) {
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error fetching merchant:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('shopping_cart')
      .select('product_id, quantity')
      .eq('user_id', user.id);

    if (data) {
      const cartMap = new Map<string, number>();
      data.forEach((item: CartItem) => cartMap.set(item.product_id, item.quantity));
      setCart(cartMap);
    }
  };

  const updateCart = async (productId: string, quantity: number) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    const newCart = new Map(cart);
    
    if (quantity <= 0) {
      newCart.delete(productId);
      await supabase
        .from('shopping_cart')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    } else {
      newCart.set(productId, quantity);
      await supabase
        .from('shopping_cart')
        .upsert({
          user_id: user.id,
          product_id: productId,
          quantity,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,product_id' });
    }
    
    setCart(newCart);
  };

  const categories = ['all', ...new Set(products.map(p => p.category || 'other').filter(Boolean))];
  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => (p.category || 'other') === activeCategory);

  const cartTotal = Array.from(cart.entries()).reduce((sum, [productId, qty]) => {
    const product = products.find(p => p.id === productId);
    return sum + (product ? product.price * qty : 0);
  }, 0);

  const cartItemCount = Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0);

  // Check if user is from Uganda - restrict access for non-Ugandans
  const isUgandan = userCountry === 'Uganda';
  const showRestriction = userCountry && !isUgandan;

  const handleContactMerchant = async () => {
    if (!user || !merchant) {
      toast.error('Please sign in to contact the shop');
      navigate('/auth/signin');
      return;
    }

    setContactingSupport(true);
    try {
      // Check for existing chat with this merchant
      const { data: existingChat } = await supabase
        .from('merchant_customer_chats')
        .select('chat_id')
        .eq('merchant_id', merchant.id)
        .eq('customer_id', user.id)
        .maybeSingle();

      let chatId = existingChat?.chat_id;

      if (!chatId) {
        // Create a new chat
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

        // Add both users to the chat
        await supabase.from('chat_members').insert([
          { chat_id: chatId, user_id: user.id },
          { chat_id: chatId, user_id: merchant.user_id }
        ]);

        // Record the merchant-customer chat relationship
        await supabase.from('merchant_customer_chats').insert({
          merchant_id: merchant.id,
          customer_id: user.id,
          chat_id: chatId
        });
      }

      // Send a support request message
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        encrypted_content: `👋 **Support Request**\n\nHello ${merchant.name} team,\n\nI'm reaching out regarding your service availability. I noticed that ${merchant.name} is currently only available in Uganda, and I'm located in ${userCountry}.\n\nCould you please help me with:\n• Information about future expansion plans\n• Alternative options for my region\n• Any other assistance you can provide\n\nThank you!`
      });

      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error contacting merchant:', error);
      toast.error('Failed to start chat with merchant');
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

  // Show restriction for non-Ugandan users
  if (showRestriction) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center gap-3 p-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                {merchant?.logo_url ? (
                  <img src={merchant.logo_url} alt={merchant?.name || 'Shop'} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                )}
                <h1 className="font-semibold">{merchant?.name || 'Shop'}</h1>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto p-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Status Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Ban className="h-10 w-10 text-destructive" />
                </div>
              </div>

              {/* Main Title */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Service Unavailable</h1>
                <p className="text-muted-foreground">
                  {merchant?.name || 'This shop'} is not available in your region
                </p>
              </div>

              {/* Your Location */}
              <div className="flex items-center justify-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Your location: <strong>{userCountry}</strong></span>
              </div>

              {/* Terms Section */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-lg">Service Availability Notice</h2>
                
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <h3 className="font-medium text-foreground">Geographic Restrictions</h3>
                    <p>
                      {merchant?.name || 'This merchant'} has chosen to operate exclusively within <strong className="text-foreground">Uganda</strong> at this time. 
                      This decision was made to ensure optimal service delivery, logistics support, and customer experience.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium text-foreground">About This Shop</h3>
                    <p>
                      {merchant?.name || 'This merchant'} is an independent e-commerce platform operating on this marketplace. 
                      All product listings, pricing, delivery, and customer service are managed directly by the merchant.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium text-foreground">Currently Serving</h3>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Uganda — All districts nationwide</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium text-foreground">Expansion Plans</h3>
                    <p>
                      {merchant?.name || 'This merchant'} may expand to additional regions in the future based on their business decisions. 
                      For updates on service availability, please contact them directly.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/50 text-xs">
                    <p className="italic">
                      Note: This platform hosts independent merchants who set their own service regions and policies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Merchant */}
              <div className="bg-muted/30 rounded-lg p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Have questions about service availability?</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleContactMerchant}
                  disabled={contactingSupport}
                  className="gap-2"
                >
                  {contactingSupport ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      Chat with {merchant?.name || 'Merchant'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This platform provides the marketplace. Product availability and service regions are determined by each merchant.
                </p>
              </div>

              {/* Back Button */}
              <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!merchant) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Store className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Merchant not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideNav={isInIframe}>
      <div className={`min-h-screen bg-background ${isInIframe ? 'pb-4' : 'pb-24'}`}>
        {/* Header - hide when in iframe */}
        {!isInIframe && (
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  {merchant.logo_url ? (
                    <img src={merchant.logo_url} alt={merchant.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <h1 className="font-semibold">{merchant.name}</h1>
                    <p className="text-xs text-muted-foreground">{products.length} products</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="relative"
                onClick={() => navigate(`/shop/${merchantId}/cart`)}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Cart
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="px-4 py-3 overflow-x-auto">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="bg-muted/50 h-9">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Products Grid */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden">
                <div 
                  className="aspect-square bg-muted relative cursor-pointer"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {(product.stock ?? 0) < 5 && (product.stock ?? 0) > 0 && (
                    <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                      {product.stock} left
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-primary font-semibold">
                    {formatPriceForCountry(product.price, userCountry)}
                  </p>
                  
                  {cart.get(product.id) ? (
                    <div className="flex items-center justify-between mt-2">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-7 w-7"
                        onClick={() => updateCart(product.id, (cart.get(product.id) || 0) - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-medium text-sm">{cart.get(product.id)}</span>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-7 w-7"
                        onClick={() => updateCart(product.id, (cart.get(product.id) || 0) + 1)}
                        disabled={(cart.get(product.id) || 0) >= (product.stock ?? 0)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      className="w-full mt-2 h-8"
                      onClick={() => updateCart(product.id, 1)}
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No products in this category</p>
          </div>
        )}

        {/* Floating Cart Bar */}
        {cartItemCount > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-20 left-4 right-4 bg-primary text-primary-foreground rounded-xl p-4 shadow-lg z-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">{cartItemCount} items</p>
                <p className="font-bold">{formatPriceForCountry(cartTotal, userCountry)}</p>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => navigate(`/shop/${merchantId}/cart`)}
              >
                View Cart
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}