import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { Button } from '@/components/ui/button';
import { Plus, Music2, RefreshCw } from 'lucide-react';
import { MusicShortPlayer } from '@/components/music-shorts/MusicShortPlayer';
import { MusicShortsComposer } from '@/components/music-shorts/MusicShortsComposer';
import { MusicDiscovery } from '@/components/music-shorts/MusicDiscovery';
import { MusicTrackPage } from '@/components/music-shorts/MusicTrackPage';
import { toast } from 'sonner';

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

const MusicShorts = () => {
  const [shorts, setShorts] = useState<MusicShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showTrackPage, setShowTrackPage] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchShorts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('music_shorts')
      .select('*, music_track:music_track_id(id, title, artist, audio_url)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      toast.error('Failed to load');
    } else if (data && data.length > 0) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const enriched = data.map((d: any) => ({
        ...d,
        profiles: profileMap.get(d.user_id) || null,
      }));
      setShorts(enriched.sort(() => Math.random() - 0.5) as any);
    } else {
      setShorts([]);
    }
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

  const handleTrackClick = (trackId: string) => {
    setSelectedTrackId(trackId);
    setShowTrackPage(true);
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
        <Music2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No music shorts yet</p>
        <p className="text-muted-foreground text-xs">Be the first to create one!</p>
        <Button onClick={() => setShowComposer(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Music Short
        </Button>
        <MusicShortsComposer isOpen={showComposer} onClose={() => { setShowComposer(false); fetchShorts(); }} />
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
            <MusicShortPlayer
              short={short}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onTrackClick={handleTrackClick}
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

      {/* Create FAB */}
      <Button
        onClick={() => setShowComposer(true)}
        size="icon"
        className="fixed bottom-24 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Dialogs */}
      <MusicShortsComposer
        isOpen={showComposer}
        onClose={() => { setShowComposer(false); fetchShorts(); }}
      />
      <MusicDiscovery
        isOpen={showDiscovery}
        onClose={() => setShowDiscovery(false)}
        onTrackClick={handleTrackClick}
      />
      <MusicTrackPage
        trackId={selectedTrackId}
        isOpen={showTrackPage}
        onClose={() => setShowTrackPage(false)}
        onShortClick={(id) => {
          setShowTrackPage(false);
          const idx = shorts.findIndex(s => s.id === id);
          if (idx >= 0) setActiveIndex(idx);
        }}
      />
    </div>
  );
};

export default MusicShorts;
