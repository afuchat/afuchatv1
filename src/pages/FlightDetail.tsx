import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plane, Clock, Star, Wifi, Coffee, Luggage, Heart, Share2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { MiniProgramCheckout } from '@/components/mini-programs/MiniProgramCheckout';

const flights = [
  { id: 'p1', from: 'EBB', to: 'NBO', fromFull: 'Entebbe', toFull: 'Nairobi', price: 150, duration: '1h 15m', airline: 'Kenya Airways', rating: 4.7, stops: 'Direct', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop', departureTime: '08:30 AM', arrivalTime: '09:45 AM', flightNumber: 'KQ 421', aircraft: 'Boeing 737', amenities: ['WiFi', 'Meals', 'Entertainment'], baggage: '23kg checked + 7kg cabin', class: 'Economy', seats: '42 seats' },
  { id: 'p2', from: 'EBB', to: 'DAR', fromFull: 'Entebbe', toFull: 'Dar es Salaam', price: 200, duration: '1h 45m', airline: 'Ethiopian Airlines', rating: 4.8, stops: 'Direct', image: 'https://images.unsplash.com/photo-1464037866556-6812c9d1a72e?w=600&h=400&fit=crop', departureTime: '10:00 AM', arrivalTime: '11:45 AM', flightNumber: 'ET 815', aircraft: 'Airbus A350', amenities: ['WiFi', 'Meals', 'Priority'], baggage: '23kg checked + 7kg cabin', class: 'Economy', seats: '28 seats' },
];

const FlightDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [passengers, setPassengers] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const flight = flights.find(f => f.id === id);

  if (!flight) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Flight Not Found</h2>
          <Button onClick={() => navigate('/travel')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Flights</Button>
        </div>
      </div>
    );
  }

  const handleBookFlight = () => {
    if (!user) { toast.error('Please sign in to book'); return; }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-64 md:h-80">
        <img src={flight.image} alt="Flight" className="w-full h-full object-cover" />
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 bg-background/80" onClick={() => navigate('/travel')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="ghost" size="icon" className="bg-background/80"><Heart className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="bg-background/80"><Share2 className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 -mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"><Plane className="h-6 w-6 text-primary" /></div>
                <div><p className="font-bold text-lg">{flight.airline}</p><p className="text-sm text-muted-foreground">{flight.flightNumber}</p></div>
              </div>
              <Badge variant="secondary" className="gap-1"><Star className="h-4 w-4 fill-primary text-primary" />{flight.rating}</Badge>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between mb-6">
              <div className="text-center"><p className="text-3xl font-bold">{flight.from}</p><p className="text-sm text-muted-foreground">{flight.fromFull}</p><p className="text-lg font-semibold mt-2">{flight.departureTime}</p></div>
              <div className="flex-1 flex flex-col items-center px-4">
                <div className="flex items-center w-full"><div className="border-t-2 border-dashed flex-1" /><Plane className="h-6 w-6 text-primary mx-2" /><div className="border-t-2 border-dashed flex-1" /></div>
                <p className="text-sm text-muted-foreground mt-2">{flight.duration}</p><Badge variant="outline">{flight.stops}</Badge>
              </div>
              <div className="text-center"><p className="text-3xl font-bold">{flight.to}</p><p className="text-sm text-muted-foreground">{flight.toFull}</p><p className="text-lg font-semibold mt-2">{flight.arrivalTime}</p></div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between mb-4">
              <div><p className="font-semibold">Passengers</p></div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setPassengers(Math.max(1, passengers - 1))} disabled={passengers <= 1}><Minus className="h-4 w-4" /></Button>
                <span className="text-xl font-bold w-8 text-center">{passengers}</span>
                <Button variant="outline" size="icon" onClick={() => setPassengers(Math.min(9, passengers + 1))} disabled={passengers >= 9}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Price</p><p className="text-3xl font-bold text-primary">{flight.price * passengers} ACoin</p></div>
              <Button size="lg" onClick={handleBookFlight}>Book Now</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-6"><CardContent className="p-6"><h2 className="text-xl font-bold mb-4">Amenities</h2><div className="flex flex-wrap gap-2">{flight.amenities.map((a, i) => <Badge key={i} variant="secondary">{a}</Badge>)}</div></CardContent></Card>
      </div>

      <MiniProgramCheckout open={checkoutOpen} onOpenChange={setCheckoutOpen} orderType="flight" items={[{ id: flight.id, name: `${flight.fromFull} → ${flight.toFull}`, description: `${flight.airline} ${flight.flightNumber}`, price: flight.price, quantity: passengers, image: flight.image }]} itemDetails={{ airline: flight.airline, flightNumber: flight.flightNumber, departure: flight.departureTime, arrival: flight.arrivalTime }} onSuccess={() => toast.success('Flight booked!')} />
    </div>
  );
};

export default FlightDetail;
