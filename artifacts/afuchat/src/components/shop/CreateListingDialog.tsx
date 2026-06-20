import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2, Upload, X, Coins } from 'lucide-react';
import { getCurrencyForCountry, convertToACoin } from '@/lib/currencyUtils';

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Vehicles',
  'Services',
  'Real Estate',
  'Jobs',
  'Food & Agriculture',
  'Health & Beauty',
  'Sports & Leisure',
  'Other'
];

interface CreateListingDialogProps {
  onSuccess?: () => void;
}

interface Profile {
  country: string | null;
  is_business_mode: boolean;
}

export function CreateListingDialog({ onSuccess }: CreateListingDialogProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('country, is_business_mode')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  const userCurrency = getCurrencyForCountry(profile?.country || 'Uganda');
  
  // Calculate ACoin price from local currency
  const acoinPrice = useMemo(() => {
    if (!price || isNaN(parseFloat(price))) return 0;
    return convertToACoin(parseFloat(price), userCurrency.code);
  }, [price, userCurrency.code]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length || images.length >= 4) return;
    setUploading(true);
    try {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image');
        return;
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase.storage
        .from('listing-images')
        .upload(`listings/${fileName}`, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(data.path);
      
      setImages(prev => [...prev, publicUrl]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!profile.is_business_mode) {
      toast.error('Only business accounts can create listings');
      return;
    }

    if (!title.trim() || !price) {
      toast.error('Please fill in title and price');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_product_listings')
        .insert({
          seller_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          price: parseFloat(price),
          currency: userCurrency.code,
          country: profile.country || 'Uganda',
          category: category || null,
          images: images.filter(Boolean),
          acoin_price: acoinPrice,
        });

      if (error) throw error;

      toast.success('Listing created successfully!');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCategory('');
    setImages([]);
  };

  if (!profile?.is_business_mode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          List Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you selling?"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ({userCurrency.code}) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* ACoin Price Display */}
            {acoinPrice > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <Coins className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">ACoin Price</p>
                  <p className="text-lg font-bold text-primary">{acoinPrice.toLocaleString()} ACoin</p>
                  <p className="text-xs text-muted-foreground">≈ ${(acoinPrice * 0.2).toFixed(2)} USD</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Images (up to 4)</Label>
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <p>📍 Your listing will be visible to users in <strong>{profile?.country || 'your country'}</strong> only.</p>
            <p className="mt-1">💬 Interested buyers will contact you via in-app chat.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Listing'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
