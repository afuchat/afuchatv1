import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, ArrowLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { StoryViewer } from '@/components/moments/StoryViewer';
import { CreateStoryDialog } from '@/components/moments/CreateStoryDialog';


interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  expires_at: string;
  created_at: string;
  view_count: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    handle: string;
  };
}

const Moments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const handleCreateStory = () => {
    if (!user) {
      toast.info('Sign in to create stories');
      navigate('/auth/signin');
      return;
    }
    setCreateDialogOpen(true);
  };

  useEffect(() => {
    fetchStories();
  }, [user]);

  // Auto-open user's stories if user param is present
  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId && stories.length > 0) {
      const userStories = stories.filter(s => s.user_id === userId);
      if (userStories.length > 0) {
        handleStoryClick(userStories[0]);
      }
    }
  }, [searchParams, stories]);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles (display_name, avatar_url, handle)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allStories = (data || []) as Story[];
      setMyStories(allStories.filter(s => s.user_id === user?.id));
      setStories(allStories.filter(s => s.user_id !== user?.id));
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast.error('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = async (story: Story) => {
    setSelectedStory(story);
    
    // Record view
    if (story.user_id !== user?.id) {
      try {
        await supabase
          .from('story_views')
          .insert({
            story_id: story.id,
            viewer_id: user?.id
          });

        // Update view count
        await supabase
          .from('stories')
          .update({ view_count: story.view_count + 1 })
          .eq('id', story.id);
      } catch (error) {
        console.error('Error recording view:', error);
      }
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      toast.success('Story deleted successfully');
      fetchStories();
      setSelectedStory(null);
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('Failed to delete story');
    }
  };

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = [];
    }
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-background border-b">
          <div className="px-4 py-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-4xl">📸</div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Moments</h1>
                  <p className="text-muted-foreground">Share your day, 24 hours at a time</p>
                </div>
              </div>
              <Button onClick={handleCreateStory} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        <div className="p-4 space-y-6">
          {/* My Story */}
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Your Stories
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {myStories.length === 0 && (
                <Card 
                  className="flex-shrink-0 w-28 h-40 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={handleCreateStory}
                >
                  <CardContent className="p-0 relative h-full">
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <Plus className="h-10 w-10 text-primary mb-2" />
                      <p className="text-xs font-medium px-2 text-center">Create Story</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {myStories.map((story) => (
                <Card 
                  key={story.id}
                  className="flex-shrink-0 w-28 h-40 cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden group"
                  onClick={() => handleStoryClick(story)}
                >
                  <CardContent className="p-0 relative h-full">
                    {story.media_type === 'image' ? (
                      <img 
                        src={story.media_url} 
                        alt="Story" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video 
                        src={story.media_url} 
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                      <div className="flex items-center justify-center gap-1 text-white">
                        <Eye className="h-3 w-3" />
                        <p className="text-xs font-medium">{story.view_count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Friends' Stories */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Friends' Moments</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {Object.entries(groupedStories).map(([userId, userStories]) => {
                const firstStory = userStories[0];
                return (
                  <Card 
                    key={userId}
                    className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => handleStoryClick(firstStory)}
                  >
                    <CardContent className="p-0 relative">
                      <div className="relative h-32">
                        {firstStory.media_type === 'image' ? (
                          <img 
                            src={firstStory.media_url} 
                            alt="Story" 
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                        ) : (
                          <video 
                            src={firstStory.media_url} 
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                        )}
                        <div className="absolute top-2 left-2">
                          <Avatar className="h-10 w-10 ring-2 ring-primary">
                            <AvatarImage src={firstStory.profiles.avatar_url || undefined} />
                            <AvatarFallback>
                              {firstStory.profiles.display_name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">
                          {firstStory.profiles.display_name}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {!loading && stories.length === 0 && myStories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No stories yet. Be the first to share!</p>
            </div>
          )}
        </div>
      </div>

      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          onDelete={handleDeleteStory}
          canDelete={selectedStory.user_id === user?.id}
        />
      )}

      <CreateStoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchStories}
      />
    </div>
  );
};

export default Moments;
