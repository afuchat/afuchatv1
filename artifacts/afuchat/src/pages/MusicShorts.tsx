import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { Film } from 'lucide-react';
import { PostShortPlayer } from '@/components/music-shorts/PostShortPlayer';
import { MusicTrackPage } from '@/components/music-shorts/MusicTrackPage';
import { MusicDiscovery } from '@/components/music-shorts/MusicDiscovery';
import { toast } from 'sonner';

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

const CLIP_DURATION = 6000; // 6 seconds per clip

const MusicShorts = () => {
  const [shorts, setShorts] = useState<PostShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showMusicTrackPage, setShowMusicTrackPage] = useState(false);
  const [showMusicDiscovery, setShowMusicDiscovery] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchShorts = useCallback(async () => {
    setLoading(true);

    const [postsRes, tracksRes] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          id, content, image_url, created_at, author_id,
          post_images(image_url, display_order, alt_text)
        `)
        .eq('is_blocked', false)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('music_tracks')
        .select('id, title, artist, audio_url')
        .limit(50),
    ]);

    if (postsRes.error) {
      toast.error('Failed to load');
      setLoading(false);
      return;
    }

    const posts = postsRes.data || [];
    const tracks = tracksRes.data || [];

    // CORE RULE: Only posts with images are eligible for short clips
    const imagePosts = posts.filter((p: any) => {
      const hasPostImages = p.post_images && p.post_images.length > 0;
      const hasImageUrl = !!p.image_url;
      return hasPostImages || hasImageUrl;
    });

    if (imagePosts.length === 0) {
      setShorts([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(imagePosts.map((p: any) => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, handle, avatar_url, is_verified')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const postIds = imagePosts.map((p: any) => p.id);
    const [likesRes, repliesRes] = await Promise.all([
      supabase.rpc('get_post_like_counts', { post_ids: postIds }),
      supabase.rpc('get_post_reply_counts', { post_ids: postIds }),
    ]);

    const likeCounts = new Map<string, number>();
    const replyCounts = new Map<string, number>();
    (likesRes.data || []).forEach((l: any) => likeCounts.set(l.post_id, l.like_count));
    (repliesRes.data || []).forEach((r: any) => replyCounts.set(r.post_id, r.reply_count));

    const enriched: PostShort[] = imagePosts.map((p: any) => ({
      ...p,
      profiles: profileMap.get(p.author_id) || null,
      like_count: likeCounts.get(p.id) || 0,
      reply_count: replyCounts.get(p.id) || 0,
      music_track: tracks.length > 0 ? tracks[Math.floor(Math.random() * tracks.length)] : null,
    }));

    setShorts(enriched.sort(() => Math.random() - 0.5));
    setLoading(false);
  }, []);

  useEffect(() => { fetchShorts(); }, [fetchShorts]);

  // Intersection observer for active detection
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute('data-index') || '0');
            setActiveIndex(idx);
          }
        });
      },
      { root: containerRef.current, threshold: 0.7 }
    );

    containerRef.current.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [shorts]);

  // Auto-advance after 6 seconds
  useEffect(() => {
    if (shorts.length === 0) return;
    const timer = setTimeout(() => {
      if (activeIndex < shorts.length - 1 && containerRef.current) {
        const nextEl = containerRef.current.querySelector(`[data-index="${activeIndex + 1}"]`);
        nextEl?.scrollIntoView({ behavior: 'smooth' });
      }
    }, CLIP_DURATION);
    return () => clearTimeout(timer);
  }, [activeIndex, shorts.length]);

  const handleMusicTap = (trackId: string) => {
    setSelectedTrackId(trackId);
    setShowMusicTrackPage(true);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <CustomLoader size="lg" />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <Film className="h-12 w-12 text-white/40" />
        <p className="text-white/60 text-sm">No short clips yet</p>
        <p className="text-white/40 text-xs">Posts with images will appear here as short clips</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black">
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {shorts.map((short, index) => (
          <div key={short.id} data-index={index} className="h-screen w-full">
            <PostShortPlayer
              post={short}
              isActive={index === activeIndex}
              onUserInteracted={() => setHasUserInteracted(true)}
              hasUserInteracted={hasUserInteracted}
              clipDuration={CLIP_DURATION}
              onMusicTap={handleMusicTap}
            />
          </div>
        ))}
      </div>

      {/* Music Track Page Sheet */}
      <MusicTrackPage
        trackId={selectedTrackId}
        isOpen={showMusicTrackPage}
        onClose={() => setShowMusicTrackPage(false)}
        onShortClick={() => setShowMusicTrackPage(false)}
      />

      {/* Music Discovery Sheet */}
      <MusicDiscovery
        isOpen={showMusicDiscovery}
        onClose={() => setShowMusicDiscovery(false)}
        onTrackClick={(trackId) => {
          setShowMusicDiscovery(false);
          setSelectedTrackId(trackId);
          setShowMusicTrackPage(true);
        }}
      />
    </div>
  );
};

export default MusicShorts;
