import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPriceForCountry } from '@/lib/currencyUtils';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

// Logo removed - using merchant logo from database

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  merchant_id: string;
  merchant: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export default function FeaturedProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [merchant, setMerchant] = useState<{ id: string; name: string; logo_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const { isPremium } = usePremiumStatus();

  useEffect(() => {
    fetchUserCountry();
    fetchFeaturedProducts();
  }, []);

  const fetchUserCountry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.country) {
          setUserCountry(profile.country);
        }
      }
    } catch (error) {
      console.error('Error fetching user country:', error);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      // Get first active merchant
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!merchantData) {
        setLoading(false);
        return;
      }

      setMerchant(merchantData);

      // Get featured products (first 6)
      const { data: productsData } = await supabase
        .from('merchant_products')
        .select('id, name, price, image_url, merchant_id')
        .eq('merchant_id', merchantData.id)
        .eq('is_available', true)
        .limit(6);

      if (productsData && productsData.length > 0) {
        setProducts(productsData.map(p => ({
          ...p,
          merchant: merchantData
        })));
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUgandan = userCountry === 'Uganda';

  // Show loading state
  if (loading) {
    return null;
  }

  // Only show featured products to Ugandan users
  if (!isUgandan) {
    // Non-Ugandan users see nothing (ads removed)
    return null;
  }

  // Ugandan users: show featured products (if available)
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-2 pb-0 mb-1">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {merchant?.logo_url ? (
            <img 
              src={merchant.logo_url} 
              alt={merchant?.name || 'Shop'}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-base">{merchant?.name || 'Shop'}</h2>
            <p className="text-xs text-muted-foreground">Featured Products</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-primary"
          onClick={() => navigate(`/shop/${merchant?.id}`)}
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Products Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-0 -mx-4 px-4 scrollbar-hide touch-pan-x snap-x snap-mandatory">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0 w-36 snap-start"
          >
            <Card 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <div className="aspect-square bg-muted relative">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-2">
                <h3 className="font-medium text-xs line-clamp-2 mb-1">{product.name}</h3>
                <p className="text-primary font-semibold text-sm">
                  {formatPriceForCountry(product.price, userCountry)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
