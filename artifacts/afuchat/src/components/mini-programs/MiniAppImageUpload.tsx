import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MiniAppImageUploadProps {
  type: 'icon' | 'screenshot';
  currentImage?: string;
  onUploadComplete: (url: string) => void;
  className?: string;
}

export const MiniAppImageUpload = ({ 
  type,
  currentImage, 
  onUploadComplete,
  className = ''
}: MiniAppImageUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      if (!user) {
        toast.error('Please sign in to upload images');
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5242880) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('mini-programs')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('mini-programs')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete('');
  };

  const isIcon = type === 'icon';
  const containerClass = isIcon 
    ? 'w-24 h-24 rounded-2xl' 
    : 'w-full h-40 rounded-xl';

  return (
    <div className={`relative ${className}`}>
      {preview ? (
        <div className={`relative ${containerClass} overflow-hidden border border-border`}>
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center ${containerClass} border-2 border-dashed border-border cursor-pointer hover:bg-accent/50 transition-colors`}>
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              {isIcon ? (
                <ImageIcon className="h-6 w-6 mb-1 text-muted-foreground" />
              ) : (
                <Upload className="h-6 w-6 mb-1 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground text-center px-2">
                {isIcon ? 'Upload Icon' : 'Upload Screenshot'}
              </span>
              {isIcon && (
                <span className="text-[10px] text-muted-foreground mt-0.5">512x512</span>
              )}
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
};
