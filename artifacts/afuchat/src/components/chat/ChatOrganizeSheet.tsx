import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Folder,
  Tag,
  Star,
  Pin,
  Archive,
  X,
} from 'lucide-react';

interface ChatOrganizeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
}

interface FolderType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface LabelType {
  id: string;
  name: string;
  color: string;
}

export const ChatOrganizeSheet = ({ isOpen, onClose, chatId, chatName }: ChatOrganizeSheetProps) => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [assignedFolders, setAssignedFolders] = useState<string[]>([]);
  const [assignedLabels, setAssignedLabels] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user, chatId]);

  const loadData = async () => {
    if (!user) return;

    // Load folders
    const { data: foldersData } = await supabase
      .from('chat_folders')
      .select('*')
      .eq('user_id', user.id);

    // Load labels
    const { data: labelsData } = await supabase
      .from('chat_labels')
      .select('*')
      .eq('user_id', user.id);

    // Load chat status
    const { data: chatData } = await supabase
      .from('chats')
      .select('is_pinned, is_favorite, is_archived')
      .eq('id', chatId)
      .single();

    // Load folder assignments
    const { data: folderAssignments } = await supabase
      .from('chat_folder_assignments')
      .select('folder_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    // Load label assignments
    const { data: labelAssignments } = await supabase
      .from('chat_label_assignments')
      .select('label_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    setFolders(foldersData || []);
    setLabels(labelsData || []);
    setIsPinned(chatData?.is_pinned || false);
    setIsFavorite(chatData?.is_favorite || false);
    setIsArchived(chatData?.is_archived || false);
    setAssignedFolders(folderAssignments?.map(a => a.folder_id) || []);
    setAssignedLabels(labelAssignments?.map(a => a.label_id) || []);
  };

  const toggleChatStatus = async (field: 'is_pinned' | 'is_favorite' | 'is_archived') => {
    setLoading(true);
    try {
      const newValue = field === 'is_pinned' ? !isPinned : field === 'is_favorite' ? !isFavorite : !isArchived;
      
      const { error } = await supabase
        .from('chats')
        .update({
          [field]: newValue,
          ...(field === 'is_archived' && { archived_at: newValue ? new Date().toISOString() : null }),
        })
        .eq('id', chatId);

      if (error) throw error;

      if (field === 'is_pinned') setIsPinned(newValue);
      if (field === 'is_favorite') setIsFavorite(newValue);
      if (field === 'is_archived') setIsArchived(newValue);

      toast.success(`Chat ${newValue ? 'added to' : 'removed from'} ${field.replace('is_', '')}`);
    } catch (error) {
      console.error('Error updating chat:', error);
      toast.error('Failed to update chat');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = async (folderId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const isAssigned = assignedFolders.includes(folderId);

      if (isAssigned) {
        const { error } = await supabase
          .from('chat_folder_assignments')
          .delete()
          .eq('chat_id', chatId)
          .eq('folder_id', folderId)
          .eq('user_id', user.id);

        if (error) throw error;
        setAssignedFolders(prev => prev.filter(id => id !== folderId));
      } else {
        const { error } = await supabase
          .from('chat_folder_assignments')
          .insert({
            chat_id: chatId,
            folder_id: folderId,
            user_id: user.id,
          });

        if (error) throw error;
        setAssignedFolders(prev => [...prev, folderId]);
      }

      toast.success(isAssigned ? 'Removed from folder' : 'Added to folder');
    } catch (error) {
      console.error('Error toggling folder:', error);
      toast.error('Failed to update folder');
    } finally {
      setLoading(false);
    }
  };

  const toggleLabel = async (labelId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const isAssigned = assignedLabels.includes(labelId);

      if (isAssigned) {
        const { error } = await supabase
          .from('chat_label_assignments')
          .delete()
          .eq('chat_id', chatId)
          .eq('label_id', labelId)
          .eq('user_id', user.id);

        if (error) throw error;
        setAssignedLabels(prev => prev.filter(id => id !== labelId));
      } else {
        const { error } = await supabase
          .from('chat_label_assignments')
          .insert({
            chat_id: chatId,
            label_id: labelId,
            user_id: user.id,
          });

        if (error) throw error;
        setAssignedLabels(prev => [...prev, labelId]);
      }

      toast.success(isAssigned ? 'Label removed' : 'Label added');
    } catch (error) {
      console.error('Error toggling label:', error);
      toast.error('Failed to update label');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[440px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Organize Chat</SheetTitle>
          <SheetDescription className="truncate">{chatName}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] px-6">
          <div className="space-y-6 pb-6">
            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={isPinned ? 'default' : 'outline'}
                  onClick={() => toggleChatStatus('is_pinned')}
                  disabled={loading}
                  className="flex-col h-auto py-3"
                >
                  <Pin className="h-5 w-5 mb-1" />
                  <span className="text-xs">Pin</span>
                </Button>
                <Button
                  variant={isFavorite ? 'default' : 'outline'}
                  onClick={() => toggleChatStatus('is_favorite')}
                  disabled={loading}
                  className="flex-col h-auto py-3"
                >
                  <Star className="h-5 w-5 mb-1" />
                  <span className="text-xs">Favorite</span>
                </Button>
                <Button
                  variant={isArchived ? 'default' : 'outline'}
                  onClick={() => toggleChatStatus('is_archived')}
                  disabled={loading}
                  className="flex-col h-auto py-3"
                >
                  <Archive className="h-5 w-5 mb-1" />
                  <span className="text-xs">Archive</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Folders */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Folders
              </h3>
              {folders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No folders yet. Create one from chat settings.
                </p>
              ) : (
                <div className="space-y-2">
                  {folders.map((folder) => {
                    const isAssigned = assignedFolders.includes(folder.id);
                    return (
                      <button
                        key={folder.id}
                        onClick={() => toggleFolder(folder.id)}
                        disabled={loading}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          isAssigned
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{folder.icon}</span>
                          <span className="font-medium text-sm">{folder.name}</span>
                        </div>
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Labels */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Labels
              </h3>
              {labels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No labels yet. Create one from chat settings.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => {
                    const isAssigned = assignedLabels.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        disabled={loading}
                      >
                        <Badge
                          style={{
                            backgroundColor: isAssigned ? label.color : 'transparent',
                            color: isAssigned ? 'white' : label.color,
                            borderColor: label.color,
                          }}
                          className="border-2 cursor-pointer hover:scale-105 transition-transform"
                        >
                          {label.name}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};