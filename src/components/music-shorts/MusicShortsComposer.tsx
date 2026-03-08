import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Music, Palette, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  genre: string;
  usage_count: number;
}

const BACKGROUND_STYLES = [
  { id: 'gradient', label: 'Gradient', icon: '🌈' },
  { id: 'particles', label: 'Particles', icon: '✨' },
  { id: 'solid', label: 'Solid', icon: '🎨' },
  { id: 'news', label: 'News', icon: '📰' },
];

const GRADIENT_OPTIONS = [
  { idx: 0, colors: ['#667eea', '#764ba2'] },
  { idx: 1, colors: ['#f093fb', '#f5576c'] },
  { idx: 2, colors: ['#4facfe', '#00f2fe'] },
  { idx: 3, colors: ['#43e97b', '#38f9d7'] },
  { idx: 4, colors: ['#fa709a', '#fee140'] },
  { idx: 5, colors: ['#a18cd1', '#fbc2eb'] },
  { idx: 6, colors: ['#fccb90', '#d57eeb'] },
  { idx: 7, colors: ['#e0c3fc', '#8ec5fc'] },
];

const SOLID_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483', '#2b2d42', '#1b4332', '#312244'];

export const MusicShortsComposer = ({
  isOpen,
  onClose,
  preselectedTrackId,
}: {
  isOpen: boolean;
  onClose: () => void;
  preselectedTrackId?: string;
}) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(preselectedTrackId || null);
  const [bgStyle, setBgStyle] = useState('gradient');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [solidColor, setSolidColor] = useState('#1a1a2e');
  const [creating, setCreating] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioEl] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);

  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from('music_tracks')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setTracks(data as any);
      });
  }, [isOpen]);

  useEffect(() => {
    if (preselectedTrackId) setSelectedTrack(preselectedTrackId);
  }, [preselectedTrackId]);

  const togglePreview = (track: MusicTrack) => {
    if (!audioEl) return;
    if (playingTrack === track.id) {
      audioEl.pause();
      setPlayingTrack(null);
    } else {
      audioEl.src = track.audio_url;
      audioEl.play().catch(() => {});
      setPlayingTrack(track.id);
      setTimeout(() => {
        audioEl.pause();
        setPlayingTrack(null);
      }, 6000);
    }
  };

  const handleCreate = async () => {
    if (!user || !text.trim()) return;
    if (!selectedTrack) { toast.error('Select a music track'); return; }

    setCreating(true);
    const bgConfig: any = {};
    if (bgStyle === 'gradient') bgConfig.gradientIndex = gradientIdx;
    if (bgStyle === 'solid') bgConfig.color = solidColor;

    const { error } = await supabase.from('music_shorts').insert({
      user_id: user.id,
      text_content: text.trim(),
      music_track_id: selectedTrack,
      background_style: bgStyle,
      background_config: bgConfig,
    });

    if (error) {
      toast.error('Failed to create short');
    } else {
      toast.success('Music Short created!');
      setText('');
      setSelectedTrack(null);
      onClose();
    }
    setCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Create Music Short
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text input */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Your message ({text.length}/120)
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 120))}
              placeholder="Type your message..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Background style */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Background</Label>
            <div className="flex gap-2">
              {BACKGROUND_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setBgStyle(s.id)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                    bgStyle === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {bgStyle === 'gradient' && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {GRADIENT_OPTIONS.map((g) => (
                  <button
                    key={g.idx}
                    onClick={() => setGradientIdx(g.idx)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      gradientIdx === g.idx ? "border-primary scale-110" : "border-transparent"
                    )}
                    style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}
                  />
                ))}
              </div>
            )}

            {bgStyle === 'solid' && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {SOLID_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSolidColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      solidColor === c ? "border-primary scale-110" : "border-transparent"
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Music selection */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
              <Music className="h-3 w-3" /> Select Music
            </Label>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(track.id);
                    togglePreview(track);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all text-sm",
                    selectedTrack === track.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    playingTrack === track.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Music className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{track.title}</p>
                    <p className="text-[10px] text-muted-foreground">{track.artist} • {track.genre}</p>
                  </div>
                  {selectedTrack === track.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={creating || !text.trim() || !selectedTrack}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create Music Short'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
