import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { Radio, Crown, Camera, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { UserAvatar } from '@/components/avatar/UserAvatar';

interface CreateChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (channelId: string) => void;
}

export const CreateChannelDialog = ({ isOpen, onClose, onChannelCreated }: CreateChannelDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canCreateChannels, tier } = useSubscription();
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `channel-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('group-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('group-avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success('Avatar uploaded');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!canCreateChannels()) {
      toast.error('Platinum subscription required to create channels');
      navigate('/premium');
      onClose();
      return;
    }

    if (!user || !channelName.trim()) {
      toast.error('Please enter a channel name');
      return;
    }

    setLoading(true);
    try {
      // Create channel
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: channelName.trim(),
          description: description.trim() || null,
          avatar_url: avatarUrl,
          is_group: true,
          is_channel: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chat.id,
          user_id: user.id,
          is_admin: true,
        });

      if (memberError) throw memberError;

      toast.success('Channel created successfully');
      onChannelCreated(chat.id);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating channel:', error);
      toast.error('Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setChannelName('');
    setDescription('');
    setAvatarUrl(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Create Channel
            {!canCreateChannels() && <Crown className="h-4 w-4 text-violet-500" />}
          </DialogTitle>
          <DialogDescription>
            {canCreateChannels() 
              ? 'Create a broadcast channel where only admins can post'
              : 'Platinum subscription required to create channels'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Channel Avatar */}
          <div className="flex items-center gap-4">
            <UserAvatar
              userId="new-channel"
              avatarUrl={avatarUrl}
              name={channelName || 'Channel'}
              size={64}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Add Photo
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              placeholder="Enter channel name..."
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{channelName.length}/50</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="channel-desc">Description (optional)</Label>
            <Textarea
              id="channel-desc"
              placeholder="What's this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{description.length}/200</p>
          </div>

          {/* Info about channels */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">About Channels</p>
            <ul className="space-y-1 text-xs">
              <li>• Only admins can send messages</li>
              <li>• Subscribers can only read messages</li>
              <li>• Perfect for announcements & broadcasts</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onClose(); }}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateChannel}
            className="flex-1"
            disabled={loading || !channelName.trim()}
          >
            {loading ? 'Creating...' : 'Create Channel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};