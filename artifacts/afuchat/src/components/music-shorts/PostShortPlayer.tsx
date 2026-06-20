import { useState, useEffect, useMemo, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PostShort {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  post_images?: Array<{ image_url: string; display_order: number; alt_text?: string }>;
  profiles?: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
  like_count: number;
  reply_count: number;
  music_track?: {
    id: string;
    title: string;
    artist: string;
    audio_url: string;
  } | null;
}

// Global audio element - shared across all shorts for seamless playback
let globalAudio: HTMLAudioElement | null = null;

const getGlobalAudio = () => {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.loop = true;
    globalAudio.preload = 'auto';
  }
  return globalAudio;
};

export const PostShortPlayer = ({
  post,
  isActive,
  onUserInteracted,
  hasUserInteracted,
  clipDuration = 6000,
  onMusicTap,
}: {
  post: PostShort;
  isActive: boolean;
  onUserInteracted: () => void;
  hasUserInteracted: boolean;
  clipDuration?: number;
  onMusicTap?: (trackId: string) => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.like_count);
  const [imageIndex, setImageIndex] = useState(0);
  const [clipProgress, setClipProgress] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  const hasMultipleImages = post.post_images && post.post_images.length > 1;
  const images = post.post_images?.sort((a, b) => a.display_order - b.display_order).map(i => i.image_url) 
    || (post.image_url ? [post.image_url] : []);

  // Ken Burns animation direction based on post id hash
  const kenBurnsDirection = useMemo(() => {
    const hash = post.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return hash % 4; // 0: zoom-in, 1: zoom-out, 2: pan-left, 3: pan-right
  }, [post.id]);

  const kenBurnsClass = useMemo(() => {
    const classes = [
      'animate-kenburns-zoom-in',
      'animate-kenburns-zoom-out',
      'animate-kenburns-pan-left',
      'animate-kenburns-pan-right',
    ];
    return classes[kenBurnsDirection];
  }, [kenBurnsDirection]);

  // Check if liked
  useEffect(() => {
    if (!user) return;
    supabase
      .from('post_acknowledgments')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsLiked(!!data));
  }, [post.id, user]);

  // Play/pause audio using global audio element
  useEffect(() => {
    if (!isActive || !post.music_track?.audio_url) return;

    const audio = getGlobalAudio();
    audio.src = post.music_track.audio_url;
    audio.currentTime = 0;
    audio.muted = !hasUserInteracted;
    audio.play().catch((err) => {
      console.warn('Audio play blocked:', err.message);
    });

    return () => {
      // Don't pause here — let the next active short take over
    };
  }, [isActive, post.music_track?.audio_url, hasUserInteracted]);

  // 6-second clip progress timer
  useEffect(() => {
    if (!isActive) {
      setClipProgress(0);
      setAnimationKey(prev => prev + 1);
      return;
    }
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / clipDuration) * 100, 100);
      setClipProgress(progress);
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, clipDuration]);

  // Cycle images for multi-image posts within the 6s clip
  useEffect(() => {
    if (!isActive || !hasMultipleImages) return;
    const perImage = clipDuration / images.length;
    const timer = setInterval(() => {
      setImageIndex(prev => (prev + 1) % images.length);
    }, perImage);
    return () => { clearInterval(timer); setImageIndex(0); };
  }, [isActive, images.length, hasMultipleImages, clipDuration]);

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like'); return; }
    onUserInteracted();
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLocalLikes(prev => wasLiked ? prev - 1 : prev + 1);

    if (wasLiked) {
      await supabase.from('post_acknowledgments').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('post_acknowledgments').insert({ post_id: post.id, user_id: user.id });
    }
  };

  const handleShare = async () => {
    onUserInteracted();
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.content?.slice(0, 50), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      }
    } catch {}
  };

  const handleTap = () => {
    onUserInteracted();
    const audio = getGlobalAudio();
    audio.muted = false;
    if (post.music_track?.audio_url) {
      if (!audio.src || audio.src !== post.music_track.audio_url) {
        audio.src = post.music_track.audio_url;
      }
      audio.play().catch(() => {});
    }
  };

  const handleMusicTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.music_track && onMusicTap) {
      onMusicTap(post.music_track.id);
    }
  };

  return (
    <div className="relative h-full w-full snap-start snap-always overflow-hidden" onClick={handleTap}>
      {/* Ken Burns animated image background */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          key={`${post.id}-${imageIndex}-${animationKey}`}
          src={images[imageIndex]}
          alt=""
          className={cn(
            "w-full h-full object-cover",
            isActive ? kenBurnsClass : ""
          )}
          style={{ willChange: 'transform' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      </div>

      {/* Image carousel dots for multi-image */}
      {hasMultipleImages && (
        <div className="absolute top-1/2 right-3 z-20 flex flex-col gap-1.5">
          {images.map((_, i) => (
            <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === imageIndex ? "bg-white scale-125" : "bg-white/40")} />
          ))}
        </div>
      )}

      {/* Tap to unmute overlay */}
      {!hasUserInteracted && isActive && post.music_track && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
          <span className="text-white text-xs">🔇 Tap to unmute</span>
        </div>
      )}

      {/* 6s clip progress bar at top */}
      <div className="absolute top-0 left-0 right-0 z-40 h-[3px] bg-white/10">
        <div 
          className="h-full bg-white/80 transition-none"
          style={{ width: `${clipProgress}%` }} 
        />
      </div>

      {/* Bottom section: Author + Caption */}
      <div className="absolute bottom-[108px] left-4 right-4 z-30">
        {/* Author */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/@${post.author_id}`); }}
          className="flex items-center gap-2.5 mb-2"
        >
          <Avatar className="w-9 h-9 border-2 border-white/30">
            <AvatarImage src={post.profiles?.avatar_url || ''} />
            <AvatarFallback className="bg-white/20 text-white text-xs">
              {post.profiles?.display_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-sm font-bold drop-shadow">
            @{post.profiles?.handle || 'user'}
          </span>
        </button>

        {/* Caption text overlay */}
        {post.content && (
          <p className="text-white text-sm leading-snug mb-1 drop-shadow-md"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            {post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content}
          </p>
        )}
      </div>

      {/* Bottom bar: Music metadata + Actions on the same row */}
      <div className="absolute bottom-[72px] left-0 right-0 z-30">
        {/* Music + Actions row */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Music metadata - tappable */}
          {post.music_track ? (
            <button 
              onClick={handleMusicTap}
              className="flex items-center gap-2 overflow-hidden flex-1 mr-3"
            >
              <div className="w-7 h-7 rounded-full border border-white/30 bg-black/40 shrink-0 flex items-center justify-center animate-spin-slow overflow-hidden">
                {post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Music className="h-3 w-3 text-white/70" />
                )}
              </div>
              <div className="overflow-hidden flex-1 text-left">
                <p className="text-white text-xs font-medium whitespace-nowrap animate-marquee">
                  ♫ {post.music_track.title} — {post.music_track.artist}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex items-center gap-1">
              <Heart className={cn("h-5 w-5", isLiked ? "text-red-500 fill-red-500" : "text-white")} />
              <span className="text-white text-xs font-medium">{localLikes}</span>
            </button>

            <button onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }} className="flex items-center gap-1">
              <MessageCircle className="h-5 w-5 text-white" />
              <span className="text-white text-xs font-medium">{post.reply_count}</span>
            </button>

            <button onClick={(e) => { e.stopPropagation(); handleShare(); }}>
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
