import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Image, Video, Upload } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateStoryDialog = ({ open, onOpenChange, onSuccess }: CreateStoryDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canCreateStories, tier } = useSubscription();
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check subscription when dialog opens
  useEffect(() => {
    if (open && !canCreateStories()) {
      toast.error('Gold or Platinum subscription required to create stories');
      onOpenChange(false);
      navigate('/premium');
    }
  }, [open, canCreateStories, navigate, onOpenChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Please select an image or video file');
      return;
    }

    setMediaType(isImage ? 'image' : 'video');

    if (isImage) {
      // Compress image
      try {
        const compressedBlob = await compressImage(file);
        // Convert Blob to File
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

    // Create preview
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

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Create story record
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

      toast.success('Story posted successfully!');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label>Media</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {mediaPreview ? (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {mediaType === 'image' ? (
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video 
                    src={mediaPreview} 
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-8 w-8" />
                  <span className="text-xs">Photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Video className="h-8 w-8" />
                  <span className="text-xs">Video</span>
                </Button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (Optional)</Label>
            <Textarea
              id="caption"
              placeholder="What's on your mind?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/200
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpload}
              disabled={!mediaFile || uploading}
            >
              {uploading ? 'Posting...' : 'Post Story'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your story will be visible for 24 hours
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
