import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, Plus, Minus, Package, Store, Share2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { PageSkeleton } from '@/components/skeletons';
import { ButtonLoader } from '@/components/ui/CustomLoader';
import { formatPriceForCountry } from '@/lib/currencyUtils';
const shopshackLogo = '/shopshack-logo.png';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  image_url: string | null;
  merchant_id: string;
}

interface Merchant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

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
    if (productId) {
      fetchProductDetails();
    }
  }, [productId, user]);

  const fetchProductDetails = async () => {
    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('merchant_products')
        .select('id, name, description, price, stock, category, image_url, merchant_id')
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        console.error('Error fetching product:', productError);
        setLoading(false);
        return;
      }

      setProduct(productData);

      // Fetch merchant
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id, name, description, logo_url')
        .eq('id', productData.merchant_id)
        .single();

      if (merchantData) {
        setMerchant(merchantData);
      }

      // Fetch related products from same category
      const { data: relatedData } = await supabase
        .from('merchant_products')
        .select('id, name, description, price, stock, category, image_url, merchant_id')
        .eq('merchant_id', productData.merchant_id)
        .eq('is_available', true)
        .neq('id', productId)
        .limit(6);

      if (relatedData) {
        setRelatedProducts(relatedData);
      }

      // Fetch cart quantity if user is logged in
      if (user) {
        const { data: cartData } = await supabase
          .from('shopping_cart')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .single();

        if (cartData) {
          setCartQuantity(cartData.quantity);
        }
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    if (!product) return;

    setAddingToCart(true);
    try {
      const newQuantity = cartQuantity + quantity;
      
      await supabase
        .from('shopping_cart')
        .upsert({
          user_id: user.id,
          product_id: product.id,
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,product_id' });

      setCartQuantity(newQuantity);
      toast.success(`Added ${quantity} item(s) to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description || `Check out ${product.name}`,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageSkeleton variant="full" />
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Product not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-32">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(`/shop/${product.merchant_id}/cart`)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartQuantity > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartQuantity}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Product Image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="aspect-square bg-muted relative"
        >
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground" />
            </div>
          )}
          {product.stock < 5 && product.stock > 0 && (
            <Badge variant="destructive" className="absolute top-4 right-4">
              Only {product.stock} left
            </Badge>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Badge variant="destructive" className="text-lg py-2 px-4">
                Out of Stock
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Product Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 space-y-4"
        >
          {/* Merchant Info */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate(`/shop/${product.merchant_id}`)}
          >
            <img 
              src={shopshackLogo} 
              alt={merchant?.name || 'ShopShack'}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium">{merchant?.name || 'ShopShack'}</p>
              <p className="text-xs text-muted-foreground">View all products</p>
            </div>
          </div>

          {/* Product Name & Price */}
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-3xl font-bold text-primary mt-2">
              {formatPriceForCountry(product.price, userCountry)}
            </p>
          </div>

          {/* Category Badge */}
          {product.category && (
            <Badge variant="secondary" className="capitalize">
              {product.category}
            </Badge>
          )}

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <h2 className="font-semibold">Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Stock Info */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className={product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-500' : 'text-destructive'}>
              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
            </span>
          </div>

          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div className="flex items-center gap-4">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center gap-3">
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => setQuantity(Math.min(product.stock - cartQuantity, quantity + 1))}
                  disabled={quantity >= product.stock - cartQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="pt-6 space-y-3">
              <h2 className="font-semibold">More from this store</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {relatedProducts.map((relProduct) => (
                  <div 
                    key={relProduct.id}
                    className="flex-shrink-0 w-32 cursor-pointer"
                    onClick={() => navigate(`/product/${relProduct.id}`)}
                  >
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2">
                      {relProduct.image_url ? (
                        <img 
                          src={relProduct.image_url} 
                          alt={relProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{relProduct.name}</p>
                    <p className="text-sm text-primary font-semibold">
                      {formatPriceForCountry(relProduct.price, userCountry)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Fixed Bottom Add to Cart */}
        {product.stock > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-20 left-0 right-0 bg-background border-t border-border p-4 z-50"
          >
            <div className="flex items-center gap-4 max-w-lg mx-auto">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-primary">
                  {formatPriceForCountry(product.price * quantity, userCountry)}
                </p>
              </div>
              <Button 
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={addingToCart}
              >
                {addingToCart ? (
                  <ButtonLoader />
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
