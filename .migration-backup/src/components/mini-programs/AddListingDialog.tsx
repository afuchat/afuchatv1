import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AddListingDialogProps {
  listingType: 'event' | 'booking' | 'ride' | 'food' | 'travel_flight' | 'travel_hotel';
  categories?: string[];
  onSuccess?: () => void;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
}

export const AddListingDialog = ({ 
  listingType, 
  categories = [], 
  onSuccess,
  buttonText = 'Add Listing',
  buttonVariant = 'outline'
}: AddListingDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    category: '',
    image_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to add a listing');
      return;
    }

    if (!formData.title || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('mini_program_listings')
        .insert({
          user_id: user.id,
          listing_type: listingType,
          title: formData.title,
          description: formData.description,
          price: formData.price,
          location: formData.location,
          category: formData.category,
          image_url: formData.image_url || getDefaultImage(listingType),
          country: profile?.country || null,
          status: 'approved',
        });

      if (error) throw error;

      toast.success('Listing added successfully!');
      setFormData({ title: '', description: '', price: '', location: '', category: '', image_url: '' });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding listing:', error);
      toast.error('Failed to add listing');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultImage = (type: string) => {
    const defaults: Record<string, string> = {
      event: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
      booking: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop',
      ride: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop',
      food: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
      travel_flight: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop',
      travel_hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    };
    return defaults[type] || defaults.event;
  };

  const getFieldLabels = () => {
    switch (listingType) {
      case 'event':
        return { title: 'Event Name', price: 'Ticket Price', location: 'Venue' };
      case 'booking':
        return { title: 'Service Name', price: 'Service Price', location: 'Location' };
      case 'ride':
        return { title: 'Ride Type', price: 'Fare', location: 'Coverage Area' };
      case 'food':
        return { title: 'Restaurant Name', price: 'Min Order', location: 'Address' };
      case 'travel_flight':
        return { title: 'Flight Route', price: 'Ticket Price', location: 'Airline' };
      case 'travel_hotel':
        return { title: 'Hotel Name', price: 'Price/Night', location: 'Location' };
      default:
        return { title: 'Title', price: 'Price', location: 'Location' };
    }
  };

  const labels = getFieldLabels();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New {listingType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{labels.title} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={`Enter ${labels.title.toLowerCase()}`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{labels.price} (Nexa) *</Label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                required
              />
            </div>

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{labels.location}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={`Enter ${labels.location.toLowerCase()}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL (optional)</Label>
            <Input
              id="image"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Listing
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
