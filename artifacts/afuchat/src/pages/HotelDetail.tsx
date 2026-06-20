import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Hotel, MapPin, Star, Wifi, Coffee, UtensilsCrossed, Heart, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { MiniProgramCheckout } from '@/components/mini-programs/MiniProgramCheckout';

const hotels = [
  { id: 'p1', name: 'Serena Hotel Kampala', location: 'Kampala', price: 250, rating: 4.9, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', address: 'Kintu Road, Kampala', description: 'Luxury hotel with stunning views and world-class amenities', amenities: [{ name: 'Pool', icon: Coffee }, { name: 'Spa', icon: Coffee }, { name: 'WiFi', icon: Wifi }, { name: 'Restaurant', icon: UtensilsCrossed }], roomTypes: [{ name: 'Standard', price: 200, beds: '1 Queen', guests: '2' }, { name: 'Deluxe', price: 250, beds: '1 King', guests: '2' }, { name: 'Suite', price: 400, beds: '1 King + Sofa', guests: '4' }], images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&h=400&fit=crop'] },
];

const HotelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState<Date | undefined>(new Date());
  const [checkOut, setCheckOut] = useState<Date | undefined>(new Date(Date.now() + 86400000));
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const hotel = hotels.find(h => h.id === id) || hotels[0];

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
  };

  const selectedRoomData = hotel.roomTypes.find(r => r.name === selectedRoom);
  const totalPrice = selectedRoomData ? selectedRoomData.price * calculateNights() : 0;

  const handleBooking = () => {
    if (!user) { toast.error('Please sign in to book'); return; }
    if (!selectedRoom) { toast.error('Please select a room'); return; }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-64 md:h-80">
        <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 bg-background/80" onClick={() => navigate('/travel')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="ghost" size="icon" className="bg-background/80"><Heart className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="bg-background/80"><Share2 className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div><h1 className="text-3xl font-bold mb-2">{hotel.name}</h1><div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{hotel.address}</div></div>
                <Badge variant="secondary" className="gap-1"><Star className="h-4 w-4 fill-primary text-primary" />{hotel.rating}</Badge>
              </div>
              <Separator className="my-4" />
              <p className="text-muted-foreground">{hotel.description}</p>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Select Room</h2>
              <div className="space-y-3">
                {hotel.roomTypes.map((room) => (
                  <div key={room.name} className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedRoom === room.name ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setSelectedRoom(room.name)}>
                    <div className="flex justify-between"><div><p className="font-bold">{room.name}</p><p className="text-sm text-muted-foreground">{room.beds} • Up to {room.guests} guests</p></div><div className="text-right"><p className="text-xl font-bold text-primary">{room.price} ACoin</p><p className="text-xs text-muted-foreground">per night</p></div></div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </div>

          <div className="space-y-6">
            <Card><CardContent className="p-6">
              <h3 className="font-bold mb-4">Book Your Stay</h3>
              <div className="space-y-4">
                <div><p className="text-sm font-medium mb-2">Check-in</p><Calendar mode="single" selected={checkIn} onSelect={setCheckIn} className="rounded-md border" disabled={(date) => date < new Date()} /></div>
                <div><p className="text-sm font-medium mb-2">Check-out</p><Calendar mode="single" selected={checkOut} onSelect={setCheckOut} className="rounded-md border" disabled={(date) => date <= (checkIn || new Date())} /></div>
                {selectedRoom && (<><Separator /><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{calculateNights()} nights</span><span>{selectedRoomData?.price} ACoin/night</span></div><Separator /><div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{totalPrice} ACoin</span></div></div></>)}
                <Button size="lg" className="w-full" onClick={handleBooking} disabled={!selectedRoom}>Book Now</Button>
              </div>
            </CardContent></Card>
          </div>
        </div>
      </div>

      <MiniProgramCheckout open={checkoutOpen} onOpenChange={setCheckoutOpen} orderType="hotel" items={selectedRoomData ? [{ id: hotel.id, name: `${hotel.name} - ${selectedRoomData.name}`, description: `${calculateNights()} nights`, price: totalPrice, quantity: 1, image: hotel.image }] : []} itemDetails={{ hotel: hotel.name, room: selectedRoomData?.name, checkIn: checkIn?.toLocaleDateString(), checkOut: checkOut?.toLocaleDateString() }} scheduledDate={checkIn} onSuccess={() => { setSelectedRoom(''); toast.success('Hotel booked!'); }} />
    </div>
  );
};

export default HotelDetail;
