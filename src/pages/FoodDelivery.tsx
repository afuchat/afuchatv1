import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, MapPin, Clock, Star, Utensils,
  Pizza, Coffee, IceCream, Sandwich, Fish, Salad, TrendingUp, Heart, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddListingDialog } from '@/components/mini-programs/AddListingDialog';
import { MiniProgramHeader } from '@/components/mini-programs/MiniProgramHeader';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  image: string;
  category: string;
  featured: boolean;
  minOrder: string;
  deliveryFee: string;
}

const categories = [
  { id: 'all', name: 'All', icon: Utensils },
  { id: 'local', name: 'Local', icon: Utensils },
  { id: 'pizza', name: 'Pizza', icon: Pizza },
  { id: 'coffee', name: 'Cafe', icon: Coffee },
  { id: 'dessert', name: 'Dessert', icon: IceCream },
  { id: 'fast', name: 'Fast Food', icon: Sandwich },
  { id: 'seafood', name: 'Seafood', icon: Fish },
  { id: 'healthy', name: 'Healthy', icon: Salad },
];

const getPlaceholderRestaurants = (country: string | null): Restaurant[] => {
  const restaurantsByCountry: Record<string, Restaurant[]> = {
    'Uganda': [
      { id: 'p1', name: 'Cafe Javas', cuisine: 'International', rating: 4.8, deliveryTime: '25-35', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop', category: 'local', featured: true, minOrder: '30', deliveryFee: '5' },
      { id: 'p2', name: 'Rolex Stand - Wandegeya', cuisine: 'Street Food', rating: 4.9, deliveryTime: '15-20', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', category: 'local', featured: true, minOrder: '10', deliveryFee: '0' },
    ],
    'Kenya': [
      { id: 'p1', name: 'Java House', cuisine: 'International', rating: 4.7, deliveryTime: '25-35', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop', category: 'local', featured: true, minOrder: '500', deliveryFee: '100' },
      { id: 'p2', name: 'Mama Oliech', cuisine: 'Kenyan', rating: 4.9, deliveryTime: '30-40', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop', category: 'local', featured: true, minOrder: '400', deliveryFee: '0' },
    ],
  };

  const defaultRestaurants: Restaurant[] = [
    { id: 'p1', name: 'Italian Kitchen', cuisine: 'Italian', rating: 4.8, deliveryTime: '25-35', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop', category: 'pizza', featured: true, minOrder: '50', deliveryFee: '10' },
    { id: 'p2', name: 'Coffee Corner', cuisine: 'Cafe', rating: 4.7, deliveryTime: '15-20', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop', category: 'coffee', featured: true, minOrder: '20', deliveryFee: '5' },
  ];

  return country && restaurantsByCountry[country] ? restaurantsByCountry[country] : defaultRestaurants;
};

const FoodDelivery = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userListings, setUserListings] = useState<Restaurant[]>([]);

  const fetchUserListings = async () => {
    const { data } = await supabase
      .from('mini_program_listings')
      .select('*')
      .eq('listing_type', 'food')
      .eq('status', 'approved');

    if (data) {
      const mapped = data.map(item => ({
        id: item.id,
        name: item.title,
        cuisine: item.category || 'Various',
        rating: Number(item.rating) || 4.5,
        deliveryTime: '25-35',
        image: item.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
        category: 'local',
        featured: item.featured,
        minOrder: item.price || '0',
        deliveryFee: '0',
      }));
      setUserListings(mapped);
    }
  };

  useEffect(() => {
    const fetchUserCountry = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', user.id)
          .single();
        setUserCountry(data?.country || null);
      }
      setLoading(false);
    };
    fetchUserCountry();
    fetchUserListings();
  }, [user]);

  useEffect(() => {
    const placeholders = getPlaceholderRestaurants(userCountry);
    setRestaurants([...userListings, ...placeholders]);
  }, [userCountry, userListings]);

  const filteredRestaurants = restaurants.filter(rest => {
    const matchesSearch = rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rest.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || rest.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOrder = (restaurantName: string, restaurantId: string) => {
    navigate(`/food-delivery/${restaurantId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MiniProgramHeader 
        rightContent={
          <AddListingDialog 
            listingType="food" 
            categories={['Local', 'Pizza', 'Cafe', 'Fast Food', 'Seafood', 'Healthy', 'Dessert']}
            onSuccess={fetchUserListings}
            buttonText="Add Restaurant"
          />
        }
      />

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search restaurants or cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="shrink-0 gap-2"
            >
              <cat.icon className="h-4 w-4" />
              {cat.name}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="delivery" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50">
            <TabsTrigger value="delivery" className="text-base">Delivery</TabsTrigger>
            <TabsTrigger value="pickup" className="text-base">Pickup</TabsTrigger>
          </TabsList>

          <TabsContent value="delivery" className="space-y-6 mt-6">
            {/* Featured */}
            {filteredRestaurants.some(r => r.featured) && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Featured Restaurants</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRestaurants.filter(r => r.featured).map((restaurant) => (
                    <div 
                      key={restaurant.id} 
                      className="overflow-hidden cursor-pointer group rounded-xl bg-card"
                      onClick={() => handleOrder(restaurant.name, restaurant.id)}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={restaurant.image} 
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        {restaurant.deliveryFee === '0' && (
                          <Badge className="absolute top-2 left-2 bg-green-600">Free Delivery</Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{restaurant.name}</h3>
                            <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                          </div>
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            {restaurant.rating}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {restaurant.deliveryTime} min
                          </div>
                          <span>•</span>
                          <span>Min {restaurant.minOrder} Nexa</span>
                        </div>
                        <Button className="w-full" onClick={() => handleOrder(restaurant.name, restaurant.id)}>
                          Order Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All Restaurants */}
            <section>
              <h2 className="text-xl font-bold mb-4">All Restaurants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRestaurants.filter(r => !r.featured).map((restaurant) => (
                  <div 
                    key={restaurant.id} 
                    className="overflow-hidden cursor-pointer rounded-xl bg-card"
                    onClick={() => handleOrder(restaurant.name, restaurant.id)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={restaurant.image} 
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                      {restaurant.deliveryFee === '0' && (
                        <Badge className="absolute top-2 left-2 bg-green-600 text-xs">Free Delivery</Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{restaurant.name}</h3>
                          <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {restaurant.rating}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <Clock className="h-3 w-3" />
                        {restaurant.deliveryTime} min • Min {restaurant.minOrder} Nexa
                      </div>
                      <Button variant="ghost" className="w-full" onClick={(e) => {
                        e.stopPropagation();
                        handleOrder(restaurant.name, restaurant.id);
                      }}>
                        View Menu
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {filteredRestaurants.length === 0 && (
              <div className="text-center py-16">
                <Utensils className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-lg">No restaurants found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or add your restaurant</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pickup" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {restaurants.slice(0, 4).map((restaurant) => (
                <div 
                  key={restaurant.id} 
                  className="overflow-hidden cursor-pointer rounded-xl bg-card"
                  onClick={() => handleOrder(restaurant.name, restaurant.id)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{restaurant.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{restaurant.cuisine}</p>
                    <Button variant="ghost" className="w-full">Select for Pickup</Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FoodDelivery;
