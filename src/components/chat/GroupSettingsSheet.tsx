import { useState, useEffect, useRef } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Loader2, Users, Trash2, LogOut } from 'lucide-react';
import { UserAvatar } from '@/components/avatar/UserAvatar';

interface GroupSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  isAdmin: boolean;
}

export const GroupSettingsSheet = ({
  isOpen,
  onClose,
  chatId,
  isAdmin,
}: GroupSettingsSheetProps) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isPrivate, setIsPrivate] = useState(false);
  const [whoCanSend, setWhoCanSend] = useState<'everyone' | 'admins'>('everyone');
  const [whoCanEditInfo, setWhoCanEditInfo] = useState<'admins' | 'everyone'>('admins');
  const [maxMembers, setMaxMembers] = useState<number | null>(null);

  const originalState = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadGroupInfo();
    }
  }, [isOpen, chatId]);

  const loadGroupInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (error) throw error;

      if (data) {
        const state = {
          name: data.name || '',
          description: data.description || '',
          avatar_url: data.avatar_url,
          is_private: data.is_private || false,
          who_can_send: data.who_can_send || 'everyone',
          who_can_edit_info: data.who_can_edit_info || 'admins',
          max_members: data.max_members,
        };

        setGroupName(state.name);
        setDescription(state.description);
        setAvatarUrl(state.avatar_url);
        setIsPrivate(state.is_private);
        setWhoCanSend(state.who_can_send);
        setWhoCanEditInfo(state.who_can_edit_info);
        setMaxMembers(state.max_members);

        originalState.current = state;
      }
    } catch (error) {
      toast.error('Failed to load group information');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    const current = {
      name: groupName,
      description,
      avatar_url: avatarUrl,
      is_private: isPrivate,
      who_can_send: whoCanSend,
      who_can_edit_info: whoCanEditInfo,
      max_members: maxMembers,
    };
    return JSON.stringify(current) !== JSON.stringify(originalState.current);
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Only admins can edit settings');
      return;
    }

    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('chats')
        .update({
          name: groupName.trim(),
          description: description.trim() || null,
          avatar_url: avatarUrl,
          is_private: isPrivate,
          who_can_send: whoCanSend,
          who_can_edit_info: whoCanEditInfo,
          max_members: maxMembers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);

      if (error) throw error;

      toast.success('Settings updated');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${chatId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('group-avatars')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from('group-avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success('Avatar uploaded');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;

    await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    toast.success('You left the group');
    onClose();
  };

  const handleDeleteGroup = async () => {
    if (!isAdmin) return;

    const confirmDelete = confirm(
      'Are you sure you want to permanently delete this group?'
    );
    if (!confirmDelete) return;

    await supabase.from('chats').delete().eq('id', chatId);

    toast.success('Group deleted');
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Group Settings
          </SheetTitle>
          <SheetDescription>
            Manage your group preferences and permissions
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="px-6 py-6 space-y-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                {/* Avatar */}
                <div className="space-y-3">
                  <Label>Group Avatar</Label>
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      userId={chatId}
                      avatarUrl={avatarUrl}
                      name={groupName}
                      size={80}
                    />
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? 'Uploading...' : 'Change Avatar'}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleAvatarChange}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-3">
                  <Label>Group Name</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    disabled={!isAdmin}
                    maxLength={50}
                  />
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isAdmin}
                    maxLength={200}
                  />
                </div>

                {/* Privacy */}
                <div className="flex items-center justify-between">
                  <Label>Private Group</Label>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    disabled={!isAdmin}
                  />
                </div>

                {/* Who can send */}
                <div className="space-y-3">
                  <Label>Who can send messages</Label>
                  <Select
                    value={whoCanSend}
                    onValueChange={(v: any) => setWhoCanSend(v)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="admins">Admins only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Max members */}
                <div className="space-y-3">
                  <Label>Maximum Members</Label>
                  <Input
                    type="number"
                    value={maxMembers ?? ''}
                    onChange={(e) =>
                      setMaxMembers(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    disabled={!isAdmin}
                  />
                </div>

                {isAdmin && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteGroup}
                    className="w-full gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Group
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleLeaveGroup}
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Leave Group
                </Button>

                {isAdmin && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSave}
                      disabled={saving || !hasChanges()}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
