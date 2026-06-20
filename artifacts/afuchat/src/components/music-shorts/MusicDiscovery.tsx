import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, TrendingUp, Clock, Zap, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  genre: string;
  usage_count: number;
  is_featured: boolean;
  created_at: string;
}

export const MusicDiscovery = ({
  isOpen,
  onClose,
  onTrackClick,
}: {
  isOpen: boolean;
  onClose: () => void;
  onTrackClick: (trackId: string) => void;
}) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);

  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from('music_tracks')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(50)
      .then(({ data }) => data && setTracks(data as any));
  }, [isOpen]);

  const togglePlay = (track: MusicTrack) => {
    if (!audioEl) return;
    if (playingId === track.id) {
      audioEl.pause();
      setPlayingId(null);
    } else {
      audioEl.src = track.audio_url;
      audioEl.play().catch(() => {});
      setPlayingId(track.id);
      setTimeout(() => { audioEl.pause(); setPlayingId(null); }, 6000);
    }
  };

  const trending = tracks.filter(t => t.is_featured).slice(0, 10);
  const popular = [...tracks].sort((a, b) => b.usage_count - a.usage_count).slice(0, 10);
  const newest = [...tracks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  const rising = tracks.filter(t => t.usage_count > 0 && t.usage_count < 50).slice(0, 10);

  const TrackList = ({ items }: { items: MusicTrack[] }) => (
    <div className="space-y-2 mt-3">
      {items.map((track) => (
        <div
          key={track.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all cursor-pointer"
          onClick={() => onTrackClick(track.id)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
              playingId === track.id ? "bg-primary text-primary-foreground" : "bg-background border"
            )}
          >
            {playingId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground">{track.artist} • {track.usage_count} videos</p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{track.genre}</span>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No tracks yet</p>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Music className="h-4 w-4 text-primary" />
            Discover Sounds
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="trending" className="mt-3">
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="trending" className="text-[10px] gap-1"><TrendingUp className="h-3 w-3" />Trending</TabsTrigger>
            <TabsTrigger value="popular" className="text-[10px] gap-1"><Zap className="h-3 w-3" />Popular</TabsTrigger>
            <TabsTrigger value="new" className="text-[10px] gap-1"><Clock className="h-3 w-3" />New</TabsTrigger>
            <TabsTrigger value="rising" className="text-[10px] gap-1"><TrendingUp className="h-3 w-3" />Rising</TabsTrigger>
          </TabsList>
          <div className="overflow-y-auto max-h-[calc(75vh-120px)]">
            <TabsContent value="trending"><TrackList items={trending} /></TabsContent>
            <TabsContent value="popular"><TrackList items={popular} /></TabsContent>
            <TabsContent value="new"><TrackList items={newest} /></TabsContent>
            <TabsContent value="rising"><TrackList items={rising} /></TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
