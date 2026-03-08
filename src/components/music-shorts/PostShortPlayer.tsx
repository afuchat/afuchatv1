import { useState, useEffect, useRef, useMemo } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
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
}: {
  post: PostShort;
  isActive: boolean;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.like_count);
  const [imageIndex, setImageIndex] = useState(0);

  const hasMultipleImages = post.post_images && post.post_images.length > 1;
  const images = post.post_images?.sort((a, b) => a.display_order - b.display_order).map(i => i.image_url) 
    || (post.image_url ? [post.image_url] : []);
  const hasImages = images.length > 0;

  // Random gradient for text-only posts
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

  // Play/pause audio - always unmuted
  useEffect(() => {
    if (!audioRef.current || !post.music_track?.audio_url) return;
    audioRef.current.muted = false;
    if (isActive) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isActive, post.music_track?.audio_url]);

  // Cycle images only if multiple
  useEffect(() => {
    if (!isActive || !hasMultipleImages) return;
    const timer = setInterval(() => {
      setImageIndex(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isActive, images.length]);

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like'); return; }
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

  return (
    <div className="relative h-full w-full snap-start snap-always overflow-hidden">
      {/* Background */}
      {hasImages ? (
        <div className="absolute inset-0">
          <img
            src={images[imageIndex]}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        </div>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: bgGradient }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
        </>
      )}

      {/* Center text content */}
      <div className="absolute inset-0 flex items-center justify-center px-8 z-10">
        <div className="text-center max-w-[85%]">
          <p
            className={cn(
              "leading-relaxed drop-shadow-lg font-semibold",
              hasImages ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"
            )}
            style={{
              color: '#FFFFFF',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
          >
            {post.content?.length > 200 ? post.content.slice(0, 200) + '...' : post.content}
          </p>
        </div>
      </div>

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

      {/* Bottom: Author + Music info */}
      <div className="absolute bottom-20 left-4 right-20 z-30">
        <button
          onClick={() => navigate(`/profile/${post.author_id}`)}
          className="flex items-center gap-2.5 mb-3"
        >
          <Avatar className="w-9 h-9 border-2 border-white/30">
            <AvatarImage src={post.profiles?.avatar_url || ''} />
            <AvatarFallback className="bg-white/20 text-white text-xs">
              {post.profiles?.display_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <span className="text-white text-sm font-bold drop-shadow block leading-tight">
              {post.profiles?.display_name || 'User'}
            </span>
            <span className="text-white/70 text-xs">@{post.profiles?.handle || 'user'}</span>
          </div>
        </button>
        {post.music_track && (
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
            <Music className="h-3.5 w-3.5 text-white" />
            <span className="text-white text-xs font-medium truncate max-w-[180px]">
              {post.music_track.title} • {post.music_track.artist}
            </span>
          </div>
        )}
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-30">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center",
            isLiked && "bg-red-500/20"
          )}>
            <Heart className={cn("h-5 w-5", isLiked ? "text-red-500 fill-red-500" : "text-white")} />
          </div>
          <span className="text-white text-[10px] font-medium">{localLikes}</span>
        </button>

        <button onClick={() => navigate(`/post/${post.id}`)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium">{post.reply_count}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium">Share</span>
        </button>

        <button onClick={onToggleMute} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center",
            isMuted ? "bg-white/10" : "bg-primary/30"
          )}>
            {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
          </div>
          <span className="text-white text-[10px] font-medium">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>
      </div>
    </div>
  );
};
