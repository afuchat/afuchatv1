import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, X } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface StoryViewer {
  viewer_id: string;
  viewed_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    handle: string;
  };
}

interface StoryViewersSheetProps {
  storyId: string;
  isOpen: boolean;
  onClose: () => void;
  onPauseStory: (paused: boolean) => void;
}

export const StoryViewersSheet = ({ storyId, isOpen, onClose, onPauseStory }: StoryViewersSheetProps) => {
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      onPauseStory(true);
      fetchViewers();
    } else {
      onPauseStory(false);
    }
  }, [isOpen, storyId]);

  const fetchViewers = async () => {
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('story_views')
        .select('viewer_id, viewed_at, profiles!story_views_viewer_id_fkey(display_name, avatar_url, handle)', { count: 'exact' })
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setViewers((data as any) || []);
      setTotalViews(count || 0);
    } catch (err) {
      console.error('Error fetching story viewers:', err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (date: string) => {
    try { return formatDistanceToNowStrict(new Date(date), { addSuffix: true }); }
    catch { return ''; }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 z-30 bg-background rounded-t-2xl max-h-[60vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">
                {totalViews} {totalViews === 1 ? 'view' : 'views'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Viewers list */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Eye className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No views yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {viewers.map((viewer) => (
                  <button
                    key={viewer.viewer_id}
                    onClick={() => {
                      onClose();
                      navigate(`/@${viewer.viewer_id}`);
                    }}
                    className="w-full flex items-center gap-3 py-2.5 px-1 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={viewer.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                        {viewer.profiles?.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {viewer.profiles?.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{viewer.profiles?.handle} · {timeAgo(viewer.viewed_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
