import { FileText, Download, Play, Pause, Volume2, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAttachmentUrl } from '@/hooks/useAttachmentUrl';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { toast } from 'sonner';

interface AttachmentPreviewProps {
  url: string;
  type: string;
  name: string;
  size?: number;
  isOwn?: boolean;
  onDownload?: () => void;
}

export const AttachmentPreview = ({ 
  url, 
  type, 
  name, 
  size,
  isOwn = false,
  onDownload 
}: AttachmentPreviewProps) => {
  const { url: signedUrl, loading } = useAttachmentUrl(url);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const isImage = type.startsWith('image/');
  const isGif = type === 'image/gif';
  const isAudio = type.startsWith('audio/');
  
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImageClick = () => {
    if (isImage && signedUrl) {
      setLightboxOpen(true);
    }
  };

  const toggleAudioPlay = async () => {
    if (!signedUrl) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(signedUrl);
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audioRef.current.onerror = () => {
        toast.error('Could not play audio');
        setIsPlaying(false);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        toast.error('Could not play audio');
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return <div className="w-[220px] h-[160px] bg-muted/50 rounded-lg animate-pulse" />;
  }

  if (isImage && signedUrl) {
    // For GIFs, show them without cropping and allow animation
    if (isGif) {
      return (
        <>
          <div 
            className="relative max-w-[280px] rounded-lg overflow-hidden cursor-pointer group"
            onClick={handleImageClick}
          >
            <img 
              src={signedUrl} 
              alt={name}
              className="w-full h-auto max-h-[300px] object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
          {lightboxOpen && createPortal(
            <ImageLightbox
              images={[{ url: signedUrl, alt: name }]}
              initialIndex={0}
              onClose={() => setLightboxOpen(false)}
            />,
            document.body
          )}
        </>
      );
    }
    
    // Regular images
    return (
      <>
        <div 
          className="relative w-[220px] h-[160px] rounded-lg overflow-hidden cursor-pointer group"
          onClick={handleImageClick}
        >
          <img 
            src={signedUrl} 
            alt={name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
        {lightboxOpen && createPortal(
          <ImageLightbox
            images={[{ url: signedUrl, alt: name }]}
            initialIndex={0}
            onClose={() => setLightboxOpen(false)}
          />,
          document.body
        )}
      </>
    );
  }

  // Audio file player - styled like the reference image
  if (isAudio && signedUrl) {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-muted min-w-[280px] max-w-[320px]">
        {/* Play/Pause button */}
        <button
          onClick={toggleAudioPlay}
          className="flex-shrink-0 text-foreground hover:opacity-80 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>
        
        {/* Time display */}
        <span className="text-sm text-foreground font-medium whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>
        
        {/* Progress bar */}
        <div 
          ref={progressRef}
          className="flex-1 h-1 bg-foreground/20 rounded-full cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute left-0 top-0 h-full bg-foreground rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Seek handle */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full shadow-md transition-all"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        
        {/* Volume icon */}
        <Volume2 className="h-5 w-5 text-foreground flex-shrink-0" />
        
        {/* More options / Download */}
        <button 
          onClick={onDownload}
          className="text-foreground hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isOwn ? 'bg-primary-foreground/10' : 'bg-muted'
      } max-w-[220px] cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={onDownload}
    >
      <div className={`p-2 rounded-lg ${isOwn ? 'bg-primary-foreground/20' : 'bg-background'}`}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
          {name}
        </p>
        {size && (
          <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {formatSize(size)}
          </p>
        )}
      </div>
      <Download className="h-4 w-4 flex-shrink-0 opacity-70" />
    </div>
  );
};
