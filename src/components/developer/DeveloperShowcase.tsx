import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Github, Plus, Trash2, Eye, Star, X, ImageIcon, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ShowcaseItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  github_url: string | null;
  technologies: string[] | null;
  is_featured: boolean;
  view_count: number;
  created_at: string;
}

interface DeveloperShowcaseProps {
  userId: string;
  isOwnProfile: boolean;
  userHandle?: string;
}

export const DeveloperShowcase: React.FC<DeveloperShowcaseProps> = ({ userId, isOwnProfile, userHandle }) => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightedProjectId = searchParams.get('project');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    project_url: '',
    github_url: '',
    technologies: ''
  });

  const { data: showcaseItems, isLoading } = useQuery({
    queryKey: ['developer-showcase', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('developer_showcase')
        .select('*')
        .eq('user_id', userId)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ShowcaseItem[];
    }
  });

  // Scroll to highlighted project when loaded
  useEffect(() => {
    if (highlightedProjectId && highlightedRef.current && showcaseItems) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightedProjectId, showcaseItems]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('developer-showcase')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('developer-showcase')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleShare = async (item: ShowcaseItem) => {
    // Create unique profile link with project ID
    const handle = userHandle || userId;
    const shareUrl = `${window.location.origin}/${handle}?project=${item.id}`;
    const shareText = `Check out "${item.title}" - a project showcase!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied!');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    }
  };

  const addProjectMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      const imageUrl = await uploadImage();
      
      const { error } = await supabase.from('developer_showcase').insert({
        user_id: userId,
        title: newProject.title,
        description: newProject.description || null,
        image_url: imageUrl,
        project_url: newProject.project_url || null,
        github_url: newProject.github_url || null,
        technologies: newProject.technologies ? newProject.technologies.split(',').map(t => t.trim()) : null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer-showcase', userId] });
      setIsAddDialogOpen(false);
      setNewProject({ title: '', description: '', project_url: '', github_url: '', technologies: '' });
      clearImage();
      toast.success('Project added!');
    },
    onError: () => toast.error('Failed to add project'),
    onSettled: () => setIsUploading(false)
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('developer_showcase').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer-showcase', userId] });
      toast.success('Project removed');
    }
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ projectId, isFeatured }: { projectId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from('developer_showcase')
        .update({ is_featured: !isFeatured })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['developer-showcase', userId] })
  });

  if (isLoading) {
    return (
      <div className="mt-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hasItems = showcaseItems && showcaseItems.length > 0;

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Showcase</h3>
        {isOwnProfile && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add to Showcase</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Project title *"
                  value={newProject.title}
                  onChange={e => setNewProject(p => ({ ...p, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  value={newProject.description}
                  onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
                
                {/* Image Upload - Smaller Preview */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Image</label>
                  {imagePreview ? (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={clearImage}
                        className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                <Input
                  placeholder="Live project URL (external link)"
                  value={newProject.project_url}
                  onChange={e => setNewProject(p => ({ ...p, project_url: e.target.value }))}
                />
                <Input
                  placeholder="GitHub URL"
                  value={newProject.github_url}
                  onChange={e => setNewProject(p => ({ ...p, github_url: e.target.value }))}
                />
                <Input
                  placeholder="Technologies (comma separated)"
                  value={newProject.technologies}
                  onChange={e => setNewProject(p => ({ ...p, technologies: e.target.value }))}
                />
                <Button
                  onClick={() => addProjectMutation.mutate()}
                  disabled={!newProject.title || addProjectMutation.isPending || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : addProjectMutation.isPending ? 'Adding...' : 'Add Project'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Showcase Grid - Compact Cards */}
      {hasItems ? (
        <div className="space-y-3">
          {showcaseItems.map((item, index) => {
            const isHighlighted = item.id === highlightedProjectId;
            return (
              <motion.div
                key={item.id}
                ref={isHighlighted ? highlightedRef : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-300 ${
                  isHighlighted 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border/50 hover:border-primary/30'
                }`}
              >
                <div className="flex gap-3 p-3">
                  {/* Small Thumbnail */}
                  {item.image_url && (
                    <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.is_featured && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                        <h4 className="font-semibold text-sm text-foreground truncate">{item.title}</h4>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <Eye className="h-3 w-3" />
                        <span className="text-xs">{item.view_count}</span>
                      </div>
                    </div>
                    
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                    
                    {/* Technologies */}
                    {item.technologies && item.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.technologies.slice(0, 3).map(tech => (
                          <span
                            key={tech}
                            className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded"
                          >
                            {tech}
                          </span>
                        ))}
                        {item.technologies.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{item.technologies.length - 3}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {item.project_url && (
                        <a
                          href={item.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded-full hover:opacity-90 transition-opacity"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Live
                        </a>
                      )}
                      {item.github_url && (
                        <a
                          href={item.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] bg-secondary text-secondary-foreground px-2 py-1 rounded-full hover:opacity-90 transition-opacity"
                        >
                          <Github className="h-3 w-3" />
                          Code
                        </a>
                      )}
                      <button
                        onClick={() => handleShare(item)}
                        className="inline-flex items-center gap-1 text-[10px] bg-accent text-accent-foreground px-2 py-1 rounded-full hover:opacity-90 transition-opacity"
                      >
                        <Share2 className="h-3 w-3" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>

                {/* Owner Actions */}
                {isOwnProfile && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 bg-background/80 backdrop-blur-sm"
                      onClick={() => toggleFeatureMutation.mutate({ projectId: item.id, isFeatured: item.is_featured })}
                    >
                      <Star className={`h-3 w-3 ${item.is_featured ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive"
                      onClick={() => deleteProjectMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {isOwnProfile ? 'Add your projects to showcase your work' : 'No projects yet'}
        </div>
      )}
    </div>
  );
};

export default DeveloperShowcase;
