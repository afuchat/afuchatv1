import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Users, Lock, Globe } from 'lucide-react';

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const CreateGroupDialog = ({ isOpen, onClose, onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: groupName.trim(),
          is_group: true,
          is_private: isPrivate,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (chatError) throw chatError;

      const { error: memberError } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chat.id,
          user_id: user.id,
          is_admin: true,
        });

      if (memberError) throw memberError;

      toast.success('Group created successfully');
      onGroupCreated(chat.id);
      setGroupName('');
      setIsPrivate(false);
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Create Group
          </DialogTitle>
          <DialogDescription>
            Create a new group chat to communicate with multiple people
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleCreateGroup();
                }
              }}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div className="flex items-center gap-3">
              {isPrivate ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Globe className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{isPrivate ? 'Private Group' : 'Public Group'}</p>
                <p className="text-xs text-muted-foreground">
                  {isPrivate ? 'Only invited members can join' : 'Anyone can find and join'}
                </p>
              </div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} className="flex-1" disabled={loading || !groupName.trim()}>
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
