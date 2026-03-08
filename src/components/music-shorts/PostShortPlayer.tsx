import { useState, useEffect, useRef, useMemo } from 'react';
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

const BACKGROUND_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #0f3460 0%, #533483 100%)',
];

export const PostShortPlayer = ({
  post,
  isActive,
  onUserInteracted,
  hasUserInteracted,
}: {
  post: PostShort;
  isActive: boolean;
  onUserInteracted: () => void;
  hasUserInteracted: boolean;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.like_count);
  const [imageIndex, setImageIndex] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);

  const hasMultipleImages = post.post_images && post.post_images.length > 1;
  const images = post.post_images?.sort((a, b) => a.display_order - b.display_order).map(i => i.image_url) 
    || (post.image_url ? [post.image_url] : []);
  const hasImages = images.length > 0;

  const bgGradient = useMemo(() => {
    const hash = post.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return BACKGROUND_GRADIENTS[hash % BACKGROUND_GRADIENTS.length];
  }, [post.id]);

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

  // Play/pause audio
  useEffect(() => {
    if (!audioRef.current || !post.music_track?.audio_url) return;
    
    if (isActive && hasUserInteracted) {
      audioRef.current.muted = false;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else if (isActive && !hasUserInteracted) {
      // Try muted autoplay first
      audioRef.current.muted = true;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isActive, post.music_track?.audio_url, hasUserInteracted]);

  // Track audio progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // Cycle images only if multiple
  useEffect(() => {
    if (!isActive || !hasMultipleImages) return;
    const timer = setInterval(() => {
      setImageIndex(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isActive, images.length, hasMultipleImages]);

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
    // Unmute audio on tap
    if (audioRef.current && post.music_track?.audio_url) {
      audioRef.current.muted = false;
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="relative h-full w-full snap-start snap-always overflow-hidden" onClick={handleTap}>
      {/* Background */}
      {hasImages ? (
        <div className="absolute inset-0">
          <img
            src={images[imageIndex]}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
        </div>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: bgGradient }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />
          {/* Quote-style centered text for text-only posts */}
          <div className="absolute inset-0 flex items-center justify-center px-8 z-10">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 max-w-[90%]">
              <div className="text-white/40 text-4xl font-serif mb-2">"</div>
              <p className="text-white text-xl md:text-2xl font-semibold leading-relaxed"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {post.content?.length > 250 ? post.content.slice(0, 250) + '...' : post.content}
              </p>
              <div className="text-white/40 text-4xl font-serif text-right mt-2">"</div>
            </div>
          </div>
        </>
      )}

      {/* Image carousel dots */}
      {hasMultipleImages && (
        <div className="absolute top-1/2 right-3 z-20 flex flex-col gap-1.5">
          {images.map((_, i) => (
            <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === imageIndex ? "bg-white scale-125" : "bg-white/40")} />
          ))}
        </div>
      )}

      {/* Audio element */}
      {post.music_track?.audio_url && (
        <audio ref={audioRef} src={post.music_track.audio_url} loop preload="auto" />
      )}

      {/* Tap to unmute overlay - shows only when not yet interacted */}
      {!hasUserInteracted && isActive && post.music_track && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
          <span className="text-white text-xs">Tap to unmute</span>
        </div>
      )}

      {/* Bottom section: Author info + Caption + Music */}
      <div className="absolute bottom-20 left-4 right-20 z-30">
        {/* Author */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author_id}`); }}
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

        {/* Caption - shown below author for image posts */}
        {hasImages && post.content && (
          <p className="text-white text-sm leading-snug mb-2 drop-shadow-md"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            {post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content}
          </p>
        )}

        {/* Music metadata marquee */}
        {post.music_track && (
          <div className="flex items-center gap-2 mt-1 overflow-hidden">
            <div className="w-4 h-4 shrink-0">
              <Music className="h-4 w-4 text-white" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-medium whitespace-nowrap animate-marquee">
                ♫ {post.music_track.title} — {post.music_track.artist}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white/30 bg-black/40 shrink-0 flex items-center justify-center animate-spin-slow overflow-hidden">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Music progress bar */}
      {post.music_track && (
        <div className="absolute bottom-[76px] left-0 right-0 z-30 h-[2px] bg-white/10">
          <div className="h-full bg-white/60 transition-all duration-300" style={{ width: `${audioProgress}%` }} />
        </div>
      )}

      {/* Right side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-30">
        <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center",
            isLiked && "bg-red-500/20"
          )}>
            <Heart className={cn("h-5 w-5", isLiked ? "text-red-500 fill-red-500" : "text-white")} />
          </div>
          <span className="text-white text-[10px] font-medium">{localLikes}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium">{post.reply_count}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium">Share</span>
        </button>
      </div>
    </div>
  );
};
