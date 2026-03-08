import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  is_organization_verified: boolean;
}

interface DesktopRightSidebarProps {
  className?: string;
  variant?: 'full' | 'suggestions';
}

export const DesktopRightSidebar = ({ className, variant = 'full' }: DesktopRightSidebarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [processingFollow, setProcessingFollow] = useState<Set<string>>(new Set());
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(true);

  useEffect(() => {
    fetchTrendingTopics();
    fetchSuggestedUsers();
    if (user) {
      fetchFollowingStatus();
    }
  }, [user]);

  const fetchTrendingTopics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trending_topics', {
        hours_ago: 24,
        num_topics: 5
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
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      const priorityHandles = ['afuchat', 'amkaweesi', 'afuai'];
      
      const { data: priorityAccounts } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, is_verified, is_organization_verified')
        .in('handle', priorityHandles);

      const priorityIds = priorityAccounts?.map(a => a.id) || [];
      
      let query = supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, is_verified, is_organization_verified');
      
      if (user) {
        query = query.neq('id', user.id);
      }
      
      if (priorityIds.length > 0) {
        query = query.not('id', 'in', `(${priorityIds.join(',')})`);
      }
      
      const { data: otherUsers } = await query.limit(5);

      const combined = [...(priorityAccounts || []), ...(otherUsers || [])].slice(0, 4);
      setSuggested(combined);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    } finally {
      setIsLoadingSuggested(false);
    }
  };

  const fetchFollowingStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (data) {
        setFollowingIds(new Set(data.map(f => f.following_id)));
      }
    } catch (error) {
      console.error('Error fetching following status:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }

    setProcessingFollow(prev => new Set(prev).add(userId));

    try {
      const isFollowing = followingIds.has(userId);

      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        toast.success('Unfollowed');
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });

        setFollowingIds(prev => new Set(prev).add(userId));
        toast.success('Following');
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    } finally {
      setProcessingFollow(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <aside className={cn('w-80 flex-shrink-0 space-y-4 p-4', className)}>

      {/* Trending Topics - only show on full variant */}
      {variant === 'full' && (
        <Card className="bg-card border-border/50 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trending
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {isLoadingTrending ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="py-2">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            ) : trending.length > 0 ? (
              <>
                {trending.slice(0, 4).map((topic, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors block"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(topic.topic)}`)}
                  >
                    <p className="text-[11px] text-muted-foreground">Trending</p>
                    <p className="font-medium text-sm">#{topic.topic}</p>
                    <p className="text-[11px] text-muted-foreground">{topic.count.toLocaleString()} posts</p>
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-primary hover:text-primary/80 mt-2"
                  onClick={() => navigate('/search')}
                >
                  Show more
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No trending topics</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Who to Follow */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Who to follow
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {isLoadingSuggested ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            ))
          ) : suggested.length > 0 ? (
            <>
              {suggested.map((suggestedUser) => (
                <div 
                  key={suggestedUser.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Link to={`/@${suggestedUser.id}`}>
                    <Avatar className="h-10 w-10 border border-border/50">
                      <AvatarImage src={suggestedUser.avatar_url || ''} alt={suggestedUser.display_name} />
                      <AvatarFallback className="text-xs">
                        {suggestedUser.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Link 
                        to={`/${suggestedUser.id}`}
                        className="font-medium text-sm truncate hover:underline max-w-[100px]"
                      >
                        {suggestedUser.display_name}
                      </Link>
                      <VerifiedBadge 
                        isVerified={suggestedUser.is_verified}
                        isOrgVerified={suggestedUser.is_organization_verified}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">@{suggestedUser.handle}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={followingIds.has(suggestedUser.id) ? 'secondary' : 'default'}
                    className="rounded-full h-8 px-4 text-xs font-medium"
                    onClick={() => handleFollow(suggestedUser.id)}
                    disabled={processingFollow.has(suggestedUser.id)}
                  >
                    {followingIds.has(suggestedUser.id) ? 'Following' : 'Follow'}
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-primary hover:text-primary/80 mt-2"
                onClick={() => navigate('/search')}
              >
                Show more
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No suggestions</p>
          )}
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="text-xs text-muted-foreground px-2 space-y-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/support" className="hover:underline">Support</Link>
        </div>
        <p>© 2025–{new Date().getFullYear()} AfuChat</p>
      </div>
    </aside>
  );
};
