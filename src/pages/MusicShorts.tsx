import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { Music2 } from 'lucide-react';
import { PostShortPlayer } from '@/components/music-shorts/PostShortPlayer';
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

const MusicShorts = () => {
  const [shorts, setShorts] = useState<PostShort[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchShorts = useCallback(async () => {
    setLoading(true);

    // Fetch posts and music tracks in parallel
    const [postsRes, tracksRes] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          id, content, image_url, created_at, author_id,
          post_images(image_url, display_order, alt_text)
        `)
        .eq('is_blocked', false)
        .order('created_at', { ascending: false })
        .limit(50),
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
    setMusicTracks(tracks);

    if (posts.length === 0) {
      setShorts([]);
      setLoading(false);
      return;
    }

    // Fetch profiles
    const userIds = [...new Set(posts.map((p: any) => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, handle, avatar_url, is_verified')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Fetch like counts and reply counts using RPC functions
    const postIds = posts.map((p: any) => p.id);
    const [likesRes, repliesRes] = await Promise.all([
      supabase.rpc('get_post_like_counts', { post_ids: postIds }),
      supabase.rpc('get_post_reply_counts', { post_ids: postIds }),
    ]);

    const likeCounts = new Map<string, number>();
    const replyCounts = new Map<string, number>();
    (likesRes.data || []).forEach((l: any) => likeCounts.set(l.post_id, l.like_count));
    (repliesRes.data || []).forEach((r: any) => replyCounts.set(r.post_id, r.reply_count));

    // Assign a random music track to each post
    const enriched: PostShort[] = posts.map((p: any) => ({
      ...p,
      profiles: profileMap.get(p.author_id) || null,
      like_count: likeCounts.get(p.id) || 0,
      reply_count: replyCounts.get(p.id) || 0,
      music_track: tracks.length > 0 ? tracks[Math.floor(Math.random() * tracks.length)] : null,
    }));

    // Shuffle for variety
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
        <Music2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No posts yet</p>
        <p className="text-muted-foreground text-xs">Posts from the feed will appear here as shorts!</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black">
      {/* Feed */}
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
            />
          </div>
        ))}
      </div>

      {/* Top actions */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => { setActiveIndex(0); fetchShorts(); }}
          className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowDiscovery(true)}
          className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
        >
          <Music2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Dialogs */}
      <MusicDiscovery
        isOpen={showDiscovery}
        onClose={() => setShowDiscovery(false)}
        onTrackClick={() => setShowDiscovery(false)}
      />
    </div>
  );
};

export default MusicShorts;
