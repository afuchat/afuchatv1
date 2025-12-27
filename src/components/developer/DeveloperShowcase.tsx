import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Github, Plus, Trash2, Eye, Star } from 'lucide-react';
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
}

export const DeveloperShowcase: React.FC<DeveloperShowcaseProps> = ({ userId, isOwnProfile }) => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    image_url: '',
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

  const addProjectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('developer_showcase').insert({
        user_id: userId,
        title: newProject.title,
        description: newProject.description || null,
        image_url: newProject.image_url || null,
        project_url: newProject.project_url || null,
        github_url: newProject.github_url || null,
        technologies: newProject.technologies ? newProject.technologies.split(',').map(t => t.trim()) : null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer-showcase', userId] });
      setIsAddDialogOpen(false);
      setNewProject({ title: '', description: '', image_url: '', project_url: '', github_url: '', technologies: '' });
      toast.success('Project added to showcase!');
    },
    onError: () => toast.error('Failed to add project')
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
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hasItems = showcaseItems && showcaseItems.length > 0;

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
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
                <Input
                  placeholder="Image URL (optional)"
                  value={newProject.image_url}
                  onChange={e => setNewProject(p => ({ ...p, image_url: e.target.value }))}
                />
                <Input
                  placeholder="Live project URL"
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
                  disabled={!newProject.title || addProjectMutation.isPending}
                  className="w-full"
                >
                  {addProjectMutation.isPending ? 'Adding...' : 'Add Project'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Showcase Grid */}
      {hasItems ? (
        <div className="grid gap-3">
          {showcaseItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative rounded-xl border border-border/50 bg-card/50 overflow-hidden hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex gap-3 p-3">
                {/* Thumbnail */}
                {item.image_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {item.is_featured && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                      <h4 className="font-semibold text-sm text-foreground truncate">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span className="text-[10px]">{item.view_count}</span>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                  )}
                  
                  {/* Technologies */}
                  {item.technologies && item.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.technologies.slice(0, 3).map(tech => (
                        <span
                          key={tech}
                          className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-md"
                        >
                          {tech}
                        </span>
                      ))}
                      {item.technologies.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{item.technologies.length - 3}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Links */}
                  <div className="flex items-center gap-2 mt-2">
                    {item.project_url && (
                      <a
                        href={item.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
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
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        <Github className="h-3 w-3" />
                        Code
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Owner Actions */}
              {isOwnProfile && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleFeatureMutation.mutate({ projectId: item.id, isFeatured: item.is_featured })}
                  >
                    <Star className={`h-3 w-3 ${item.is_featured ? 'text-amber-400 fill-amber-400' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => deleteProjectMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          {isOwnProfile ? 'Add your projects to showcase your work' : 'No projects yet'}
        </div>
      )}
    </div>
  );
};

export default DeveloperShowcase;
