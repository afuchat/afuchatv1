import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Star, Clock, MapPin, Phone, Heart, Share2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MiniProgramCheckout } from '@/components/mini-programs/MiniProgramCheckout';

// Placeholder restaurant data
const getRestaurantById = (id: string) => {
  const restaurants = [
    { 
      id: 'p1', 
      name: 'Cafe Javas', 
      cuisine: 'International', 
      rating: 4.8, 
      deliveryTime: '25-35', 
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop', 
      minOrder: 30,
      deliveryFee: 5,
      address: 'Garden City Mall, Kampala',
      phone: '+256 700 123 456',
      description: 'Ugandan chain serving international cuisine with local favorites',
      menu: [
        { id: 'm1', name: 'Rolex (Chapati Egg Roll)', price: 15, description: 'Classic Ugandan street food', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop' },
        { id: 'm2', name: 'Chicken & Chips', price: 35, description: 'Crispy fried chicken with fries', image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&h=200&fit=crop' },
        { id: 'm3', name: 'Tilapia Fish', price: 45, description: 'Fresh tilapia with ugali', image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=300&h=200&fit=crop' },
        { id: 'm4', name: 'Luwombo', price: 40, description: 'Traditional steamed meat in banana leaves', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&h=200&fit=crop' },
      ]
    },
    { 
      id: 'p2', 
      name: 'Java House', 
      cuisine: 'Cafe & Grill', 
      rating: 4.7, 
      deliveryTime: '20-30', 
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop', 
      minOrder: 25,
      deliveryFee: 0,
      address: 'Westlands, Nairobi',
      phone: '+254 700 123 456',
      description: 'Premium coffee and all-day dining',
      menu: [
        { id: 'm1', name: 'Cappuccino', price: 8, description: 'Espresso with steamed milk', image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&h=200&fit=crop' },
        { id: 'm2', name: 'Full English Breakfast', price: 25, description: 'Eggs, bacon, sausage, beans', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=200&fit=crop' },
        { id: 'm3', name: 'Club Sandwich', price: 18, description: 'Triple-decker classic', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&h=200&fit=crop' },
        { id: 'm4', name: 'Nyama Choma', price: 35, description: 'Grilled meat Kenyan style', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop' },
      ]
    }
  ];
  return restaurants.find(r => r.id === id);
};

const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (id) {
        const { data } = await supabase
          .from('mini_program_listings')
          .select('*')
          .eq('id', id)
          .eq('listing_type', 'food')
          .single();

        if (data) {
          setRestaurant({
            id: data.id,
            name: data.title,
            cuisine: data.category || 'Various',
            rating: Number(data.rating) || 4.5,
            deliveryTime: '25-35',
            image: data.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
            minOrder: parseInt(data.price || '0'),
            deliveryFee: 0,
            address: data.location || 'TBA',
            phone: 'N/A',
            description: data.description || '',
            menu: []
          });
        } else {
          setRestaurant(getRestaurantById(id));
        }
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Restaurant Not Found</h2>
          <Button onClick={() => navigate('/food-delivery')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Restaurants
          </Button>
        </div>
      </div>
    );
  }

  const addToCart = (itemId: string) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    toast.success('Added to cart');
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = restaurant.menu.reduce((total: number, item: any) => {
    return total + (cart[item.id] || 0) * item.price;
  }, 0);

  const filteredMenu = restaurant.menu.filter((item: any) => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please sign in to order');
      return;
    }
    if (totalPrice < restaurant.minOrder) {
      toast.error(`Minimum order is ${restaurant.minOrder} ACoin`);
      return;
    }
    setCheckoutOpen(true);
  };

  const getCartItems = () => {
    return restaurant.menu
      .filter((item: any) => cart[item.id])
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        quantity: cart[item.id],
        image: item.image,
      }));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Image */}
      <div className="relative h-64 md:h-96">
        <img 
          src={restaurant.image} 
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => navigate('/food-delivery')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <Heart className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="container max-w-4xl mx-auto px-4 -mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
                <p className="text-muted-foreground mb-2">{restaurant.cuisine}</p>
                <p className="text-sm text-muted-foreground">{restaurant.description}</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {restaurant.rating}
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{restaurant.deliveryTime} min</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{restaurant.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{restaurant.phone}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Minimum Order: {restaurant.minOrder} ACoin</span>
              {restaurant.deliveryFee === 0 ? (
                <Badge className="bg-green-600">Free Delivery</Badge>
              ) : (
                <span className="text-muted-foreground">Delivery: {restaurant.deliveryFee} ACoin</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Menu Search */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Menu */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Menu</h2>
          {filteredMenu.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No menu items available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMenu.map((item: any) => (
                <Card key={item.id} className="overflow-hidden hover:bg-muted/50 transition-all">
                  <CardContent className="p-0">
                    <div className="flex gap-4">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-32 h-32 object-cover"
                      />
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <p className="text-lg font-bold text-primary">{item.price} ACoin</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {cart[item.id] ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFromCart(item.id)}
                              >
                                -
                              </Button>
                              <span className="font-semibold w-8 text-center">{cart[item.id]}</span>
                              <Button
                                size="sm"
                                onClick={() => addToCart(item.id)}
                              >
                                +
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => addToCart(item.id)}>
                              Add to Cart
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Summary */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
          <div className="container max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold">{totalItems} items</p>
              <p className="text-lg font-bold text-primary">{totalPrice + restaurant.deliveryFee} ACoin</p>
            </div>
            <Button size="lg" onClick={handleCheckout}>
              Checkout
            </Button>
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      <MiniProgramCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        orderType="food"
        items={getCartItems()}
        itemDetails={{
          restaurant: restaurant.name,
          address: restaurant.address,
          deliveryFee: restaurant.deliveryFee,
        }}
        onSuccess={() => {
          setCart({});
          toast.success('Order placed successfully!');
        }}
      />
    </div>
  );
};

export default RestaurantDetail;
