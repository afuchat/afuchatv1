import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { WarningBadge } from "@/components/WarningBadge";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_organization_verified: boolean;
  is_business_mode: boolean;
  bio?: string;
  follow_created_at: string;
  is_warned?: boolean;
  warning_reason?: string | null;
  verification_source?: 'manual' | 'premium' | null;
}

export default function Followers() {
  const { userId: handleOrId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    resolveProfile();
  }, [handleOrId, user]);

  useEffect(() => {
    if (profileId) {
      fetchFollowers();
      if (user) {
        fetchFollowingStatus();
      }
    }
  }, [profileId, user]);

  const resolveProfile = async () => {
    if (!handleOrId) return;

    try {
      // Check if it's a UUID or handle
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(handleOrId);
      
      let resolvedId: string;
      
      if (isUUID) {
        resolvedId = handleOrId;
      } else {
        // Resolve handle to ID
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("handle", handleOrId)
          .single();

        if (error) throw error;
        resolvedId = data.id;
      }
      
      setProfileId(resolvedId);
      setIsOwnProfile(user?.id === resolvedId);
      
      // Check if followers list is private
      const { data: profileData } = await supabase
        .from("profiles")
        .select("hide_followers_list")
        .eq("id", resolvedId)
        .single();
      
      if (profileData?.hide_followers_list && user?.id !== resolvedId) {
        setIsPrivate(true);
      } else {
        setIsPrivate(false);
      }
    } catch (error) {
      console.error("Error resolving profile:", error);
      toast.error("User not found");
      navigate(-1);
    }
  };

  const fetchFollowers = async () => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          follower_id,
          created_at,
          profiles!follows_follower_id_fkey (
            id,
            display_name,
            handle,
            avatar_url,
            is_verified,
            is_organization_verified,
            is_business_mode,
            bio,
            is_warned,
            warning_reason,
            verification_source
          )
        `)
        .eq("following_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const profiles = data
        ?.map((item: any) => ({
          ...item.profiles,
          follow_created_at: item.created_at,
        }))
        .filter((p: any) => p.id !== null) as UserProfile[];

      setUsers(profiles || []);
    } catch (error: any) {
      console.error("Error fetching followers:", error);
      toast.error("Failed to load followers");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowingStatus = async () => {
    if (!user) return;

    try {
      // Get who the current user is following
      const { data: followingData, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followingError) throw followingError;

      const ids = new Set(followingData?.map((f) => f.following_id) || []);
      setFollowingIds(ids);

      // Get who is following the current user (to determine "Follow Back")
      const { data: followerData, error: followerError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      if (followerError) throw followerError;

      const followerIdsSet = new Set(followerData?.map((f) => f.follower_id) || []);
      setFollowerIds(followerIdsSet);
    } catch (error) {
      console.error("Error fetching following status:", error);
    }
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!user) {
      toast.error("Please sign in to follow users");
      navigate("/auth");
      return;
    }

    const isCurrentlyFollowing = followingIds.has(targetUserId);
    
    // Block following warned accounts (allow unfollow)
    if (!isCurrentlyFollowing) {
      const targetUser = users.find(u => u.id === targetUserId);
      if (targetUser?.is_warned) {
        toast.error("This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.");
        return;
      }
    }

    // Optimistic update
    setFollowingIds((prev) => {
      const newSet = new Set(prev);
      if (isCurrentlyFollowing) {
        newSet.delete(targetUserId);
      } else {
        newSet.add(targetUserId);
      }
      return newSet;
    });

    try {
      if (isCurrentlyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");

      // Revert on error
      setFollowingIds((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyFollowing) {
          newSet.add(targetUserId);
        } else {
          newSet.delete(targetUserId);
        }
        return newSet;
      });
    }
  };

  const handleUserClick = (userHandle: string) => {
    navigate(`/${userHandle}`);
  };

  if (isPrivate && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Followers List is Private</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              This user has chosen to keep their followers list private.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No followers yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {users.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <Avatar
                  className="h-12 w-12 cursor-pointer"
                  onClick={() => handleUserClick(profile.handle || profile.id)}
                >
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback>
                    {(profile.display_name || profile.handle || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleUserClick(profile.handle || profile.id)}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="font-semibold text-sm max-w-[120px] truncate"
                      title={profile.display_name || profile.handle || 'User'}
                    >
                      {(profile.display_name || profile.handle || 'User').length > 12
                        ? `${(profile.display_name || profile.handle || 'User').slice(0, 10)}...`
                        : (profile.display_name || profile.handle || 'User')}
                    </span>
                    {profile.is_warned && <WarningBadge size="sm" reason={profile.warning_reason} variant="post" />}
                    <VerifiedBadge 
                      isVerified={profile.is_verified} 
                      isOrgVerified={profile.is_organization_verified}
                      size="sm" 
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">@{profile.handle || profile.id}</span>
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {profile.bio}
                    </p>
                  )}
                </div>

                {user && user.id !== profile.id && (
                  <Button
                    size="sm"
                    variant={followingIds.has(profile.id) ? "outline" : "default"}
                    onClick={() => handleFollowToggle(profile.id)}
                  >
                    {followingIds.has(profile.id) 
                      ? (followerIds.has(profile.id) 
                          ? <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Friends</span>
                          : "Following")
                      : followerIds.has(profile.id) 
                        ? "Follow Back"
                        : "Follow"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
