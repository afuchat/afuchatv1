import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Eye, MapPin, Loader2, Coins, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { PurchaseListingDialog } from './PurchaseListingDialog';

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

interface UserListingCardProps {
  listing: UserListing;
}

export function UserListingCard({ listing, onPurchaseSuccess }: UserListingCardProps & { onPurchaseSuccess?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacting, setContacting] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    } catch {
      return `${currency} ${price.toLocaleString()}`;
    }
  };

  const handleContact = async () => {
    if (!user) {
      toast.error('Please sign in to contact seller');
      navigate('/auth/signin');
      return;
    }

    if (user.id === listing.seller.id) {
      toast.info('This is your own listing');
      return;
    }

    setContacting(true);
    try {
      // Check for existing chat
      const { data: existingChats } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);

      const myChats = existingChats?.map(c => c.chat_id) || [];

      if (myChats.length > 0) {
        const { data: sharedChat } = await supabase
          .from('chat_members')
          .select('chat_id, chats!inner(is_group)')
          .eq('user_id', listing.seller.id)
          .in('chat_id', myChats)
          .eq('chats.is_group', false)
          .limit(1)
          .single();

        if (sharedChat) {
          // Send intro message about the listing
          await supabase.from('messages').insert({
            chat_id: sharedChat.chat_id,
            sender_id: user.id,
            content: `Hi! I'm interested in your listing: "${listing.title}" (${formatPrice(listing.price, listing.currency)})`,
            encrypted_content: `Hi! I'm interested in your listing: "${listing.title}" (${formatPrice(listing.price, listing.currency)})`,
          });
          navigate(`/chat/${sharedChat.chat_id}`);
          return;
        }
      }

      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          created_by: user.id,
          is_group: false,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add members
      await supabase.from('chat_members').insert([
        { chat_id: newChat.id, user_id: user.id },
        { chat_id: newChat.id, user_id: listing.seller.id },
      ]);

      // Send intro message
      const messageContent = `Hi! I'm interested in your listing: "${listing.title}" (${formatPrice(listing.price, listing.currency)})`;
      await supabase.from('messages').insert({
        chat_id: newChat.id,
        sender_id: user.id,
        content: messageContent,
        encrypted_content: messageContent,
      });

      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error contacting seller:', error);
      toast.error('Failed to start conversation');
    } finally {
      setContacting(false);
    }
  };

  const mainImage = listing.images?.[0];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-muted relative">
        {mainImage ? (
          <img
            src={mainImage}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
        {listing.category && (
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            {listing.category}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2">{listing.title}</h3>
        
        {/* ACoin Price - Primary */}
        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-lg font-bold text-primary">
            {listing.acoin_price?.toLocaleString() || 0} ACoin
          </span>
        </div>
        
        {/* Local Currency - Secondary */}
        <p className="text-xs text-muted-foreground">
          ≈ {formatPrice(listing.price, listing.currency)}
        </p>

        {/* Seller Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={listing.seller.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {listing.seller.display_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {listing.seller.display_name}
          </span>
          {listing.seller.is_verified && (
            <Badge variant="secondary" className="text-xs px-1">✓</Badge>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {listing.country}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {listing.view_count}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {user?.id !== listing.seller.id && (
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => setShowPurchase(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              Buy Now
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={handleContact}
            disabled={contacting || user?.id === listing.seller.id}
          >
            {contacting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            {user?.id === listing.seller.id ? 'Your Listing' : 'Contact Seller'}
          </Button>
        </div>
      </div>

      {/* Purchase Dialog */}
      <PurchaseListingDialog
        open={showPurchase}
        onOpenChange={setShowPurchase}
        listing={listing}
        onSuccess={onPurchaseSuccess}
      />
    </Card>
  );
}
