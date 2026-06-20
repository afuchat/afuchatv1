import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, MapPin, Users, Star, Clock, Heart, Share2, Ticket, Minus, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MiniProgramCheckout } from '@/components/mini-programs/MiniProgramCheckout';

// Placeholder event data
const getEventById = (id: string) => {
  const events = [
    {
      id: 'p1',
      title: 'Nyege Nyege Festival',
      date: 'Sep 5-8, 2026',
      location: 'Jinja, Source of the Nile',
      price: 200,
      category: 'Music',
      image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
      rating: 4.9,
      attendees: '10K+',
      description: 'East Africa\'s biggest electronic music festival featuring artists from around the world',
      venue: 'Itanda Falls, Jinja',
      address: 'Jinja, Uganda',
      schedule: [
        { day: 'Day 1', time: '18:00 - 03:00', artist: 'Opening Ceremony' },
        { day: 'Day 2', time: '14:00 - 03:00', artist: 'Main Stage Performances' },
        { day: 'Day 3', time: '14:00 - 03:00', artist: 'Festival Highlights' },
        { day: 'Day 4', time: '12:00 - 00:00', artist: 'Grand Finale' }
      ],
      amenities: ['Food & Drinks', 'Camping', 'Swimming', 'Art Installations']
    },
    {
      id: 'p2',
      title: 'Kampala City Festival',
      date: 'Oct 4, 2026',
      location: 'Kampala City Center',
      price: 0,
      category: 'Culture',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
      rating: 4.7,
      attendees: '50K+',
      description: 'Annual celebration of Kampala\'s rich culture and heritage',
      venue: 'Kampala City Center',
      address: 'Kampala, Uganda',
      schedule: [
        { day: 'Morning', time: '08:00 - 12:00', artist: 'Street Parade' },
        { day: 'Afternoon', time: '12:00 - 18:00', artist: 'Cultural Performances' },
        { day: 'Evening', time: '18:00 - 23:00', artist: 'Live Concert' }
      ],
      amenities: ['Free Entry', 'Food Vendors', 'Family Friendly', 'Live Music']
    }
  ];
  return events.find(e => e.id === id);
};

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      // First try to fetch from database
      if (id) {
        const { data } = await supabase
          .from('mini_program_listings')
          .select('*')
          .eq('id', id)
          .eq('listing_type', 'event')
          .single();

        if (data) {
          setEvent({
            id: data.id,
            title: data.title,
            date: new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            location: data.location || 'TBA',
            price: parseInt(data.price || '0'),
            category: data.category || 'Event',
            image: data.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
            rating: Number(data.rating) || 4.5,
            attendees: '100+',
            description: data.description || '',
            venue: data.location || 'TBA',
            address: data.location || 'TBA',
            schedule: [],
            amenities: ['Event Access']
          });
        } else {
          // Fallback to placeholder data
          setEvent(getEventById(id));
        }
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <Button onClick={() => navigate('/events')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const handleBookTicket = () => {
    if (!user) {
      toast.error('Please sign in to book tickets');
      return;
    }
    if (event.price === 0) {
      toast.success('Free event! You\'re registered.');
      return;
    }
    setCheckoutOpen(true);
  };

  const totalPrice = event.price * ticketCount;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Image */}
      <div className="relative h-64 md:h-96">
        <img 
          src={event.image} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => navigate('/events')}
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
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-primary">{event.category}</Badge>
        </div>
      </div>

      {/* Event Info */}
      <div className="container max-w-4xl mx-auto px-4 -mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                <p className="text-muted-foreground mb-4">{event.description}</p>
              </div>
              <Badge variant="secondary" className="gap-1 ml-4">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {event.rating}
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{event.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Attendees</p>
                  <p className="font-semibold">{event.attendees} attending</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-semibold text-primary text-lg">
                    {event.price === 0 ? 'Free' : `${event.price} ACoin`}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Venue</h3>
              <p className="text-muted-foreground">{event.venue}</p>
              <p className="text-sm text-muted-foreground">{event.address}</p>
            </div>

            {/* Ticket Selection */}
            {event.price > 0 && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Number of Tickets</p>
                    <p className="text-sm text-muted-foreground">Select quantity</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      disabled={ticketCount <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-bold w-8 text-center">{ticketCount}</span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                      disabled={ticketCount >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Button size="lg" className="w-full gap-2 mt-6" onClick={handleBookTicket}>
              <Ticket className="h-5 w-5" />
              {event.price === 0 ? 'Register for Free' : `Book Tickets - ${totalPrice} ACoin`}
            </Button>
          </CardContent>
        </Card>

        {/* Schedule */}
        {event.schedule && event.schedule.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Event Schedule</h2>
              <div className="space-y-4">
                {event.schedule.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{item.day}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </div>
                      <p className="text-sm mt-1">{item.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amenities */}
        {event.amenities && event.amenities.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {event.amenities.map((amenity: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checkout Dialog */}
      <MiniProgramCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        orderType="event"
        items={[{
          id: event.id,
          name: event.title,
          description: event.date,
          price: event.price,
          quantity: ticketCount,
          image: event.image,
        }]}
        itemDetails={{
          location: event.location,
          date: event.date,
          venue: event.venue,
        }}
        onSuccess={() => {
          toast.success('Tickets booked successfully!');
        }}
      />
    </div>
  );
};

export default EventDetail;
