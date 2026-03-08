import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Users, Image as ImageIcon, Heart, MessageCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SocialHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trendingHashtags, setTrendingHashtags] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [recentStories, setRecentStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSocialData();
  }, [user]);

  const fetchSocialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTrendingTopics(),
      fetchSuggestedUsers(),
      fetchRecentStories()
    ]);
    setLoading(false);
  };

  const fetchTrendingTopics = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_trending_topics', { hours_ago: 24, num_topics: 10 });

      if (error) throw error;
      setTrendingHashtags(data || []);
    } catch (error) {
      console.error('Error fetching trending topics:', error);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, bio, is_verified, is_organization_verified')
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;
      setSuggestedUsers(data || []);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    }
  };

  const fetchRecentStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          media_url,
          media_type,
          caption,
          created_at,
          view_count,
          user:profiles(id, display_name, avatar_url, is_verified)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentStories(data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check if target user is warned
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('is_warned')
        .eq('id', userId)
        .single();

      if (targetProfile?.is_warned) {
        toast.error('This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.');
        return;
      }

      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });

      if (error) throw error;
      
      // Remove from suggested users
      setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hidden lg:inline-flex">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
            <Button variant="ghost" size="icon" onClick={() => navigate('/moments')}>
              <ImageIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Social Hub</h1>
          <p className="text-muted-foreground">Discover trending content and connect with users</p>
        </div>

        <Tabs defaultValue="moments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="moments">
              <ImageIcon className="h-4 w-4 mr-2" />
              Moments
            </TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="discover">
              <Users className="h-4 w-4 mr-2" />
              Discover
            </TabsTrigger>
          </TabsList>

          {/* Moments Tab */}
          <TabsContent value="moments" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Stories</h2>
              <Button onClick={() => navigate('/moments')}>View All</Button>
            </div>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentStories.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No active stories</p>
                  <Button onClick={() => navigate('/moments')} className="mt-4">
                    Create Story
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {recentStories.map(story => (
                  <div
                    key={story.id}
                    className="cursor-pointer group"
                    onClick={() => navigate('/moments')}
                  >
                    <div className="relative aspect-[9/16] rounded-2xl overflow-hidden">
                      <img
                        src={story.media_url}
                        alt={story.caption || 'Story'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={story.user.avatar_url} />
                            <AvatarFallback>{story.user.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-white text-sm font-semibold truncate max-w-[100px]" title={story.user.display_name}>
                            {story.user.display_name.length > 10 ? `${story.user.display_name.slice(0, 8)}...` : story.user.display_name}
                          </span>
                        </div>
                        {story.caption && (
                          <p className="text-white text-xs line-clamp-2">{story.caption}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Trending Topics</h2>
              <p className="text-sm text-muted-foreground">Popular hashtags in the last 24 hours</p>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : trendingHashtags.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No trending topics right now</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {trendingHashtags.map((hashtag, idx) => (
                  <Card
                    key={idx}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(hashtag.topic)}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-primary">#{hashtag.topic}</span>
                            <Badge variant="secondary">{idx + 1}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {hashtag.post_count} {hashtag.post_count === 1 ? 'post' : 'posts'}
                          </p>
                        </div>
                        <TrendingUp className="h-6 w-6 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Suggested Users</h2>
              <p className="text-sm text-muted-foreground">Connect with new people</p>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : suggestedUsers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No suggestions available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {suggestedUsers.map(suggestedUser => (
                  <Card key={suggestedUser.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar
                          className="h-12 w-12 cursor-pointer"
                          onClick={() => navigate(`/@${suggestedUser.id}`)}
                        >
                          <AvatarImage src={suggestedUser.avatar_url} />
                          <AvatarFallback>{suggestedUser.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => navigate(`/${suggestedUser.id}`)}
                          >
                            <span className="font-semibold truncate max-w-[120px]" title={suggestedUser.display_name}>{suggestedUser.display_name.length > 12 ? `${suggestedUser.display_name.slice(0, 10)}...` : suggestedUser.display_name}</span>
                            {suggestedUser.is_verified && (
                              <Badge variant="secondary" className="text-xs">✓</Badge>
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
                          size="sm"
                          onClick={() => handleFollowUser(suggestedUser.id)}
                        >
                          Follow
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SocialHub;
