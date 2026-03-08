import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Image, Video, X, Upload, Sparkles, Clock, Camera, ArrowLeft, Crown } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateStoryDialog = ({ open, onOpenChange, onSuccess }: CreateStoryDialogProps) => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Check daily story limit for non-premium users
  useEffect(() => {
    if (!open || !user) return;
    
    const checkDailyLimit = async () => {
      if (isPremium) {
        setDailyLimitReached(false);
        setCheckingLimit(false);
        return;
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count, error } = await supabase
          .from('stories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString());

        if (error) throw error;
        setDailyLimitReached((count || 0) >= 1);
      } catch (error) {
        console.error('Error checking daily limit:', error);
      } finally {
        setCheckingLimit(false);
      }
    };

    setCheckingLimit(true);
    checkDailyLimit();
  }, [open, user, isPremium]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (type === 'image' && !isImage) {
      toast.error('Please select an image file');
      return;
    }
    if (type === 'video' && !isVideo) {
      toast.error('Please select a video file');
      return;
    }

    setMediaType(type);

    if (isImage) {
      try {
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type,
          lastModified: Date.now()
        });
        setMediaFile(compressedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        setMediaFile(file);
      }
    } else {
      setMediaFile(file);
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!user || !mediaFile) {
      toast.error('Please select a file');
      return;
    }

    if (dailyLimitReached && !isPremium) {
      toast.error('Free users can only post 1 story per day. Upgrade to Premium for unlimited stories!');
      return;
    }

    setUploading(true);

    try {
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: mediaType,
          caption: caption.trim() || null,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) throw insertError;

      toast.success('Story posted!');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setCaption('');
    setMediaFile(null);
    setMediaPreview(null);
    setDailyLimitReached(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  // Full-page content for mobile / telegram
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-full bg-background"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <button onClick={handleClose} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-base font-bold text-foreground">New Story</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Daily Limit Banner for non-premium */}
        {!checkingLimit && dailyLimitReached && !isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-4 rounded-2xl bg-accent/10 border border-accent/20"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Daily limit reached</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Free users can post 1 story per day. Upgrade to Premium for unlimited stories.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Media Selection */}
        <div className="px-4 pt-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleFileSelect(e, 'video')}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {mediaPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative aspect-[9/16] max-h-[55vh] mx-auto rounded-2xl overflow-hidden bg-muted"
              >
                {mediaType === 'image' ? (
                  <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <video src={mediaPreview} className="w-full h-full object-cover" controls playsInline />
                )}

                {/* Overlay controls */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview(null);
                    }}
                    className="h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Story timer badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-[11px] text-white/80 font-medium">Visible for 24 hours</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="picker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Photo Option */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={dailyLimitReached && !isPremium}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/60 hover:bg-muted/40 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Photo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Share a moment with an image</p>
                  </div>
                </button>

                {/* Video Option */}
                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={dailyLimitReached && !isPremium}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/60 hover:bg-muted/40 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <div className="h-14 w-14 rounded-2xl bg-secondary/40 flex items-center justify-center shrink-0">
                    <Video className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Video</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Record or upload a short clip</p>
                  </div>
                </button>

                {/* Info */}
                <div className="flex items-center gap-2 px-1 pt-2">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <p className="text-[11px] text-muted-foreground/60">
                    Stories disappear after 24 hours
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Caption */}
        {mediaPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="px-4 pt-4 pb-2"
          >
            <Textarea
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              maxLength={200}
              className="resize-none bg-muted/30 border-border/40 rounded-xl text-sm"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">
              {caption.length}/200
            </p>
          </motion.div>
        )}
      </div>

      {/* Bottom Action */}
      {mediaPreview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 border-t border-border/40 shrink-0"
        >
          <Button
            className="w-full h-12 rounded-xl text-sm font-semibold"
            onClick={handleUpload}
            disabled={!mediaFile || uploading || (dailyLimitReached && !isPremium)}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4 animate-bounce" />
                Posting...
              </span>
            ) : (
              'Share Story'
            )}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );

  // On mobile/telegram, render as full-page overlay
  // On desktop, render inside a dialog
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden h-[85vh] max-h-[700px]">
        {content}
      </DialogContent>
    </Dialog>
  );
};
