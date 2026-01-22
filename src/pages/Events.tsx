import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Search, Ticket, MapPin, Clock, Users, Star, TrendingUp, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  price: string;
  category: string;
  image: string;
  rating: number;
  attendees: string;
  featured: boolean;
  description: string;
}

// Country-specific event data
const getEventsForCountry = (country: string | null): Event[] => {
  const now = new Date();
  const formatDate = (daysFromNow: number, endDays?: number) => {
    const start = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    if (endDays) {
      const end = new Date(now.getTime() + endDays * 24 * 60 * 60 * 1000);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
    }
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const eventsByCountry: Record<string, Event[]> = {
    'Uganda': [
      { id: '1', title: 'Nyege Nyege Festival', date: formatDate(30, 33), location: 'Jinja, Source of the Nile', price: '200', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.9, attendees: '10K+', featured: true, description: 'East Africa\'s biggest electronic music festival' },
      { id: '2', title: 'Kampala City Festival', date: formatDate(14), location: 'Kampala City Center', price: 'Free', category: 'Culture', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop', rating: 4.7, attendees: '50K+', featured: true, description: 'Annual celebration of Kampala\'s rich culture' },
      { id: '3', title: 'Uganda International Marathon', date: formatDate(45), location: 'Masaka Road', price: '100', category: 'Sports', image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&h=400&fit=crop', rating: 4.8, attendees: '5K+', featured: false, description: 'Run through beautiful Ugandan landscapes' },
      { id: '4', title: 'Rolex Festival', date: formatDate(7), location: 'Wandegeya', price: '20', category: 'Food', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop', rating: 4.6, attendees: '2K+', featured: false, description: 'Celebrating Uganda\'s famous street food' },
      { id: '5', title: 'Pearl of Africa Tech Summit', date: formatDate(21, 22), location: 'Serena Hotel, Kampala', price: '150', category: 'Tech', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', rating: 4.8, attendees: '1K+', featured: true, description: 'Leading tech conference in East Africa' },
      { id: '6', title: 'Comedy Night with Salvador', date: formatDate(3), location: 'Theatre Labonita', price: '50', category: 'Comedy', image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&h=400&fit=crop', rating: 4.9, attendees: '500+', featured: false, description: 'A night of laughter with top Ugandan comedians' },
    ],
    'Kenya': [
      { id: '1', title: 'Safari Rally Kenya', date: formatDate(60, 63), location: 'Naivasha', price: '300', category: 'Sports', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop', rating: 4.9, attendees: '20K+', featured: true, description: 'World Rally Championship event' },
      { id: '2', title: 'Koroga Festival', date: formatDate(14), location: 'Carnivore Grounds, Nairobi', price: '100', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.8, attendees: '8K+', featured: true, description: 'Kenya\'s premier food and music festival' },
      { id: '3', title: 'Nairobi Tech Week', date: formatDate(28, 32), location: 'KICC, Nairobi', price: '200', category: 'Tech', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', rating: 4.7, attendees: '3K+', featured: true, description: 'Africa\'s leading tech conference' },
      { id: '4', title: 'Lamu Cultural Festival', date: formatDate(45), location: 'Lamu Island', price: '50', category: 'Culture', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop', rating: 4.9, attendees: '5K+', featured: false, description: 'Celebrating Swahili heritage' },
    ],
    'Tanzania': [
      { id: '1', title: 'Sauti za Busara', date: formatDate(30, 33), location: 'Stone Town, Zanzibar', price: '150', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.9, attendees: '15K+', featured: true, description: 'East Africa\'s biggest music festival' },
      { id: '2', title: 'Kilimanjaro Marathon', date: formatDate(45), location: 'Moshi', price: '100', category: 'Sports', image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&h=400&fit=crop', rating: 4.8, attendees: '10K+', featured: true, description: 'Run in the shadow of Africa\'s highest peak' },
      { id: '3', title: 'Dar es Salaam Food Festival', date: formatDate(14), location: 'Coco Beach', price: '30', category: 'Food', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop', rating: 4.6, attendees: '3K+', featured: false, description: 'Taste Tanzania\'s diverse cuisines' },
    ],
    'Nigeria': [
      { id: '1', title: 'Felabration', date: formatDate(90, 97), location: 'New Afrika Shrine, Lagos', price: '100', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.9, attendees: '30K+', featured: true, description: 'Annual tribute to Fela Kuti' },
      { id: '2', title: 'Lagos Fashion Week', date: formatDate(30, 33), location: 'Federal Palace Hotel', price: '250', category: 'Fashion', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&h=400&fit=crop', rating: 4.8, attendees: '5K+', featured: true, description: 'Africa\'s premier fashion event' },
      { id: '3', title: 'Tech Summit Nigeria', date: formatDate(21), location: 'Landmark Centre', price: '200', category: 'Tech', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', rating: 4.7, attendees: '2K+', featured: true, description: 'Nigeria\'s biggest tech gathering' },
    ],
  };

  // Default international events
  const defaultEvents: Event[] = [
    { id: '1', title: 'Global Music Festival', date: formatDate(30, 33), location: 'International Arena', price: '150', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.9, attendees: '10K+', featured: true, description: 'World-class musical performances' },
    { id: '2', title: 'International Tech Summit', date: formatDate(45, 47), location: 'Convention Center', price: '300', category: 'Tech', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', rating: 4.8, attendees: '5K+', featured: true, description: 'Latest innovations and networking' },
    { id: '3', title: 'Food & Culture Expo', date: formatDate(14, 16), location: 'City Center', price: '80', category: 'Food', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop', rating: 4.7, attendees: '8K+', featured: false, description: 'Taste cuisines from around the world' },
    { id: '4', title: 'Sports Championship', date: formatDate(60), location: 'Main Stadium', price: '200', category: 'Sports', image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=400&fit=crop', rating: 4.9, attendees: '20K+', featured: true, description: 'Championship finals action' },
    { id: '5', title: 'Art Gallery Opening', date: formatDate(7), location: 'Modern Art Museum', price: '50', category: 'Art', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop', rating: 4.6, attendees: '1K+', featured: false, description: 'Contemporary art exhibition' },
    { id: '6', title: 'Stand-up Comedy Night', date: formatDate(3), location: 'Comedy Club', price: '40', category: 'Comedy', image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&h=400&fit=crop', rating: 4.7, attendees: '500+', featured: false, description: 'Laughs with top comedians' },
  ];

  return country && eventsByCountry[country] ? eventsByCountry[country] : defaultEvents;
};

const categories = ['All', 'Music', 'Tech', 'Food', 'Art', 'Sports', 'Comedy', 'Culture', 'Fashion'];

const Events = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

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
    setEvents(getEventsForCountry(userCountry));
  }, [userCountry]);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredEvents = filteredEvents.filter(e => e.featured);
  const regularEvents = filteredEvents.filter(e => !e.featured);

  const handleBookTicket = (eventTitle: string, eventId: string) => {
    navigate(`/events/${eventId}`);
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
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Events & Tickets</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {userCountry ? `Discover events in ${userCountry}` : 'Discover and book amazing events near you'}
          </p>
        </div>
      </div>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search events, venues, or locations..."
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
              className="shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="upcoming" className="text-sm md:text-base">Upcoming</TabsTrigger>
            <TabsTrigger value="popular" className="text-sm md:text-base">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="nearby" className="text-sm md:text-base">Nearby</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6 mt-6">
            {/* Featured Events */}
            {featuredEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <h2 className="text-xl font-bold">Featured Events</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredEvents.map((event) => (
                    <Card 
                      key={event.id} 
                      className="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                      onClick={() => handleBookTicket(event.title, event.id.toString())}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge variant="secondary" className="mb-2">{event.category}</Badge>
                            <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-muted-foreground my-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium">{event.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {event.location}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {event.attendees} attending
                            </div>
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {event.rating}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <span className="text-xl font-bold text-primary">{event.price === 'Free' ? 'Free' : `${event.price} Nexa`}</span>
                          <Button size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleBookTicket(event.title, event.id.toString());
                          }} className="gap-2">
                            <Ticket className="h-4 w-4" />
                            Book Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* All Events */}
            {regularEvents.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">All Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularEvents.map((event) => (
                    <Card 
                      key={event.id} 
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => handleBookTicket(event.title, event.id.toString())}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge variant="secondary" className="mb-2">{event.category}</Badge>
                            <h3 className="font-semibold mb-1">{event.title}</h3>
                          </div>
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {event.rating}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {event.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            {event.attendees} attending
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">{event.price === 'Free' ? 'Free' : `${event.price} Nexa`}</span>
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            handleBookTicket(event.title, event.id.toString());
                          }}>
                            <Ticket className="h-4 w-4 mr-2" />
                            Book
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-lg">No events found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="popular" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.filter(e => e.featured).map((event) => (
                <Card 
                  key={event.id} 
                  className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleBookTicket(event.title, event.id)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    <Badge className="absolute top-2 left-2 bg-primary">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-1">{event.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{event.date}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{event.price === 'Free' ? 'Free' : `${event.price} Nexa`}</span>
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {event.rating}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="nearby" className="mt-6">
            {userCountry ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.slice(0, 4).map((event) => (
                  <Card 
                    key={event.id} 
                    className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handleBookTicket(event.title, event.id)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-1">{event.title}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Events Near You</h3>
                <p className="text-muted-foreground mb-4">Set your country in profile to see local events</p>
                <Button onClick={() => navigate('/edit-profile')}>Update Profile</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Events;