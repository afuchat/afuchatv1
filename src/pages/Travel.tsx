import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plane, Hotel, Calendar, MapPin, Star, Users, ArrowRight, Wifi, Coffee, UtensilsCrossed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddListingDialog } from '@/components/mini-programs/AddListingDialog';
import { MiniProgramHeader } from '@/components/mini-programs/MiniProgramHeader';

interface Flight {
  id: string;
  from: string;
  to: string;
  fromFull: string;
  toFull: string;
  price: string;
  duration: string;
  airline: string;
  rating: number;
  stops: string;
  image: string;
}

interface HotelType {
  id: string;
  name: string;
  location: string;
  price: string;
  rating: number;
  image: string;
  amenities: { name: string; icon: any }[];
  rooms: string;
  featured: boolean;
}

const getPlaceholderFlights = (country: string | null): Flight[] => {
  const flightsByCountry: Record<string, Flight[]> = {
    'Uganda': [
      { id: 'p1', from: 'EBB', to: 'NBO', fromFull: 'Entebbe', toFull: 'Nairobi', price: '150', duration: '1h 15m', airline: 'Kenya Airways', rating: 4.7, stops: 'Direct', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop' },
      { id: 'p2', from: 'EBB', to: 'DAR', fromFull: 'Entebbe', toFull: 'Dar es Salaam', price: '200', duration: '1h 45m', airline: 'Ethiopian Airlines', rating: 4.8, stops: 'Direct', image: 'https://images.unsplash.com/photo-1464037866556-6812c9d1a72e?w=600&h=400&fit=crop' },
    ],
    'Kenya': [
      { id: 'p1', from: 'NBO', to: 'EBB', fromFull: 'Nairobi', toFull: 'Entebbe', price: '150', duration: '1h 15m', airline: 'Kenya Airways', rating: 4.7, stops: 'Direct', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop' },
      { id: 'p2', from: 'NBO', to: 'DAR', fromFull: 'Nairobi', toFull: 'Dar es Salaam', price: '120', duration: '1h', airline: 'Kenya Airways', rating: 4.8, stops: 'Direct', image: 'https://images.unsplash.com/photo-1464037866556-6812c9d1a72e?w=600&h=400&fit=crop' },
    ],
  };

  const defaultFlights: Flight[] = [
    { id: 'p1', from: 'NYC', to: 'LAX', fromFull: 'New York', toFull: 'Los Angeles', price: '500', duration: '6h', airline: 'SkyLine', rating: 4.8, stops: 'Direct', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop' },
    { id: 'p2', from: 'LON', to: 'PAR', fromFull: 'London', toFull: 'Paris', price: '200', duration: '1h 30m', airline: 'EuroJet', rating: 4.7, stops: 'Direct', image: 'https://images.unsplash.com/photo-1464037866556-6812c9d1a72e?w=600&h=400&fit=crop' },
  ];

  return country && flightsByCountry[country] ? flightsByCountry[country] : defaultFlights;
};

const getPlaceholderHotels = (country: string | null): HotelType[] => {
  const hotelsByCountry: Record<string, HotelType[]> = {
    'Uganda': [
      { id: 'p1', name: 'Serena Hotel Kampala', location: 'Kampala', price: '250', rating: 4.9, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', amenities: [{ name: 'Pool', icon: Coffee }, { name: 'Spa', icon: Coffee }], rooms: 'Deluxe Suite', featured: true },
      { id: 'p2', name: 'Speke Resort Munyonyo', location: 'Munyonyo', price: '200', rating: 4.8, image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop', amenities: [{ name: 'Beach', icon: Coffee }, { name: 'Pool', icon: Coffee }], rooms: 'Lake View', featured: true },
    ],
    'Kenya': [
      { id: 'p1', name: 'Sarova Stanley', location: 'Nairobi', price: '300', rating: 4.8, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', amenities: [{ name: 'Pool', icon: Coffee }, { name: 'Spa', icon: Coffee }], rooms: 'Executive Suite', featured: true },
      { id: 'p2', name: 'Diani Reef Resort', location: 'Diani Beach', price: '250', rating: 4.9, image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop', amenities: [{ name: 'Beach', icon: Coffee }, { name: 'Pool', icon: Coffee }], rooms: 'Ocean View', featured: true },
    ],
  };

  const defaultHotels: HotelType[] = [
    { id: 'p1', name: 'Grand Plaza Hotel', location: 'City Center', price: '300', rating: 4.8, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', amenities: [{ name: 'WiFi', icon: Wifi }, { name: 'Pool', icon: Coffee }], rooms: 'Deluxe Room', featured: true },
    { id: 'p2', name: 'Beach Resort', location: 'Coastal', price: '250', rating: 4.7, image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop', amenities: [{ name: 'Beach', icon: Coffee }, { name: 'Spa', icon: Coffee }], rooms: 'Ocean View', featured: true },
  ];

  return country && hotelsByCountry[country] ? hotelsByCountry[country] : defaultHotels;
};

const Travel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<HotelType[]>([]);
  const [userFlights, setUserFlights] = useState<Flight[]>([]);
  const [userHotels, setUserHotels] = useState<HotelType[]>([]);

  const fetchUserListings = async () => {
    const { data: flightData } = await supabase
      .from('mini_program_listings')
      .select('*')
      .eq('listing_type', 'travel_flight')
      .eq('status', 'approved');

    if (flightData) {
      const mappedFlights = flightData.map(item => ({
        id: item.id,
        from: item.title.split(' to ')[0]?.substring(0, 3).toUpperCase() || 'XXX',
        to: item.title.split(' to ')[1]?.substring(0, 3).toUpperCase() || 'YYY',
        fromFull: item.title.split(' to ')[0] || 'Origin',
        toFull: item.title.split(' to ')[1] || 'Destination',
        price: item.price || '0',
        duration: '2h',
        airline: item.location || 'Airline',
        rating: Number(item.rating) || 4.5,
        stops: 'Direct',
        image: item.image_url || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop',
      }));
      setUserFlights(mappedFlights);
    }

    const { data: hotelData } = await supabase
      .from('mini_program_listings')
      .select('*')
      .eq('listing_type', 'travel_hotel')
      .eq('status', 'approved');

    if (hotelData) {
      const mappedHotels = hotelData.map(item => ({
        id: item.id,
        name: item.title,
        location: item.location || 'Location',
        price: item.price || '0',
        rating: Number(item.rating) || 4.5,
        image: item.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
        amenities: [{ name: 'WiFi', icon: Wifi }, { name: 'Restaurant', icon: UtensilsCrossed }],
        rooms: 'Standard Room',
        featured: item.featured,
      }));
      setUserHotels(mappedHotels);
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
    const placeholderFlights = getPlaceholderFlights(userCountry);
    const placeholderHotels = getPlaceholderHotels(userCountry);
    setFlights([...userFlights, ...placeholderFlights]);
    setHotels([...userHotels, ...placeholderHotels]);
  }, [userCountry, userFlights, userHotels]);

  const handleBook = (type: string, name: string) => {
    toast.success(`Booking ${type}: ${name}...`);
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
          <div className="flex gap-2">
            <AddListingDialog 
              listingType="travel_flight" 
              onSuccess={fetchUserListings}
              buttonText="Add Flight"
            />
            <AddListingDialog 
              listingType="travel_hotel" 
              onSuccess={fetchUserListings}
              buttonText="Add Hotel"
            />
          </div>
        }
      />

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="flights" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/50">
            <TabsTrigger value="flights" className="gap-2 text-base">
              <Plane className="h-5 w-5" />
              Flights
            </TabsTrigger>
            <TabsTrigger value="hotels" className="gap-2 text-base">
              <Hotel className="h-5 w-5" />
              Hotels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flights" className="space-y-6">
            {/* Search Card */}
            <div className="p-6 rounded-xl bg-card">
              <h2 className="text-lg font-semibold mb-4">Search Flights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From</label>
                  <Input 
                    placeholder="Departure city..." 
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To</label>
                  <Input 
                    placeholder="Arrival city..." 
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <Button className="w-full h-11" size="lg">
                <Search className="h-5 w-5 mr-2" />
                Search Flights
              </Button>
            </div>

            {/* Flights List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Available Flights</h2>
              {flights.map((flight) => (
                <div key={flight.id} className="overflow-hidden cursor-pointer rounded-xl bg-card"
                  onClick={() => navigate(`/travel/flight/${flight.id}`)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
                    {/* Flight Image */}
                    <div className="md:col-span-2 aspect-video md:aspect-auto relative overflow-hidden">
                      <img 
                        src={flight.image} 
                        alt={`Flight from ${flight.fromFull} to ${flight.toFull}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-background/90 backdrop-blur-sm text-foreground">
                          {flight.airline}
                        </Badge>
                      </div>
                    </div>

                    {/* Flight Details */}
                    <div className="md:col-span-3 p-4 md:p-6 flex flex-col justify-center">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{flight.from}</div>
                              <div className="text-xs text-muted-foreground">{flight.fromFull}</div>
                            </div>
                            <div className="flex-1 flex items-center justify-center min-w-0">
                              <div className="flex-1 h-px bg-muted" />
                              <Plane className="h-5 w-5 text-primary mx-2 flex-shrink-0" />
                              <div className="flex-1 h-px bg-muted" />
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{flight.to}</div>
                              <div className="text-xs text-muted-foreground">{flight.toFull}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span>{flight.duration}</span>
                            <span>•</span>
                            <Badge variant="outline">{flight.stops}</Badge>
                            <Badge variant="secondary" className="gap-1 ml-auto">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {flight.rating}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
                          <div className="text-2xl md:text-3xl font-bold text-primary">{flight.price} Nexa</div>
                          <Button className="gap-2" onClick={(e) => {
                            e.stopPropagation();
                            handleBook('Flight', `${flight.fromFull} to ${flight.toFull}`);
                          }}>
                            Book Now
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hotels" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search hotels or destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Hotels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map((hotel) => (
                <div 
                  key={hotel.id} 
                  className="overflow-hidden cursor-pointer group rounded-xl bg-card"
                  onClick={() => navigate(`/travel/hotel/${hotel.id}`)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={hotel.image} 
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {hotel.featured && (
                      <Badge className="absolute top-2 left-2 bg-primary">Featured</Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{hotel.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {hotel.location}
                        </div>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {hotel.rating}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 my-3">
                      {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                        <Badge key={idx} variant="outline" className="gap-1 text-xs">
                          {amenity.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3">
                      <div>
                        <span className="text-2xl font-bold text-primary">{hotel.price}</span>
                        <span className="text-sm text-muted-foreground"> Nexa/night</span>
                      </div>
                      <Button size="sm" onClick={(e) => {
                        e.stopPropagation();
                        handleBook('Hotel', hotel.name);
                      }}>
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hotels.length === 0 && (
              <div className="text-center py-16">
                <Hotel className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-lg">No hotels found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or add a hotel</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Travel;
