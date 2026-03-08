import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Music, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MusicShortCommentsSheet } from './MusicShortCommentsSheet';

interface MusicShort {
  id: string;
  text_content: string;
  background_style: string;
  background_config: any;
  text_color: string;
  font_style: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  user_id: string;
  created_at: string;
  music_track?: {
    id: string;
    title: string;
    artist: string;
    audio_url: string;
  } | null;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  } | null;
}

const BACKGROUND_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
];

const getBackground = (style: string, config: any): string => {
  if (style === 'solid' && config?.color) return config.color;
  if (style === 'image' && config?.imageUrl) return `url(${config.imageUrl})`;
  const idx = config?.gradientIndex ?? Math.floor(Math.random() * BACKGROUND_GRADIENTS.length);
  return BACKGROUND_GRADIENTS[idx % BACKGROUND_GRADIENTS.length];
};

// Animated particles overlay
const ParticlesOverlay = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-white/30"
        initial={{ 
          x: Math.random() * 100 + '%', 
          y: '110%',
          opacity: 0 
        }}
        animate={{ 
          y: '-10%',
          opacity: [0, 0.6, 0],
        }}
        transition={{ 
          duration: 3 + Math.random() * 4,
          repeat: Infinity,
          delay: Math.random() * 3,
          ease: 'linear'
        }}
        style={{ left: `${Math.random() * 100}%` }}
      />
    ))}
  </div>
);

export const MusicShortPlayer = ({
  short,
  isActive,
  isMuted,
  onToggleMute,
  onTrackClick,
}: {
  short: MusicShort;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onTrackClick?: (trackId: string) => void;
}) => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(short.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  const bg = useMemo(() => getBackground(short.background_style, short.background_config), [short]);

  // Check if user liked this short
  useEffect(() => {
    if (!user) return;
    supabase
      .from('music_short_likes')
      .select('id')
      .eq('short_id', short.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsLiked(!!data));
  }, [short.id, user]);

  // Play/pause audio based on active state
  useEffect(() => {
    if (!audioRef.current || !short.music_track?.audio_url) return;
    if (isActive) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isActive, short.music_track?.audio_url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // Text animation cycle (6 seconds total)
  useEffect(() => {
    if (!isActive) { setAnimationPhase(0); return; }
    const timer = setInterval(() => {
      setAnimationPhase(p => (p + 1) % 3);
    }, 2000);
    return () => clearInterval(timer);
  }, [isActive]);

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like'); return; }
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLocalLikes(prev => wasLiked ? prev - 1 : prev + 1);

    if (wasLiked) {
      await supabase.from('music_short_likes').delete()
        .eq('short_id', short.id).eq('user_id', user.id);
    } else {
      await supabase.from('music_short_likes').insert({
        short_id: short.id, user_id: user.id
      });
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/music-shorts?id=${short.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: short.text_content, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      }
    } catch {}
  };

  const textVariants = {
    0: { scale: 0.8, opacity: 0, y: 30 },
    1: { scale: 1, opacity: 1, y: 0 },
    2: { scale: 1.05, opacity: 1, y: -5 },
  };

  return (
    <div className="relative h-full w-full snap-start snap-always overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: bg.startsWith('url(') ? undefined : bg,
          backgroundImage: bg.startsWith('url(') ? bg : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Particles overlay */}
      {(short.background_style === 'particles' || short.background_style === 'gradient') && (
        <ParticlesOverlay />
      )}

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50 pointer-events-none" />

      {/* Center text - animated */}
      <div className="absolute inset-0 flex items-center justify-center px-8 z-10">
        <motion.div
          key={animationPhase}
          initial={textVariants[0]}
          animate={textVariants[animationPhase as keyof typeof textVariants] || textVariants[1]}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
          className="text-center max-w-[85%]"
        >
          <p
            className="text-2xl md:text-3xl leading-snug drop-shadow-lg"
            style={{
              color: short.text_color || '#FFFFFF',
              fontWeight: short.font_style === 'bold' ? 700 : 500,
              fontStyle: short.font_style === 'italic' ? 'italic' : 'normal',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {short.text_content}
          </p>
        </motion.div>
      </div>

      {/* Audio element */}
      {short.music_track?.audio_url && (
        <audio
          ref={audioRef}
          src={short.music_track.audio_url}
          loop
          muted={isMuted}
          preload="auto"
        />
      )}

      {/* Bottom: Music info + author */}
      <div className="absolute bottom-20 left-4 right-20 z-30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold">
            {short.profiles?.display_name?.charAt(0) || '?'}
          </div>
          <span className="text-white text-sm font-semibold drop-shadow">
            @{short.profiles?.username || 'user'}
          </span>
        </div>
        {short.music_track && (
          <button
            onClick={() => onTrackClick?.(short.music_track!.id)}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5"
          >
            <motion.div
              animate={isActive ? { rotate: 360 } : {}}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Music className="h-3.5 w-3.5 text-white" />
            </motion.div>
            <span className="text-white text-xs font-medium truncate max-w-[180px]">
              {short.music_track.title} • {short.music_track.artist}
            </span>
          </button>
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

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium">{short.comments_count}</span>
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

      {/* Comments sheet */}
      <MusicShortCommentsSheet
        shortId={short.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </div>
  );
};
