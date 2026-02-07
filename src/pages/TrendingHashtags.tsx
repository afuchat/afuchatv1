import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Hash, TrendingUp, Newspaper, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { GlobalNewsSection } from '@/components/search/GlobalNewsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HashtagTrend {
  hashtag: string;
  count: number;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    display_name: string;
    handle: string;
  };
}

interface TrendingProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_organization_verified: boolean;
}

export default function TrendingHashtags() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedHashtag = searchParams.get('tag');
  
  const [trends, setTrends] = useState<HashtagTrend[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingProfiles, setTrendingProfiles] = useState<TrendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [processingFollow, setProcessingFollow] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTrendingHashtags();
    fetchTrendingProfiles();
    if (user) fetchFollowingStatus();
  }, [user]);

  useEffect(() => {
    if (selectedHashtag) {
      fetchPostsByHashtag(selectedHashtag);
    }
  }, [selectedHashtag]);

  const fetchFollowingStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    if (data) setFollowingIds(new Set(data.map(f => f.following_id)));
  };

  const fetchTrendingHashtags = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trending_topics', {
        hours_ago: 168,
        num_topics: 20
      });

      if (error) throw error;
      
      const hashtagTrends = data
        .filter((item: any) => item.topic.startsWith('#'))
        .map((item: any) => ({
          hashtag: item.topic.substring(1),
          count: item.post_count
        }));

      setTrends(hashtagTrends);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      toast.error('Failed to load trending hashtags');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingProfiles = async () => {
    try {
      // Fetch profiles that are verified or popular
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, bio, is_verified, is_organization_verified')
        .order('created_at', { ascending: true })
        .limit(15);

      if (error) throw error;
      
      const filtered = (data || []).filter(p => p.id !== user?.id);
      setTrendingProfiles(filtered);
    } catch (error) {
      console.error('Error fetching trending profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchPostsByHashtag = async (hashtag: string) => {
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          profiles (
            id,
            display_name,
            handle
          )
        `)
        .ilike('content', `%#${hashtag}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    navigate(`/trending?tag=${encodeURIComponent(hashtag)}`);
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
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
        setFollowingIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
        toast.success('Unfollowed');
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
        setFollowingIds(prev => new Set(prev).add(userId));
        toast.success('Following');
      }
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setProcessingFollow(prev => { const n = new Set(prev); n.delete(userId); return n; });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending
          </h1>
        </div>

        <Tabs defaultValue="hashtags" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-12 px-4">
            <TabsTrigger value="hashtags" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Hash className="h-4 w-4 mr-1.5" />
              Hashtags
            </TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Newspaper className="h-4 w-4 mr-1.5" />
              News
            </TabsTrigger>
            <TabsTrigger value="profiles" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Users className="h-4 w-4 mr-1.5" />
              Profiles
            </TabsTrigger>
          </TabsList>

          {/* Hashtags Tab */}
          <TabsContent value="hashtags" className="mt-0">
            <div className="grid md:grid-cols-2 gap-4 p-4">
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Hash className="h-5 w-5 text-primary" />
                    Popular Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))
                  ) : trends.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No trending hashtags yet</p>
                  ) : (
                    trends.map((trend, index) => (
                      <button
                        key={trend.hashtag}
                        onClick={() => handleHashtagClick(trend.hashtag)}
                        className={`w-full p-3 rounded-lg hover:bg-accent transition-colors text-left ${
                          selectedHashtag === trend.hashtag ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground font-medium">#{index + 1}</span>
                            <div>
                              <p className="font-semibold text-primary">#{trend.hashtag}</p>
                              <p className="text-xs text-muted-foreground">{trend.count} posts</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{trend.count}</Badge>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedHashtag ? `#${selectedHashtag}` : 'Select a hashtag'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedHashtag ? (
                    <p className="text-center text-muted-foreground py-8">
                      Click on a hashtag to see posts
                    </p>
                  ) : loadingPosts ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full mb-2" />
                    ))
                  ) : posts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No posts found</p>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {posts.map((post) => (
                        <button
                          key={post.id}
                          onClick={() => navigate(`/post/${post.id}`)}
                          className="w-full p-3 rounded-lg hover:bg-accent transition-colors text-left border border-border"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">@{post.profiles.handle}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {post.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(post.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="mt-0">
            <GlobalNewsSection />
          </TabsContent>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="mt-0">
            <div className="p-4 space-y-3">
              <h2 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Popular Profiles
              </h2>
              {loadingProfiles ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-9 w-20 rounded-full" />
                  </div>
                ))
              ) : trendingProfiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No profiles found</p>
              ) : (
                trendingProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <button onClick={() => navigate(`/${profile.id}`)}>
                      <Avatar className="h-12 w-12 border border-border/50">
                        <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name} />
                        <AvatarFallback>{profile.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/${profile.id}`)}
                          className="font-medium text-sm truncate hover:underline"
                        >
                          {profile.display_name}
                        </button>
                        <VerifiedBadge
                          isVerified={profile.is_verified}
                          isOrgVerified={profile.is_organization_verified}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">@{profile.handle}</p>
                      {profile.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{profile.bio}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        @{profile.handle}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={followingIds.has(profile.id) ? 'secondary' : 'default'}
                      className="rounded-full h-9 px-4 text-xs font-medium"
                      onClick={() => handleFollow(profile.id)}
                      disabled={processingFollow.has(profile.id)}
                    >
                      {followingIds.has(profile.id) ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
