import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Search, Ticket, MapPin, Clock, Users, Star, TrendingUp, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddListingDialog } from '@/components/mini-programs/AddListingDialog';
import { MiniProgramHeader } from '@/components/mini-programs/MiniProgramHeader';

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

// Country-specific placeholder event data
const getPlaceholderEvents = (country: string | null): Event[] => {
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
      { id: 'p1', title: 'Nyege Nyege Festival', date: formatDate(30, 33), location: 'Jinja, Source of the Nile', price: '200', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.9, attendees: '10K+', featured: true, description: 'East Africa\'s biggest electronic music festival' },
      { id: 'p2', title: 'Kampala City Festival', date: formatDate(14), location: 'Kampala City Center', price: 'Free', category: 'Culture', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop', rating: 4.7, attendees: '50K+', featured: true, description: 'Annual celebration of Kampala\'s rich culture' },
    ],
    'Kenya': [
      { id: 'p1', title: 'Safari Rally Kenya', date: formatDate(60, 63), location: 'Naivasha', price: '300', category: 'Sports', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop', rating: 4.9, attendees: '20K+', featured: true, description: 'World Rally Championship event' },
      { id: 'p2', title: 'Koroga Festival', date: formatDate(14), location: 'Carnivore Grounds, Nairobi', price: '100', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.8, attendees: '8K+', featured: true, description: 'Kenya\'s premier food and music festival' },
    ],
  };

  const defaultEvents: Event[] = [
    { id: 'p1', title: 'Global Music Festival', date: formatDate(30, 33), location: 'International Arena', price: '150', category: 'Music', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', rating: 4.9, attendees: '10K+', featured: true, description: 'World-class musical performances' },
    { id: 'p2', title: 'International Tech Summit', date: formatDate(45, 47), location: 'Convention Center', price: '300', category: 'Tech', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', rating: 4.8, attendees: '5K+', featured: true, description: 'Latest innovations and networking' },
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
  const [userListings, setUserListings] = useState<Event[]>([]);

  const fetchUserListings = async () => {
    const { data } = await supabase
      .from('mini_program_listings')
      .select('*')
      .eq('listing_type', 'event')
      .eq('status', 'approved');

    if (data) {
      const mapped = data.map(item => ({
        id: item.id,
        title: item.title,
        date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        location: item.location || 'TBA',
        price: item.price || '0',
        category: item.category || 'Events',
        image: item.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
        rating: Number(item.rating) || 4.5,
        attendees: '100+',
        featured: item.featured ?? false,
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
    const placeholders = getPlaceholderEvents(userCountry);
    setEvents([...userListings, ...placeholders]);
  }, [userCountry, userListings]);

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
      <MiniProgramHeader 
        rightContent={
          <AddListingDialog 
            listingType="event" 
            categories={categories.filter(c => c !== 'All')}
            onSuccess={fetchUserListings}
            buttonText="Add Event"
          />
        }
      />

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
              variant={selectedCategory === cat ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50">
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
                    <div 
                      key={event.id} 
                      className="overflow-hidden rounded-xl bg-card cursor-pointer group"
                      onClick={() => handleBookTicket(event.title, event.id.toString())}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title}
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
                      </div>
                      <div className="p-4">
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

                        <div className="flex items-center justify-between pt-3">
                          <span className="text-xl font-bold text-primary">{event.price === 'Free' ? 'Free' : `${event.price} Nexa`}</span>
                          <Button size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleBookTicket(event.title, event.id.toString());
                          }} className="gap-2">
                            <Ticket className="h-4 w-4" />
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
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
                    <div 
                      key={event.id} 
                      className="overflow-hidden rounded-xl bg-card cursor-pointer group"
                      onClick={() => handleBookTicket(event.title, event.id.toString())}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
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
                        <div className="space-y-2 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {event.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">{event.price === 'Free' ? 'Free' : `${event.price} Nexa`}</span>
                          <Button size="sm" variant="ghost" onClick={(e) => {
                            e.stopPropagation();
                            handleBookTicket(event.title, event.id.toString());
                          }}>
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filteredEvents.length === 0 && (
              <div className="text-center py-16">
                <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-lg">No events found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or add your own event</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="popular" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.sort((a, b) => b.rating - a.rating).slice(0, 6).map((event) => (
                <div 
                  key={event.id} 
                  className="overflow-hidden rounded-xl bg-card cursor-pointer"
                  onClick={() => handleBookTicket(event.title, event.id.toString())}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">{event.rating} ★</Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1">{event.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{event.location}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary">{event.price === 'Free' ? 'Free' : `${event.price} Nexa`}</span>
                      <Button size="sm">Book</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="nearby" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enable location services to see nearby events</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Events;
