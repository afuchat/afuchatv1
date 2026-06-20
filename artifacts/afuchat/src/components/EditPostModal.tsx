import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, X, Image as ImageIcon, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { postSchema } from '@/lib/validation';
import { ImageEditor } from '@/components/image-editor/ImageEditor';
import { useTranslation } from 'react-i18next';
import { checkContentAllowed } from '@/lib/contentModeration';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    content: string;
    image_url: string | null;
    post_images?: Array<{ image_url: string; display_order: number }>;
  };
  onPostUpdated: () => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ isOpen, onClose, post, onPostUpdated }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [content, setContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImagePreview, setEditingImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post.post_images && post.post_images.length > 0) {
      setExistingImages(post.post_images.sort((a, b) => a.display_order - b.display_order).map(img => img.image_url));
    } else if (post.image_url) {
      setExistingImages([post.image_url]);
    }
  }, [post]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (existingImages.length + selectedImages.length + files.length > 4) {
      toast.error(t('feed.maxImages'));
      return;
    }
    files.forEach(file => {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    setSelectedImages(prev => [...prev, ...files]);
  };

  const handleUpdate = async () => {
    if (!user) return;
    try { postSchema.parse(content); } catch { toast.error(t('validation.required')); return; }
    
    // Content moderation - check for blocked links
    const contentError = checkContentAllowed(content);
    if (contentError) {
      toast.error(contentError, { duration: 5000 });
      return;
    }
    
    setIsUpdating(true);
    try {
      const allImages = [...existingImages];
      if (selectedImages.length > 0) {
        for (let i = 0; i < selectedImages.length; i++) {
          const fileName = `${user.id}/${Date.now()}_${i}.${selectedImages[i].name.split('.').pop()}`;
          const { error } = await supabase.storage.from('post-images').upload(fileName, selectedImages[i]);
          if (!error) allImages.push(supabase.storage.from('post-images').getPublicUrl(fileName).data.publicUrl);
        }
      }
      await supabase.from('post_images').delete().eq('post_id', post.id);
      if (allImages.length > 0) {
        await supabase.from('post_images').insert(allImages.map((url, i) => ({ post_id: post.id, image_url: url, display_order: i })));
      }
      const { error } = await supabase.from('posts').update({ content: content.trim(), updated_at: new Date().toISOString() }).eq('id', post.id);
      if (!error) { toast.success(t('feed.postSuccess')); onPostUpdated(); onClose(); } else toast.error(t('feed.postError'));
    } catch { toast.error(t('errors.network')); } finally { setIsUpdating(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-md rounded-xl">
        <DialogHeader><DialogTitle>{t('feed.editPost')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={280} rows={4} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          {existingImages.length + selectedImages.length === 0 ? (
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="w-full">
              <ImageIcon className="h-4 w-4 mr-2" />Add Images
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {existingImages.map((url, i) => (
                <div 
                  key={`existing-${i}`} 
                  className="relative cursor-move"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', `existing-${i}`);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragId = e.dataTransfer.getData('text/html');
                    const [dragType, dragIndexStr] = dragId.split('-');
                    const dragIndex = parseInt(dragIndexStr);
                    
                    if (dragType === 'existing' && dragIndex !== i) {
                      const newImages = [...existingImages];
                      const [draggedImage] = newImages.splice(dragIndex, 1);
                      newImages.splice(i, 0, draggedImage);
                      setExistingImages(newImages);
                    }
                  }}
                >
                  <img src={url} className="w-full h-32 object-cover rounded" />
                  <div className="absolute top-1 left-1 bg-background/80 text-xs px-2 py-0.5 rounded">
                    {i + 1}
                  </div>
                  <Button onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))} variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7"><X className="h-3 w-3" /></Button>
                </div>
              ))}
              {imagePreviews.map((p, i) => (
                <div 
                  key={`new-${i}`} 
                  className="relative cursor-move"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', `new-${i}`);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragId = e.dataTransfer.getData('text/html');
                    const [dragType, dragIndexStr] = dragId.split('-');
                    const dragIndex = parseInt(dragIndexStr);
                    
                    if (dragType === 'new' && dragIndex !== i) {
                      const newPreviews = [...imagePreviews];
                      const newFiles = [...selectedImages];
                      const [draggedPreview] = newPreviews.splice(dragIndex, 1);
                      const [draggedFile] = newFiles.splice(dragIndex, 1);
                      newPreviews.splice(i, 0, draggedPreview);
                      newFiles.splice(i, 0, draggedFile);
                      setImagePreviews(newPreviews);
                      setSelectedImages(newFiles);
                    }
                  }}
                >
                  <img src={p} className="w-full h-32 object-cover rounded" />
                  <div className="absolute top-1 left-1 bg-background/80 text-xs px-2 py-0.5 rounded">
                    {existingImages.length + i + 1}
                  </div>
                  <Button onClick={() => {
                    setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
                    setSelectedImages(prev => prev.filter((_, idx) => idx !== i));
                  }} variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7"><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1"><X className="h-4 w-4 mr-2" />Cancel</Button>
            <Button onClick={handleUpdate} className="flex-1" disabled={isUpdating}><Save className="h-4 w-4 mr-2" />Update</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
