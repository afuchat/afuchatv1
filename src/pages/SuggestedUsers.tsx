import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/skeletons';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface SuggestedUser {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  is_organization_verified: boolean | null;
  is_affiliate: boolean | null;
  affiliated_business_id: string | null;
  verification_source: string | null;
  following_me?: boolean;
  business_profile?: {
    avatar_url: string | null;
    display_name: string;
  } | null;
}

interface BusinessProfile {
  avatar_url: string | null;
  display_name: string;
}

export default function SuggestedUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [processingFollow, setProcessingFollow] = useState<Set<string>>(new Set());
  const [hasCheckedFollows, setHasCheckedFollows] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (user && !hasCheckedFollows && !isNavigating) {
      checkIfAlreadyFollowing();
    }
  }, [user, hasCheckedFollows, isNavigating]);

  useEffect(() => {
    if (user && hasCheckedFollows) {
      fetchSuggestedUsers();
    }
  }, [user, hasCheckedFollows]);

  const checkIfAlreadyFollowing = async () => {
    if (!user || isNavigating) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id, following_id')
        .eq('follower_id', user.id);

      if (error) throw error;

      // If user already follows someone, redirect to home
      if (data && data.length > 0) {
        setIsNavigating(true);
        navigate('/home', { replace: true });
        return;
      }
      
      setHasCheckedFollows(true);
    } catch (error) {
      console.error('Error checking follows:', error);
      setHasCheckedFollows(true);
    }
  };

  const fetchSuggestedUsers = async () => {
    setLoading(true);
    try {
      // Fetch pinned users first
      const { data: pinnedUsers, error: pinnedError } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url, bio, is_verified, is_organization_verified, is_affiliate, affiliated_business_id, verification_source')
        .in('handle', ['afuchat', 'amkaweesi']);

      if (pinnedError) throw pinnedError;

      // Fetch other suggested users (excluding pinned ones and current user)
      const { data: otherUsers, error: otherError } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url, bio, is_verified, is_organization_verified, is_affiliate, affiliated_business_id, verification_source')
        .not('handle', 'in', '(afuchat,amkaweesi)')
        .neq('id', user?.id || '')
        .limit(8);

      if (otherError) throw otherError;

      // Sort pinned users to ensure correct order
      const sortedPinned = (pinnedUsers || []).sort((a, b) => {
        if (a.handle === 'afuchat') return -1;
        if (b.handle === 'afuchat') return 1;
        if (a.handle === 'amkaweesi') return -1;
        if (b.handle === 'amkaweesi') return 1;
        return 0;
      });

      const allUsers = [...sortedPinned, ...(otherUsers || [])];

      // Check which users are following the current user
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', user.id)
          .in('follower_id', allUsers.map(u => u.id));

        const followerIds = new Set(followData?.map(f => f.follower_id) || []);

        // Fetch business profiles for affiliates
        const affiliateUsers = allUsers.filter(u => u.is_affiliate && u.affiliated_business_id);
        const businessProfiles: Record<string, BusinessProfile> = {};
        
        if (affiliateUsers.length > 0) {
          const { data: businesses } = await supabase
            .from('profiles')
            .select('id, avatar_url, display_name')
            .in('id', affiliateUsers.map(u => u.affiliated_business_id!));

          businesses?.forEach(b => {
            businessProfiles[b.id] = b;
          });
        }

        // Add following_me flag and business info
        const usersWithFollowInfo = allUsers.map(u => ({
          ...u,
          following_me: followerIds.has(u.id),
          business_profile: u.affiliated_business_id ? businessProfiles[u.affiliated_business_id] : null
        }));

        setUsers(usersWithFollowInfo);
      } else {
        setUsers(allUsers);
      }
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      toast.error('Failed to load suggested users');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user || followingIds.has(userId)) return;

    setProcessingFollow(prev => new Set(prev).add(userId));

    try {
      // Check if target user is warned
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('is_warned')
        .eq('id', userId)
        .maybeSingle();

      if (targetProfile?.is_warned) {
        toast.error('This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.');
        setProcessingFollow(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        return;
      }

      // Check if already following (prevent duplicate key error)
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (existingFollow) {
        // Already following, just update UI state
        setFollowingIds(prev => new Set(prev).add(userId));
        setProcessingFollow(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        return;
      }

      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });

      if (error) {
        // Handle duplicate key constraint error gracefully
        if (error.code === '23505') {
          setFollowingIds(prev => new Set(prev).add(userId));
          return;
        }
        throw error;
      }

      setFollowingIds(prev => new Set(prev).add(userId));
      toast.success('Followed successfully');
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    } finally {
      setProcessingFollow(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleContinue = () => {
    if (followingIds.size === 0) {
      toast.error('Please follow at least one user to continue');
      return;
    }
    setIsNavigating(true);
    navigate('/home', { replace: true });
  };

  const isPinned = (handle: string) => {
    return handle === 'afuchat' || handle === 'amkaweesi';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <ListSkeleton rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to AfuChat! 🎉</h1>
          <p className="text-muted-foreground">
            Follow at least one user to get started and see their posts in your feed
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {users.map((suggestedUser) => (
            <Card key={suggestedUser.id} className="p-4">
              <div className="flex items-center gap-4">
                <Avatar
                  className="h-12 w-12 cursor-pointer"
                  onClick={() => navigate(`/${suggestedUser.handle}`)}
                >
                  <AvatarImage src={suggestedUser.avatar_url || undefined} />
                  <AvatarFallback>
                    {suggestedUser.display_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h3
                      className="font-semibold truncate cursor-pointer hover:underline"
                      onClick={() => navigate(`/${suggestedUser.handle}`)}
                    >
                      {suggestedUser.display_name}
                    </h3>
                    <VerifiedBadge
                      isVerified={suggestedUser.is_verified || false}
                      isOrgVerified={suggestedUser.is_organization_verified || false}
                      isAffiliate={suggestedUser.is_affiliate || false}
                      affiliateBusinessLogo={suggestedUser.business_profile?.avatar_url}
                      affiliateBusinessName={suggestedUser.business_profile?.display_name}
                      userId={suggestedUser.id}
                      verificationSource={suggestedUser.verification_source as 'manual' | 'premium' | null}
                      size="sm"
                    />
                    {isPinned(suggestedUser.handle) && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">@{suggestedUser.handle}</p>
                  {suggestedUser.bio && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {suggestedUser.bio}
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleFollow(suggestedUser.id)}
                  disabled={followingIds.has(suggestedUser.id) || processingFollow.has(suggestedUser.id)}
                  variant={followingIds.has(suggestedUser.id) ? "secondary" : "default"}
                >
                  {processingFollow.has(suggestedUser.id) ? (
                    'Following...'
                  ) : followingIds.has(suggestedUser.id) ? (
                    'Following'
                  ) : suggestedUser.following_me ? (
                    'Follow Back'
                  ) : (
                    'Follow'
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur pt-4 pb-8">
          <Button
            onClick={handleContinue}
            disabled={followingIds.size === 0}
            className="w-full"
            size="lg"
          >
            Continue to AfuChat ({followingIds.size} followed)
          </Button>
        </div>
      </div>
    </div>
  );
}
