import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Trash2, Eye, Pause, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';

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

interface StoryViewerProps {
  stories: Story[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDelete: (storyId: string) => void;
  canDelete: boolean;
}

const STORY_DURATION = 5000; // 5 seconds per image
const VIDEO_DURATION = 15000;
const TICK_INTERVAL = 50;

export const StoryViewer = ({
  stories,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onDelete,
  canDelete,
}: StoryViewerProps) => {
  const story = stories[currentIndex];
  const duration = story.media_type === 'video' ? VIDEO_DURATION : STORY_DURATION;

  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const pausedRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const progressRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    progressRef.current = 0;
    setPaused(false);
    pausedRef.current = false;
  }, [currentIndex, story.id]);

  // Progress timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      
      progressRef.current += (100 / (duration / TICK_INTERVAL));
      
      if (progressRef.current >= 100) {
        progressRef.current = 0;
        setProgress(0);
        onNext();
        return;
      }
      
      setProgress(progressRef.current);
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [duration, onNext, story.id]);

  // Video sync
  useEffect(() => {
    if (story.media_type === 'video' && videoRef.current) {
      if (paused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [paused, story.media_type]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrevious();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onClose]);

  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    setShowPauseIcon(true);
    setTimeout(() => setShowPauseIcon(false), 600);
  }, []);

  // Long press handlers — prevent all default behavior (context menu, image save, etc.)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      pausedRef.current = true;
      setPaused(true);
    }, 200);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isLongPress.current) {
      pausedRef.current = false;
      setPaused(false);
      isLongPress.current = false;
      return;
    }

    // Short tap — navigate
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      onPrevious();
    } else if (x > third * 2) {
      onNext();
    }
  }, [onPrevious, onNext]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPress.current) {
      pausedRef.current = false;
      setPaused(false);
      isLongPress.current = false;
    }
  }, []);

  // Block context menu (long-press "Save Image" on mobile)
  const handleContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const timeAgo = (date: string) => {
    try { return formatDistanceToNowStrict(new Date(date), { addSuffix: true }); }
    catch { return ''; }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
    >
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-[max(env(safe-area-inset-top),12px)] flex gap-1">
        {stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              }}
              transition={{ duration: 0.05, ease: 'linear' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[max(calc(env(safe-area-inset-top)+24px),36px)] px-4 pb-3 bg-gradient-to-b from-black/60 via-black/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-white/30">
              <AvatarImage src={story.profiles.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{story.profiles.display_name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white text-sm leading-tight">{story.profiles.display_name}</p>
              <p className="text-[11px] text-white/50">{timeAgo(story.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this story?')) onDelete(story.id);
                }}
                className="h-9 w-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="h-9 w-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Media */}
      <div
        className="absolute inset-0 flex items-center justify-center touch-none select-none"
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={handleContextMenu}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={story.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            {story.media_type === 'image' ? (
              <img
                src={story.media_url}
                alt=""
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            ) : (
              <video
                ref={videoRef}
                src={story.media_url}
                className="max-h-full max-w-full object-contain"
                autoPlay
                playsInline
                muted={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Pause indicator */}
        <AnimatePresence>
          {showPauseIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                {paused ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Caption + Views */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[max(env(safe-area-inset-bottom),16px)] px-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        {story.caption && (
          <p className="text-white text-sm mb-3 leading-relaxed max-w-[90%]">{story.caption}</p>
        )}
        <div className="flex items-center gap-1.5 text-white/40">
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{story.view_count} views</span>
        </div>
      </div>
    </motion.div>
  );
};
