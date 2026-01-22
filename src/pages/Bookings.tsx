import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Search, MapPin, Clock, Star, Users, TrendingUp, CalendarCheck, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

const getServicesForCountry = (country: string | null): Service[] => {
  const servicesByCountry: Record<string, Service[]> = {
    'Uganda': [
      { id: '1', name: 'Sheba Salon', category: 'Beauty', rating: 4.9, price: '30', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 8, duration: '45 min', featured: true, description: 'Professional hair styling' },
      { id: '2', name: 'Oasis Spa Kampala', category: 'Wellness', rating: 4.8, price: '80', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 5, duration: '60 min', featured: true, description: 'Relaxing spa treatments' },
      { id: '3', name: 'Fitness Hub Kololo', category: 'Fitness', rating: 4.7, price: '25', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop', slots: 15, duration: '60 min', featured: false, description: 'Personal training sessions' },
      { id: '4', name: 'Dental Solutions', category: 'Healthcare', rating: 4.9, price: '100', image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=600&h=400&fit=crop', slots: 6, duration: '30 min', featured: true, description: 'Professional dental care' },
      { id: '5', name: 'Quick Wash Auto', category: 'Auto', rating: 4.6, price: '20', image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&h=400&fit=crop', slots: 20, duration: '30 min', featured: false, description: 'Quality car wash service' },
      { id: '6', name: 'Paws & Claws', category: 'Pets', rating: 4.8, price: '35', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=400&fit=crop', slots: 8, duration: '45 min', featured: false, description: 'Pet grooming services' },
    ],
    'Kenya': [
      { id: '1', name: 'Nairobi Beauty Lounge', category: 'Beauty', rating: 4.8, price: '2500', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 10, duration: '60 min', featured: true, description: 'Premium beauty treatments' },
      { id: '2', name: 'Serena Spa', category: 'Wellness', rating: 4.9, price: '5000', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 8, duration: '90 min', featured: true, description: 'Luxury spa experience' },
      { id: '3', name: 'Fitness First Kenya', category: 'Fitness', rating: 4.7, price: '1500', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop', slots: 20, duration: '60 min', featured: false, description: 'Personal training' },
      { id: '4', name: 'Avenue Dental', category: 'Healthcare', rating: 4.9, price: '3000', image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=600&h=400&fit=crop', slots: 6, duration: '45 min', featured: true, description: 'Modern dental care' },
    ],
    'Tanzania': [
      { id: '1', name: 'Dar Salon', category: 'Beauty', rating: 4.7, price: '25000', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 8, duration: '45 min', featured: true, description: 'Professional styling' },
      { id: '2', name: 'Zanzibar Spa', category: 'Wellness', rating: 4.9, price: '50000', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 5, duration: '90 min', featured: true, description: 'Beach-side spa treatments' },
      { id: '3', name: 'Active Life Gym', category: 'Fitness', rating: 4.6, price: '15000', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop', slots: 12, duration: '60 min', featured: false, description: 'Fitness training' },
    ],
    'Nigeria': [
      { id: '1', name: 'Lagos Beauty Hub', category: 'Beauty', rating: 4.8, price: '8000', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 12, duration: '60 min', featured: true, description: 'Premium beauty services' },
      { id: '2', name: 'Bliss Spa Lagos', category: 'Wellness', rating: 4.9, price: '15000', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 6, duration: '90 min', featured: true, description: 'Luxury spa treatments' },
      { id: '3', name: 'PowerHouse Gym', category: 'Fitness', rating: 4.7, price: '5000', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop', slots: 25, duration: '60 min', featured: false, description: 'World-class fitness' },
      { id: '4', name: 'Smile Dental Clinic', category: 'Healthcare', rating: 4.8, price: '10000', image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=600&h=400&fit=crop', slots: 8, duration: '30 min', featured: true, description: 'Quality dental care' },
    ],
  };

  const defaultServices: Service[] = [
    { id: '1', name: 'Hair Salon', category: 'Beauty', rating: 4.9, price: '50', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', slots: 8, duration: '45 min', featured: true, description: 'Professional hair styling' },
    { id: '2', name: 'Spa & Massage', category: 'Wellness', rating: 4.8, price: '80', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', slots: 5, duration: '60 min', featured: true, description: 'Relaxing spa treatments' },
    { id: '3', name: 'Fitness Training', category: 'Fitness', rating: 4.7, price: '45', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop', slots: 12, duration: '50 min', featured: false, description: 'Personal training' },
    { id: '4', name: 'Dental Clinic', category: 'Healthcare', rating: 4.9, price: '100', image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=600&h=400&fit=crop', slots: 6, duration: '30 min', featured: true, description: 'Dental care' },
    { id: '5', name: 'Car Wash', category: 'Auto', rating: 4.6, price: '30', image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&h=400&fit=crop', slots: 15, duration: '20 min', featured: false, description: 'Car cleaning' },
    { id: '6', name: 'Pet Grooming', category: 'Pets', rating: 4.8, price: '40', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=400&fit=crop', slots: 10, duration: '40 min', featured: false, description: 'Pet grooming' },
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

  const categories = ['all', 'Beauty', 'Wellness', 'Fitness', 'Healthcare', 'Auto', 'Pets'];

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
  }, [user]);

  useEffect(() => {
    setServices(getServicesForCountry(userCountry));
  }, [userCountry]);

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
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-background border-b">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <CalendarCheck className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl md:text-4xl font-bold">Bookings</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {userCountry ? `Book services in ${userCountry}` : 'Book appointments and reserve services'}
          </p>
        </div>
      </div>

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
                  variant={selectedCategory === cat ? 'default' : 'outline'}
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
                    <Card 
                      key={service.id} 
                      className="cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden group"
                      onClick={() => handleBook(service.name, service.id.toString())}
                    >
                      <CardContent className="p-5">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border">
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
                      </CardContent>
                    </Card>
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
                    <Card 
                      key={service.id} 
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => handleBook(service.name, service.id.toString())}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border">
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
                              <Button size="sm" variant="outline" onClick={(e) => {
                                e.stopPropagation();
                                handleBook(service.name, service.id.toString());
                              }}>
                                Book
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {filteredServices.length === 0 && (
              <div className="text-center py-16">
                <CalendarCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-lg">No services found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search</p>
              </div>
            )}
          </div>

          {/* Right: Calendar & Info */}
          <div className="space-y-6">
            <Card className="border-2">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Select Date</h3>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Bookings;