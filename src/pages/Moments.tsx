import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Eye, Clock, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { StoryViewer } from '@/components/moments/StoryViewer';
import { CreateStoryDialog } from '@/components/moments/CreateStoryDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import { useIsTelegram } from '@/hooks/useIsTelegram';

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

interface StoryGroup {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  handle: string;
  stories: Story[];
  latestAt: string;
  totalViews: number;
}

const Moments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const isTelegram = useIsTelegram();

  // Story viewer state — now supports multi-story navigation
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroups, setViewerGroups] = useState<StoryGroup[]>([]);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0);

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
      const idx = groupedStories.findIndex(g => g.userId === userId);
      if (idx !== -1) {
        openViewer(groupedStories, idx);
      }
    }
  }, [searchParams, stories]);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`*, profiles (display_name, avatar_url, handle)`)
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

  const groupedStories = useMemo<StoryGroup[]>(() => {
    const map: Record<string, StoryGroup> = {};
    stories.forEach(s => {
      if (!map[s.user_id]) {
        map[s.user_id] = {
          userId: s.user_id,
          displayName: s.profiles.display_name,
          avatarUrl: s.profiles.avatar_url,
          handle: s.profiles.handle,
          stories: [],
          latestAt: s.created_at,
          totalViews: 0,
        };
      }
      map[s.user_id].stories.push(s);
      map[s.user_id].totalViews += s.view_count;
      if (s.created_at > map[s.user_id].latestAt) {
        map[s.user_id].latestAt = s.created_at;
      }
    });
    return Object.values(map).sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  }, [stories]);

  const myGroup = useMemo<StoryGroup | null>(() => {
    if (myStories.length === 0) return null;
    const s = myStories[0];
    return {
      userId: s.user_id,
      displayName: s.profiles.display_name,
      avatarUrl: s.profiles.avatar_url,
      handle: s.profiles.handle,
      stories: myStories,
      latestAt: myStories[0].created_at,
      totalViews: myStories.reduce((sum, st) => sum + st.view_count, 0),
    };
  }, [myStories]);

  const openViewer = (groups: StoryGroup[], groupIdx: number) => {
    setViewerGroups(groups);
    setViewerGroupIndex(groupIdx);
    setViewerStoryIndex(0);
    setViewerOpen(true);

    // Record view for the first story
    const story = groups[groupIdx].stories[0];
    recordView(story);
  };

  const recordView = async (story: Story) => {
    if (story.user_id === user?.id || !user) return;
    try {
      await supabase.from('story_views').insert({ story_id: story.id, viewer_id: user.id });
      await supabase.from('stories').update({ view_count: story.view_count + 1 }).eq('id', story.id);
    } catch {}
  };

  const handleViewerNext = () => {
    const currentGroup = viewerGroups[viewerGroupIndex];
    if (viewerStoryIndex < currentGroup.stories.length - 1) {
      const nextIdx = viewerStoryIndex + 1;
      setViewerStoryIndex(nextIdx);
      recordView(currentGroup.stories[nextIdx]);
    } else if (viewerGroupIndex < viewerGroups.length - 1) {
      const nextGroupIdx = viewerGroupIndex + 1;
      setViewerGroupIndex(nextGroupIdx);
      setViewerStoryIndex(0);
      recordView(viewerGroups[nextGroupIdx].stories[0]);
    } else {
      setViewerOpen(false);
    }
  };

  const handleViewerPrev = () => {
    if (viewerStoryIndex > 0) {
      setViewerStoryIndex(viewerStoryIndex - 1);
    } else if (viewerGroupIndex > 0) {
      const prevGroup = viewerGroups[viewerGroupIndex - 1];
      setViewerGroupIndex(viewerGroupIndex - 1);
      setViewerStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
      toast.success('Story deleted');
      setViewerOpen(false);
      fetchStories();
    } catch {
      toast.error('Failed to delete story');
    }
  };

  const timeAgo = (date: string) => {
    try { return formatDistanceToNowStrict(new Date(date), { addSuffix: false }); } 
    catch { return ''; }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto">
        {/* Header — respects Telegram safe area */}
        <div 
          className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40"
          style={{ paddingTop: isTelegram ? 'var(--tg-safe-top, 0px)' : undefined }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-bold text-foreground">Moments</h1>
            <Button onClick={handleCreateStory} size="sm" variant="ghost" className="gap-1.5 text-primary font-semibold">
              <Camera className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        {/* Your Stories Row */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Story</p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {/* Add Story Card */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateStory}
              className="flex-shrink-0 w-[88px] h-[140px] rounded-2xl bg-muted/40 border border-dashed border-border/60 flex flex-col items-center justify-center gap-2 hover:bg-muted/60 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">Add Story</span>
            </motion.button>

            {/* My Stories */}
            {myStories.map((story, idx) => (
              <motion.button
                key={story.id}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  if (myGroup) openViewer([myGroup], 0);
                }}
                className="flex-shrink-0 w-[88px] h-[140px] rounded-2xl overflow-hidden relative group"
              >
                {story.media_type === 'image' ? (
                  <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={story.media_url} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3 text-white/90" />
                  <span className="text-[11px] font-semibold text-white">{story.view_count}</span>
                </div>
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                    <Clock className="h-2.5 w-2.5 text-white/70" />
                    <span className="text-[9px] text-white/70">{timeAgo(story.created_at)}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/40 mx-4 my-2" />

        {/* Others' Stories */}
        <div className="px-4 pt-2 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Updates</p>
          
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[200px] rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : groupedStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                <Camera className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No stories yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">When people post stories, they'll show up here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {groupedStories.map((group, gIdx) => (
                  <motion.button
                    key={group.userId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gIdx * 0.06 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openViewer(groupedStories, gIdx)}
                    className="relative h-[200px] rounded-2xl overflow-hidden group text-left"
                  >
                    {/* Background Image */}
                    {group.stories[0].media_type === 'image' ? (
                      <img
                        src={group.stories[0].media_url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={group.stories[0].media_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

                    {/* Story count badge */}
                    {group.stories.length > 1 && (
                      <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                        {group.stories.length}
                      </div>
                    )}

                    {/* Avatar + Name */}
                    <div className="absolute top-2.5 left-2.5">
                      <Avatar className="h-9 w-9 ring-2 ring-primary shadow-lg">
                        <AvatarImage src={group.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-bold">{group.displayName[0]}</AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-white font-semibold text-sm truncate leading-tight">{group.displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-white/60">{timeAgo(group.latestAt)}</span>
                        <span className="text-white/30">·</span>
                        <div className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3 text-white/50" />
                          <span className="text-[11px] text-white/60">{group.totalViews}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer */}
      {viewerOpen && viewerGroups.length > 0 && (
        <StoryViewer
          stories={viewerGroups[viewerGroupIndex].stories}
          currentIndex={viewerStoryIndex}
          onClose={() => setViewerOpen(false)}
          onNext={handleViewerNext}
          onPrevious={handleViewerPrev}
          onDelete={handleDeleteStory}
          canDelete={viewerGroups[viewerGroupIndex].userId === user?.id}
        />
      )}

      <CreateStoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchStories}
      />

      {/* FAB for quick actions */}
      {user && <FloatingActionButton />}
    </div>
  );
};

export default Moments;
