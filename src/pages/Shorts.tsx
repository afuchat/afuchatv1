import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ShortVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  author: {
    name: string;
    profileUrl: string;
  };
  source: string;
}

const VideoCard = ({ 
  video, 
  isActive, 
  isMuted, 
  onToggleMute,
  onFirstInteraction
}: { 
  video: ShortVideo; 
  isActive: boolean; 
  isMuted: boolean;
  onToggleMute: () => void;
  onFirstInteraction: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showPlayPause, setShowPlayPause] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, show play button
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onFirstInteraction();
    }
  };

  const togglePlayPause = () => {
    handleInteraction();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }

    setShowPlayPause(true);
    setTimeout(() => setShowPlayPause(false), 500);
  };

  const handleLike = () => {
    handleInteraction();
    setIsLiked(!isLiked);
  };

  const handleShare = async () => {
    handleInteraction();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Video by ${video.author.name}`,
          url: video.videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(video.videoUrl);
        toast.success('Video link copied!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleMuteToggle = () => {
    handleInteraction();
    onToggleMute();
  };

  return (
    <div className="relative h-full w-full bg-black snap-start snap-always">
      {/* Video */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        loop
        playsInline
        muted={isMuted}
        preload="auto"
        onClick={togglePlayPause}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
      />

      {/* Tap to unmute overlay - shows when muted and active */}
      <AnimatePresence>
        {isMuted && isActive && !hasInteracted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <motion.div 
              className="bg-black/60 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-2"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <VolumeX className="h-5 w-5 text-white" />
              <span className="text-white text-sm font-medium">Tap for sound</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause Overlay */}
      <AnimatePresence>
        {showPlayPause && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
              {isPlaying ? (
                <Pause className="h-10 w-10 text-white" fill="white" />
              ) : (
                <Play className="h-10 w-10 text-white ml-1" fill="white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-30">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all",
            isLiked && "bg-red-500/20"
          )}>
            <Heart 
              className={cn(
                "h-6 w-6 transition-colors",
                isLiked ? "text-red-500 fill-red-500" : "text-white"
              )} 
            />
          </div>
          <span className="text-white text-xs font-medium">{isLiked ? '1' : '0'}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">0</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>

        <button onClick={handleMuteToggle} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all",
            isMuted ? "bg-background/10" : "bg-primary/30"
          )}>
            {isMuted ? (
              <VolumeX className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Volume2 className="h-6 w-6 text-primary-foreground" />
            )}
          </div>
          <span className="text-primary-foreground text-xs font-medium">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-20 left-4 right-20 z-30">
        <a 
          href={video.author.profileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 mb-2"
          onClick={handleInteraction}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {video.author.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm flex items-center gap-1">
              @{video.author.name.toLowerCase().replace(/\s+/g, '_')}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </p>
          </div>
        </a>
        <p className="text-white/80 text-xs">
          {video.duration}s • via {video.source}
        </p>
      </div>
    </div>
  );
};

const Shorts = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle first user interaction to enable sound
  const handleFirstInteraction = useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      setIsMuted(false); // Enable sound after first interaction
    }
  }, [hasUserInteracted]);

  const fetchVideos = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const { data, error } = await supabase.functions.invoke('fetch-shorts-videos', {
        body: { page: pageNum, perPage: 10 },
      });

      if (error) throw error;

      if (data?.success && data.videos) {
        if (append) {
          setVideos(prev => [...prev, ...data.videos]);
        } else {
          setVideos(data.videos);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos(1);
  }, [fetchVideos]);

  // Intersection observer for active video detection
  useEffect(() => {
    if (!containerRef.current) return;

    const options = {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.7,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          setActiveIndex(index);

          // Load more when near the end
          if (index >= videos.length - 3 && hasMore && !isLoadingMore) {
            setPage(prev => prev + 1);
            fetchVideos(page + 1, true);
          }
        }
      });
    }, options);

    const videoElements = containerRef.current.querySelectorAll('[data-index]');
    videoElements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [videos, hasMore, isLoadingMore, page, fetchVideos]);

  const handleRefresh = () => {
    setPage(1);
    setActiveIndex(0);
    fetchVideos(1);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <CustomLoader size="lg" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <p className="text-muted-foreground">No videos available</p>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-none"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {videos.map((video, index) => (
        <div 
          key={video.id} 
          data-index={index}
          className="h-screen w-full"
        >
          <VideoCard
            video={video}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onFirstInteraction={handleFirstInteraction}
          />
        </div>
      ))}

      {isLoadingMore && (
        <div className="h-screen w-full flex items-center justify-center bg-black">
          <CustomLoader size="lg" />
        </div>
      )}

      {/* Refresh Button - Fixed at top */}
      <Button
        onClick={handleRefresh}
        size="icon"
        variant="ghost"
        className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
      >
        <RefreshCw className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default Shorts;
