import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Car, Users, Clock, Navigation, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddListingDialog } from '@/components/mini-programs/AddListingDialog';

interface RideOption {
  id: string;
  name: string;
  description: string;
  capacity: string;
  price: string;
  image: string;
  time: string;
  features: string[];
}

const getPlaceholderRides = (country: string | null): RideOption[] => {
  const ridesByCountry: Record<string, RideOption[]> = {
    'Uganda': [
      { id: 'p1', name: 'Boda Boda', description: 'Quick motorcycle rides', capacity: '1 passenger', price: '10', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', time: '2 min', features: ['Fast', 'Beat traffic', 'Affordable'] },
      { id: 'p2', name: 'SafeBoda Economy', description: 'Affordable car rides', capacity: '4 passengers', price: '30', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop', time: '5 min', features: ['AC', 'Affordable', 'Safe'] },
    ],
    'Kenya': [
      { id: 'p1', name: 'Bolt Economy', description: 'Affordable everyday rides', capacity: '4 passengers', price: '200', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop', time: '4 min', features: ['AC', 'Affordable', 'Quick'] },
      { id: 'p2', name: 'Uber Comfort', description: 'Extra space and comfort', capacity: '4 passengers', price: '350', image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400&h=300&fit=crop', time: '6 min', features: ['Spacious', 'Premium AC', 'USB charging'] },
    ],
  };

  const defaultRides: RideOption[] = [
    { id: 'p1', name: 'Economy', description: 'Affordable everyday rides', capacity: '4 passengers', price: '50', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop', time: '3 min', features: ['Standard seating', 'AC', 'Music'] },
    { id: 'p2', name: 'Comfort', description: 'Extra space and comfort', capacity: '4 passengers', price: '75', image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400&h=300&fit=crop', time: '5 min', features: ['Spacious seats', 'Premium AC', 'USB charging'] },
  ];

  return country && ridesByCountry[country] ? ridesByCountry[country] : defaultRides;
};

const Rides = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRide, setSelectedRide] = useState('');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [userListings, setUserListings] = useState<RideOption[]>([]);

  const fetchUserListings = async () => {
    const { data } = await supabase
      .from('mini_program_listings')
      .select('*')
      .eq('listing_type', 'ride')
      .eq('status', 'approved');

    if (data) {
      const mapped = data.map(item => ({
        id: item.id,
        name: item.title,
        description: item.description || '',
        capacity: '4 passengers',
        price: item.price || '0',
        image: item.image_url || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop',
        time: '5 min',
        features: ['Available', 'Tracked'],
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
    const placeholders = getPlaceholderRides(userCountry);
    const allRides = [...userListings, ...placeholders];
    setRideOptions(allRides);
    if (allRides.length > 0 && !selectedRide) {
      setSelectedRide(allRides[0].id);
    }
  }, [userCountry, userListings]);

  const handleBookRide = () => {
    if (!pickup || !destination) {
      toast.error('Please enter pickup and destination');
      return;
    }
    const ride = rideOptions.find(r => r.id === selectedRide);
    toast.success(`Booking ${ride?.name} ride from ${pickup} to ${destination}...`);
  };

  const selectedRideData = rideOptions.find(r => r.id === selectedRide);

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
      <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl md:text-4xl font-bold">Book a Ride</h1>
            </div>
            <AddListingDialog 
              listingType="ride" 
              onSuccess={fetchUserListings}
              buttonText="Add Ride"
            />
          </div>
          <p className="text-muted-foreground text-lg">
            {userCountry ? `Rides available in ${userCountry}` : 'Fast, reliable rides at your fingertips'}
          </p>
        </div>
      </div>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Map & Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Map Placeholder */}
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-xl">
              <div className="text-center">
                <Navigation className="h-20 w-20 mx-auto mb-4 text-primary animate-pulse" />
                <p className="text-muted-foreground text-lg font-medium">Live Map View</p>
                <p className="text-sm text-muted-foreground mt-1">Track your ride in real-time</p>
              </div>
            </div>

            {/* Location Form */}
            <div className="rounded-xl bg-card p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  Pickup Location
                </label>
                <Input
                  placeholder="Enter pickup address..."
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="h-11"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  Destination
                </label>
                <Input
                  placeholder="Where are you going?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-11"
                />
              </div>

              {selectedRideData && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Selected Ride</span>
                    <Badge variant="secondary">{selectedRideData.name}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated fare</span>
                    <span className="text-2xl font-bold text-primary">{selectedRideData.price} Nexa</span>
                  </div>
                </div>
              )}

              <Button className="w-full h-12 text-base" size="lg" onClick={handleBookRide}>
                Confirm Ride
              </Button>
            </div>
          </div>

          {/* Right: Ride Options */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold">Choose Your Ride</h2>
            
            {rideOptions.map((ride) => (
              <div
                key={ride.id}
                className={`cursor-pointer transition-all duration-300 rounded-xl p-4 ${
                  selectedRide === ride.id
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setSelectedRide(ride.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={ride.image} 
                      alt={ride.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-lg">{ride.name}</h3>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">{ride.price} Nexa</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ride.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ride.capacity}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ride.time} away
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ride.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Info Card */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Payment Info
              </h3>
              <p className="text-sm text-muted-foreground">
                All rides are paid using your Nexa balance. Ensure you have sufficient Nexa before booking.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Rides;
