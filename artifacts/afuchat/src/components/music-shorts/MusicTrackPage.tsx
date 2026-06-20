import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Music, Play, Pause, Plus, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MusicShortsComposer } from './MusicShortsComposer';

interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  genre: string;
  usage_count: number;
}

interface ShortPreview {
  id: string;
  text_content: string;
  background_style: string;
  background_config: any;
  likes_count: number;
  created_at: string;
  profiles?: { username: string; display_name: string } | null;
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

export const MusicTrackPage = ({
  trackId,
  isOpen,
  onClose,
  onShortClick,
}: {
  trackId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onShortClick: (shortId: string) => void;
}) => {
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [shorts, setShorts] = useState<ShortPreview[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen || !trackId) return;
    
    supabase.from('music_tracks').select('*').eq('id', trackId).single()
      .then(({ data }) => data && setTrack(data as any));
    
    supabase.from('music_shorts').select('*')
      .eq('music_track_id', trackId).order('created_at', { ascending: false }).limit(50)
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((d: any) => d.user_id))];
          const { data: profiles } = await supabase
            .from('profiles').select('id, username, display_name').in('id', userIds);
          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          setShorts(data.map((d: any) => ({ ...d, profiles: profileMap.get(d.user_id) || null })) as any);
        } else {
          setShorts([]);
        }
      });
  }, [isOpen, trackId]);

  const togglePlay = () => {
    if (!track) return;
    if (!audioRef.current) audioRef.current = new Audio(track.audio_url);
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      setTimeout(() => { audioRef.current?.pause(); setIsPlaying(false); }, 6000);
    }
  };

  const getBg = (s: ShortPreview) => {
    if (s.background_style === 'solid' && s.background_config?.color) return s.background_config.color;
    const idx = s.background_config?.gradientIndex ?? 0;
    return BACKGROUND_GRADIENTS[idx % BACKGROUND_GRADIENTS.length];
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-sm">Music Track</SheetTitle>
          </SheetHeader>

          {track && (
            <div className="mt-4 space-y-4">
              {/* Track header */}
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all",
                    isPlaying ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground">{track.artist}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{track.usage_count} videos</p>
                </div>
                <Button size="sm" onClick={() => setShowComposer(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Create
                </Button>
              </div>

              {/* Shorts grid */}
              <div className="grid grid-cols-3 gap-1.5 overflow-y-auto max-h-[calc(80vh-180px)]">
                {shorts.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onShortClick(s.id)}
                    className="aspect-[9/16] rounded-lg overflow-hidden relative"
                    style={{ background: getBg(s) }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <p className="text-white text-[10px] font-semibold text-center line-clamp-4 drop-shadow">
                        {s.text_content}
                      </p>
                    </div>
                    <div className="absolute bottom-1 left-1 right-1">
                      <p className="text-white/80 text-[8px] truncate">@{(s.profiles as any)?.username}</p>
                    </div>
                  </button>
                ))}
                {shorts.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-sm text-muted-foreground">
                    No shorts with this track yet
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <MusicShortsComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        preselectedTrackId={trackId || undefined}
      />
    </>
  );
};
