import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Folder, Plus, Trash2, Edit2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FolderType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ManageFoldersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📋', '📌', '💼', '🏠', '⭐', '🎯', '🔖'];
const FOLDER_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#06b6d4'];

export const ManageFoldersDialog = ({ isOpen, onClose }: ManageFoldersDialogProps) => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadFolders();
    }
  }, [isOpen, user]);

  const loadFolders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading folders:', error);
      return;
    }

    setFolders(data || []);
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_folders')
        .insert({
          user_id: user.id,
          name: newFolderName.trim(),
          color: selectedColor,
          icon: selectedIcon,
        });

      if (error) throw error;

      toast.success('Folder created');
      setNewFolderName('');
      setSelectedIcon('📁');
      setSelectedColor('#3b82f6');
      loadFolders();
    } catch (error: any) {
      console.error('Error creating folder:', error);
      if (error.code === '23505') {
        toast.error('Folder name already exists');
      } else {
        toast.error('Failed to create folder');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast.success('Folder deleted');
      loadFolders();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            Manage Folders
          </DialogTitle>
          <DialogDescription>
            Organize your chats into folders for better management
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Folder */}
          <div className="space-y-4 p-4 rounded-xl border bg-card">
            <Label>Create New Folder</Label>
            
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleCreateFolder();
                }
              }}
            />

            <div className="space-y-2">
              <Label className="text-xs">Icon</Label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`text-2xl p-2 rounded-lg border-2 transition-all hover:scale-110 ${
                      selectedIcon === icon
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`h-10 w-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      selectedColor === color
                        ? 'border-foreground shadow-lg'
                        : 'border-border hover:border-foreground/50'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreateFolder}
              disabled={loading || !newFolderName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </div>

          {/* Existing Folders */}
          <div className="space-y-2">
            <Label>Your Folders ({folders.length})</Label>
            <ScrollArea className="h-[200px] rounded-lg border">
              <div className="p-4 space-y-2">
                {folders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No folders yet. Create one to get started!
                  </p>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{folder.icon}</span>
                        <div>
                          <p className="font-medium">{folder.name}</p>
                          <div
                            className="h-2 w-12 rounded-full mt-1"
                            style={{ backgroundColor: folder.color }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFolder(folder.id)}
                        disabled={loading}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Button onClick={onClose} variant="outline" className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};
