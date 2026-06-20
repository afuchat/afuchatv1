import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserListingCard } from './UserListingCard';
import { CreateListingDialog } from './CreateListingDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';

const CATEGORIES = [
  'All',
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

interface UserListing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  country: string;
  category: string | null;
  images: string[];
  view_count: number;
  created_at: string;
  acoin_price: number;
  seller: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface Profile {
  country: string | null;
  is_business_mode: boolean;
}

export function UserListings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_product_listings')
        .select(`
          *,
          seller:profiles!seller_id(
            id,
            display_name,
            handle,
            avatar_url,
            is_verified
          )
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (category !== 'All') {
        query = query.eq('category', category);
      }

      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [category, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Local Marketplace</h2>
          {profile?.country && (
            <span className="text-xs text-muted-foreground">({profile.country})</span>
          )}
        </div>
        <CreateListingDialog onSuccess={fetchListings} />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
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

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No listings found in your area</p>
          {profile?.is_business_mode && (
            <p className="text-sm mt-2">Be the first to list a product!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <UserListingCard 
              key={listing.id} 
              listing={listing} 
              onPurchaseSuccess={fetchListings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
