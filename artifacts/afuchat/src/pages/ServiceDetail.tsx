import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Clock, Star, MapPin, Phone, Heart, Share2, CalendarCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MiniProgramCheckout } from '@/components/mini-programs/MiniProgramCheckout';

// Placeholder services data
const getServiceById = (id: string) => {
  const services = [
    { 
      id: 'p1', 
      name: 'Sheba Salon', 
      category: 'Beauty', 
      rating: 4.9, 
      price: 30, 
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop', 
      duration: '45 min',
      description: 'Professional hair styling and treatment with experienced stylists.',
      address: 'Acacia Mall, Kampala',
      phone: '+256 700 123 456',
      services: [
        { name: 'Haircut', price: 30, duration: '45 min' },
        { name: 'Hair Coloring', price: 80, duration: '2 hours' },
        { name: 'Hair Treatment', price: 50, duration: '1 hour' },
        { name: 'Styling', price: 25, duration: '30 min' }
      ],
      availableSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
    },
    { 
      id: 'p2', 
      name: 'Oasis Spa Kampala', 
      category: 'Wellness', 
      rating: 4.8, 
      price: 80, 
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', 
      duration: '60 min',
      description: 'Relaxing spa treatments and massages in a tranquil environment.',
      address: 'Kololo, Kampala',
      phone: '+256 700 789 012',
      services: [
        { name: 'Swedish Massage', price: 80, duration: '60 min' },
        { name: 'Deep Tissue', price: 100, duration: '60 min' },
        { name: 'Facial Treatment', price: 60, duration: '45 min' },
        { name: 'Full Body Spa', price: 150, duration: '90 min' }
      ],
      availableSlots: ['10:00', '12:00', '14:00', '16:00', '18:00']
    },
  ];
  return services.find(s => s.id === id);
};

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      if (id) {
        const { data } = await supabase
          .from('mini_program_listings')
          .select('*')
          .eq('id', id)
          .eq('listing_type', 'booking')
          .single();

        if (data) {
          setService({
            id: data.id,
            name: data.title,
            category: data.category || 'Services',
            rating: Number(data.rating) || 4.5,
            price: parseInt(data.price || '50'),
            image: data.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop',
            duration: '45 min',
            description: data.description || '',
            address: data.location || 'TBA',
            phone: 'N/A',
            services: [
              { name: data.title, price: parseInt(data.price || '50'), duration: '45 min' }
            ],
            availableSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
          });
        } else {
          setService(getServiceById(id));
        }
      }
      setLoading(false);
    };

    fetchService();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Service Not Found</h2>
          <Button onClick={() => navigate('/bookings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  const handleBooking = () => {
    if (!user) {
      toast.error('Please sign in to book');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }
    if (!selectedService) {
      toast.error('Please select a service');
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Image */}
      <div className="relative h-64 md:h-96">
        <img 
          src={service.image} 
          alt={service.name}
          className="w-full h-full object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => navigate('/bookings')}
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
          <Badge className="bg-primary">{service.category}</Badge>
        </div>
      </div>

      {/* Service Info */}
      <div className="container max-w-4xl mx-auto px-4 -mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{service.name}</h1>
                <p className="text-muted-foreground mb-2">{service.description}</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {service.rating}
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{service.duration} average</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{service.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{service.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Offered */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Select Service</h2>
            <div className="space-y-3">
              {service.services.map((item: any, index: number) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedService?.name === item.name 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedService(item)}
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {item.duration}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-primary">{item.price} ACoin</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Calendar */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                disabled={(date) => date < new Date()}
              />
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Available Time Slots</h3>
              <div className="grid grid-cols-2 gap-2">
                {service.availableSlots.map((slot: string) => (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>

              <Separator className="my-4" />

              {selectedService && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selected Service</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{selectedService.duration}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{selectedService.price} ACoin</span>
                  </div>
                </div>
              )}

              <Button 
                size="lg" 
                className="w-full gap-2" 
                onClick={handleBooking}
                disabled={!selectedSlot || !selectedService}
              >
                <CalendarCheck className="h-5 w-5" />
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <MiniProgramCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        orderType="booking"
        items={selectedService ? [{
          id: service.id,
          name: `${service.name} - ${selectedService.name}`,
          description: `${selectedDate?.toLocaleDateString()} at ${selectedSlot}`,
          price: selectedService.price,
          quantity: 1,
          image: service.image,
        }] : []}
        itemDetails={{
          service: selectedService?.name,
          location: service.address,
          duration: selectedService?.duration,
        }}
        scheduledDate={selectedDate}
        notes={`Appointment at ${selectedSlot}`}
        onSuccess={() => {
          setSelectedSlot('');
          setSelectedService(null);
          toast.success('Appointment booked successfully!');
        }}
      />
    </div>
  );
};

export default ServiceDetail;
