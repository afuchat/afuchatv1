import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Search, MapPin, Clock, Star, Users, TrendingUp, CalendarCheck, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddListingDialog } from '@/components/mini-programs/AddListingDialog';
import { MiniProgramHeader } from '@/components/mini-programs/MiniProgramHeader';

interface Service {
  id: string;
  name: string;
  category: string;
  rating: number;
  price: string;
  image: string;
  slots: number;
  duration: string;
  featured: boolean;
  description: string;
}

const getPlaceholderServices = (country: string | null): Service[] => {
  const servicesByCountry: Record<string, Service[]> = {
    'Uganda': [
      { id: 'p1', name: 'Sheba Salon', category: 'Beauty', rating: 4.9, price: '30', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 8, duration: '45 min', featured: true, description: 'Professional hair styling' },
      { id: 'p2', name: 'Oasis Spa Kampala', category: 'Wellness', rating: 4.8, price: '80', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 5, duration: '60 min', featured: true, description: 'Relaxing spa treatments' },
    ],
    'Kenya': [
      { id: 'p1', name: 'Nairobi Beauty Lounge', category: 'Beauty', rating: 4.8, price: '2500', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 10, duration: '60 min', featured: true, description: 'Premium beauty treatments' },
      { id: 'p2', name: 'Serena Spa', category: 'Wellness', rating: 4.9, price: '5000', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 8, duration: '90 min', featured: true, description: 'Luxury spa experience' },
    ],
  };

  const defaultServices: Service[] = [
    { id: 'p1', name: 'Hair Salon', category: 'Beauty', rating: 4.9, price: '50', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 8, duration: '45 min', featured: true, description: 'Professional hair styling' },
    { id: 'p2', name: 'Spa & Massage', category: 'Wellness', rating: 4.8, price: '80', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 5, duration: '60 min', featured: true, description: 'Relaxing spa treatments' },
  ];

  return country && servicesByCountry[country] ? servicesByCountry[country] : defaultServices;
};

const Bookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [userListings, setUserListings] = useState<Service[]>([]);

  const categories = ['all', 'Beauty', 'Wellness', 'Fitness', 'Healthcare', 'Auto', 'Pets'];

  const fetchUserListings = async () => {
    const { data } = await supabase
      .from('mini_program_listings')
      .select('*')
      .eq('listing_type', 'booking')
      .eq('status', 'approved');

    if (data) {
      const mapped = data.map(item => ({
        id: item.id,
        name: item.title,
        category: item.category || 'Services',
        rating: Number(item.rating) || 4.5,
        price: item.price || '0',
        image: item.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop',
        slots: 10,
        duration: '30 min',
        featured: item.featured,
        description: item.description || '',
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
    const placeholders = getPlaceholderServices(userCountry);
    setServices([...userListings, ...placeholders]);
  }, [userCountry, userListings]);

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredServices = filteredServices.filter(s => s.featured);
  const regularServices = filteredServices.filter(s => !s.featured);

  const handleBook = (serviceName: string, serviceId: string) => {
    navigate(`/bookings/${serviceId}`);
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
            listingType="booking" 
            categories={categories.filter(c => c !== 'all')}
            onSuccess={fetchUserListings}
            buttonText="Add Service"
          />
        }
      />

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="shrink-0 capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Featured Services */}
            {featuredServices.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Popular Services</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredServices.map((service) => (
                    <div 
                      key={service.id} 
                      className="cursor-pointer rounded-xl bg-card overflow-hidden group"
                      onClick={() => handleBook(service.name, service.id.toString())}
                    >
                      <div className="p-5">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                            <img 
                              src={service.image} 
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-bold text-lg">{service.name}</h3>
                                <p className="text-sm text-muted-foreground">{service.description}</p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="mb-2">{service.category}</Badge>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {service.duration}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {service.slots} slots
                              </div>
                              <Badge variant="outline" className="gap-1 ml-auto">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {service.rating}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-bold text-primary">{service.price} Nexa</span>
                              <Button size="sm" onClick={(e) => {
                                e.stopPropagation();
                                handleBook(service.name, service.id.toString());
                              }}>
                                Book Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All Services */}
            {regularServices.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">All Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regularServices.map((service) => (
                    <div 
                      key={service.id} 
                      className="cursor-pointer rounded-xl bg-card p-4"
                      onClick={() => handleBook(service.name, service.id.toString())}
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={service.image} 
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{service.name}</h3>
                              <p className="text-sm text-muted-foreground">{service.category}</p>
                            </div>
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {service.rating}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                            <span>{service.duration}</span>
                            <span>•</span>
                            <span>{service.slots} slots</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">{service.price} Nexa</span>
                            <Button size="sm" variant="ghost" onClick={(e) => {
                              e.stopPropagation();
                              handleBook(service.name, service.id.toString());
                            }}>
                              Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filteredServices.length === 0 && (
              <div className="text-center py-16">
                <CalendarCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-lg">No services found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or add your own service</p>
              </div>
            )}
          </div>

          {/* Right: Calendar & Info */}
          <div className="space-y-6">
            <div className="rounded-xl bg-card p-4">
              <h3 className="font-semibold mb-4">Select Date</h3>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
              />
            </div>

            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
              <h3 className="font-semibold mb-4">Time Slots for {date?.toLocaleDateString()}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Morning (9-12)</span>
                  <Badge variant="secondary">Limited</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Afternoon (12-5)</span>
                  <Badge className="bg-green-600">Available</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Evening (5-9)</span>
                  <Badge className="bg-green-600">Available</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Bookings;
