import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  TrendingUp, Search, MessageSquare, Bell, User, Settings, Home, Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import Feed from './Feed';
import { StoryAvatar } from '@/components/moments/StoryAvatar';

interface TrendingTopic {
  topic: string;
  count: number;
}

interface SuggestedUser {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_business_mode: boolean;
}

interface DesktopFeedProps {
  guestMode?: boolean;
}

const DesktopFeed = ({ guestMode = false }: DesktopFeedProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openSettings } = useSettings();
  const { toast } = useToast();
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [processingFollow, setProcessingFollow] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');

  useEffect(() => {
    fetchTrendingTopics();
    fetchSuggestedUsers();
    fetchFollowingStatus();

    // Subscribe to profile updates for suggested users
    const profilesChannel = supabase
      .channel('desktop-profiles-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          // Update suggested user if they're in the list
          setSuggested(prev =>
            prev.map(suggestedUser =>
              suggestedUser.id === payload.new.id
                ? {
                    ...suggestedUser,
                    display_name: payload.new.display_name || suggestedUser.display_name,
                    handle: payload.new.handle || suggestedUser.handle,
                    avatar_url: payload.new.avatar_url,
                    is_verified: payload.new.is_verified ?? suggestedUser.is_verified,
                    is_business_mode: payload.new.is_business_mode ?? suggestedUser.is_business_mode,
                  }
                : suggestedUser
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchTrendingTopics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trending_topics', {
        hours_ago: 24,
        num_topics: 10
      });

      if (error) throw error;
      if (data) {
        setTrending(data.map((item: any) => ({
          topic: item.topic,
          count: item.post_count
        })));
      }
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (!user) return;

    try {
      const priorityHandles = ['afuchat', 'amkaweesi', 'afuai'];
      
      // Fetch priority accounts
      const { data: priorityAccounts, error: priorityError } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, is_verified, is_business_mode')
        .in('handle', priorityHandles);

      if (priorityError) throw priorityError;

      // Fetch additional suggested users (excluding current user and priority accounts)
      const priorityIds = priorityAccounts?.map(a => a.id) || [];
      
      let query = supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, is_verified, is_business_mode')
        .neq('id', user.id);
      
      // Only add the not filter if there are priority IDs
      if (priorityIds.length > 0) {
        query = query.not('id', 'in', `(${priorityIds.join(',')})`);
      }
      
      const { data: otherUsers, error } = await query.limit(10);

      if (error) throw error;

      // Combine: priority accounts first, then others, limit to 5 total
      const combined = [...(priorityAccounts || []), ...(otherUsers || [])].slice(0, 5);
      setSuggested(combined);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    }
  };

  const fetchFollowingStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;
      if (data) {
        setFollowingIds(new Set(data.map(f => f.following_id)));
      }
    } catch (error) {
      console.error('Error fetching following status:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    setProcessingFollow(prev => new Set(prev).add(userId));

    try {
      const isFollowing = followingIds.has(userId);

      // Check if target user is warned before following
      if (!isFollowing) {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('is_warned')
          .eq('id', userId)
          .single();

        if (targetProfile?.is_warned) {
          toast({
            title: "Cannot follow",
            description: "This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.",
            variant: "destructive",
          });
          setProcessingFollow(prev => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
          return;
        }
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });

        toast({
          title: "Unfollowed",
          description: "You are no longer following this user",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });

        if (error) throw error;

        setFollowingIds(prev => new Set(prev).add(userId));

        toast({
          title: "Following",
          description: "You are now following this user",
        });
      }

      // Refetch suggestions to update the list
      fetchSuggestedUsers();
    } catch (error) {
      console.error('Error following/unfollowing:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setProcessingFollow(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto flex">
        {/* Left Sidebar - Navigation */}
        <aside className="hidden lg:flex w-[260px] flex-col gap-1 px-2 py-2 border-r border-border sticky top-0 h-screen">
          <div className="mb-2 px-3 py-2">
            <h2 className="text-xl font-bold">AfuChat</h2>
          </div>

          <nav className="space-y-1">
            <Button
              variant={activeTab === 'foryou' ? 'default' : 'ghost'}
              className="w-full justify-start text-base h-auto py-2.5 px-3 rounded-full hover:bg-muted/70"
              onClick={() => setActiveTab('foryou')}
            >
              <Home className="h-5 w-5 mr-3" />
              <span className="font-medium">For you</span>
            </Button>

            <Button
              variant={activeTab === 'following' ? 'default' : 'ghost'}
              className="w-full justify-start text-base h-auto py-2.5 px-3 rounded-full hover:bg-muted/70"
              onClick={() => setActiveTab('following')}
            >
              <Users className="h-5 w-5 mr-3" />
              <span className="font-medium">Following</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-base h-auto py-2.5 px-3 rounded-full hover:bg-muted/70"
              onClick={() => navigate('/chats')}
            >
              <MessageSquare className="h-5 w-5 mr-3" />
              <span className="font-medium">Messages</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-base h-auto py-2.5 px-3 rounded-full hover:bg-muted/70"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5 mr-3" />
              <span className="font-medium">Notifications</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-base h-auto py-2.5 px-3 rounded-full hover:bg-muted/70"
              onClick={() => user && navigate(`/${user.id}`)}
            >
              <User className="h-5 w-5 mr-3" />
              <span className="font-medium">Profile</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-base h-auto py-2.5 px-3 rounded-full hover:bg-muted/70"
              onClick={() => openSettings()}
            >
              <Settings className="h-5 w-5 mr-3" />
              <span className="font-medium">Settings</span>
            </Button>
          </nav>

          <div className="mt-auto p-2">
            {user && (
              <Button
                variant="ghost"
                className="w-full justify-start rounded-full hover:bg-muted/70 h-auto py-2"
                onClick={() => navigate(`/${user.id}`)}
              >
							<StoryAvatar 
								userId={user.id}
								avatarUrl={user.user_metadata?.avatar_url}
								name={user.user_metadata?.display_name || 'User'}
								size="sm"
								className="mr-2"
								showStoryRing={true}
							/>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-1">
                    {user.user_metadata?.display_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    @{user.user_metadata?.handle || 'user'}
                  </p>
                </div>
              </Button>
            )}
          </div>
        </aside>

        {/* Center - Feed */}
        <main className="flex-1 min-w-0 border-r border-border max-w-[680px]">
          <Feed defaultTab={activeTab} guestMode={guestMode} />
        </main>

        {/* Right Sidebar - Trending & Suggestions */}
        <aside className="hidden xl:block w-[360px] p-3 space-y-4 overflow-y-auto h-screen">
          {/* Search */}
          <div className="sticky top-0 bg-background pb-3 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 rounded-full bg-muted/50 border-0"
              />
            </div>
          </div>

          {/* Trending */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <h3 className="font-bold text-lg mb-3">Trending</h3>
            <div className="space-y-3">
              {trending.slice(0, 5).map((topic, index) => (
                <button
                  key={index}
                  className="w-full text-left hover:bg-background/50 p-2 rounded-xl transition-colors"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(topic.topic)}`)}
                >
                  <p className="text-xs text-muted-foreground">{index + 1} · Trending</p>
                  <p className="font-semibold text-sm">#{topic.topic}</p>
                  <p className="text-xs text-muted-foreground">{topic.count} posts</p>
                </button>
              ))}
              {trending.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No trending topics
                </p>
              )}
              {trending.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-primary hover:bg-background/50"
                  onClick={() => navigate('/trending')}
                >
                  Show more
                </Button>
              )}
            </div>
          </div>

          {/* Suggested Users */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <h3 className="font-bold text-lg mb-3">Who to follow</h3>
            <div className="space-y-3">
              {suggested.map((suggestedUser) => (
                <div key={suggestedUser.id} className="flex items-start gap-2 p-2 hover:bg-background/50 rounded-xl transition-colors">
                  <StoryAvatar 
                    userId={suggestedUser.id}
                    avatarUrl={suggestedUser.avatar_url}
                    name={suggestedUser.display_name}
                    size="sm"
                    className="cursor-pointer"
                    showStoryRing={true}
                    onClick={() => navigate(`/${suggestedUser.id}`)}
                    isBusiness={suggestedUser.is_business_mode}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p
                        className="font-semibold text-sm line-clamp-1 cursor-pointer hover:underline"
                        onClick={() => navigate(`/${suggestedUser.id}`)}
                      >
                        {suggestedUser.display_name}
                      </p>
                      {suggestedUser.is_verified && (
                        <Badge variant="secondary" className="h-3 px-1 text-[10px]">✓</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      @{suggestedUser.handle}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant={followingIds.has(suggestedUser.id) ? "secondary" : "default"}
                    className="rounded-full h-8 px-4 text-xs"
                    onClick={() => handleFollow(suggestedUser.id)}
                    disabled={processingFollow.has(suggestedUser.id)}
                  >
                    {followingIds.has(suggestedUser.id) ? "Following" : "Follow"}
                  </Button>
                </div>
              ))}
              {suggested.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No suggestions
                </p>
              )}
              {suggested.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-primary hover:bg-background/50"
                  onClick={() => navigate('/suggested-users')}
                >
                  Show more
                </Button>
              )}
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-xs text-muted-foreground px-4 pb-4">
            <div className="flex flex-wrap gap-3 mb-2">
              <button onClick={() => navigate('/terms')} className="hover:underline">Terms</button>
              <button onClick={() => navigate('/privacy')} className="hover:underline">Privacy</button>
              <button onClick={() => navigate('/support')} className="hover:underline">Support</button>
            </div>
            <p>© 2024 AfuChat</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DesktopFeed;
