import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Check, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { AffiliatedBadge } from '@/components/AffiliatedBadge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_organization_verified: boolean;
  is_business_mode: boolean;
  affiliated_business_id: string | null;
}

interface SelectRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRecipient: (recipient: { id: string; name: string }) => Promise<void>;
}

export const SelectRecipientDialog = ({
  open,
  onOpenChange,
  onSelectRecipient,
}: SelectRecipientDialogProps) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSuggestedProfiles();
      setSelectedProfile(null);
    } else {
      setSearch('');
      setProfiles([]);
      setSelectedProfile(null);
    }
  }, [open]);

  useEffect(() => {
    if (search.length > 0) {
      searchProfiles();
    } else if (open) {
      fetchSuggestedProfiles();
    }
  }, [search]);

  const fetchSuggestedProfiles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Get users that the current user follows
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(15);

      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', followingIds)
          .neq('id', user.id)
          .limit(15);

        setProfiles(profilesData || []);
      } else {
        // If not following anyone, show recent profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        setProfiles(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching suggested profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchProfiles = async () => {
    if (!user || search.length === 0) return;

    try {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .or(`handle.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(20);

      setProfiles(data || []);
    } catch (error) {
      console.error('Error searching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    if (selectedProfile) {
      setSending(true);
      try {
        await onSelectRecipient({
          id: selectedProfile.id,
          name: selectedProfile.display_name,
        });
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        onOpenChange={onOpenChange}
        className="h-[85vh] p-0"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 pt-4 pb-4 border-b border-border">
            <SheetHeader className="text-left mb-0">
              <SheetTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Select Recipient
              </SheetTitle>
              <SheetDescription>
                Choose who you want to send this gift to
              </SheetDescription>
            </SheetHeader>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or @handle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* Selected User Preview */}
          {selectedProfile && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 mt-4 p-4 rounded-2xl bg-primary/10 border-2 border-primary/30"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src={selectedProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {selectedProfile.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-foreground truncate">
                      {selectedProfile.display_name}
                    </p>
                    <VerifiedBadge isVerified={selectedProfile.is_verified} isOrgVerified={selectedProfile.is_organization_verified} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    @{selectedProfile.handle}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                </div>
              </div>
            </motion.div>
          )}

          {/* User List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 font-medium">
              {search ? 'Search Results' : 'Suggested Recipients'}
            </p>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No users found' : 'No suggestions available'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try searching for someone by name or handle
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile, index) => (
                  <motion.button
                    key={profile.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedProfile(profile)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                      ${selectedProfile?.id === profile.id 
                        ? 'bg-primary/10 border-2 border-primary/40 scale-[1.02]' 
                        : 'hover:bg-muted/50 border-2 border-transparent'
                      }
                    `}
                  >
                    <Avatar className={`h-12 w-12 ${selectedProfile?.id === profile.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold truncate text-sm">
                          {profile.display_name}
                        </p>
                        <VerifiedBadge isVerified={profile.is_verified} isOrgVerified={profile.is_organization_verified} size="sm" />
                        {profile.affiliated_business_id && <AffiliatedBadge size="sm" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile.handle}
                      </p>
                    </div>
                    {selectedProfile?.id === profile.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Send Button */}
          <div className="px-6 py-4 border-t border-border bg-background">
            <Button
              onClick={handleConfirmSend}
              disabled={!selectedProfile || sending}
              className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-red-500 to-green-600 hover:from-red-600 hover:to-green-700 disabled:opacity-50"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Send className="w-5 h-5" />
                  </motion.div>
                  Sending Gift...
                </span>
              ) : selectedProfile ? (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send to {selectedProfile.display_name}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Select a Recipient
                </span>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};