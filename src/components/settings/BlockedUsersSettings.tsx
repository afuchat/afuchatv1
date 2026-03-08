import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserX, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsSection, SettingsInfoBox } from './SettingsUI';
import { cn } from '@/lib/utils';

interface BlockedUser {
  id: string;
  blocked_id: string;
  blocked_at: string;
  profiles: { display_name: string; handle: string; avatar_url: string | null; };
}

export const BlockedUsersSettings = () => {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);

  useEffect(() => { if (user) fetchBlockedUsers(); }, [user]);

  const fetchBlockedUsers = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`id, blocked_id, blocked_at, blocked_profile:profiles!blocked_users_blocked_id_fkey (display_name, handle, avatar_url)`)
        .eq('blocker_id', user.id)
        .order('blocked_at', { ascending: false });
      if (error) throw error;
      const transformedData = (data || []).map(item => ({ ...item, profiles: item.blocked_profile }));
      setBlockedUsers(transformedData as any);
    } catch (error) {
      toast.error('Failed to load blocked users');
    } finally { setIsLoading(false); }
  };

  const handleUnblock = async () => {
    if (!selectedUser) return;
    setUnblockingUserId(selectedUser.blocked_id);
    try {
      const { error } = await supabase.from('blocked_users').delete().eq('id', selectedUser.id);
      if (error) throw error;
      setBlockedUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      toast.success('User unblocked');
    } catch (error) { toast.error('Failed to unblock user'); }
    finally { setUnblockingUserId(null); setShowUnblockConfirm(false); setSelectedUser(null); }
  };

  const filteredUsers = blockedUsers.filter(bu =>
    bu.profiles.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bu.profiles.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-0">
      <SettingsSection>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Blocked users can't message you, view your posts, or interact with you.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search blocked users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <UserX className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No results found' : "You haven't blocked anyone"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((blockedUser, idx) => (
                <div
                  key={blockedUser.id}
                  className={cn(
                    "flex items-center gap-3 py-3 px-1",
                    idx < filteredUsers.length - 1 && "border-b border-border/40"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={blockedUser.profiles.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-xs">
                      {blockedUser.profiles.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{blockedUser.profiles.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{blockedUser.profiles.handle}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => { setSelectedUser(blockedUser); setShowUnblockConfirm(true); }}
                    disabled={unblockingUserId === blockedUser.blocked_id}
                  >
                    {unblockingUserId === blockedUser.blocked_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Unblock'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="About Blocking">
        <div className="p-4 space-y-2 text-sm text-muted-foreground">
          {[
            "They can't see your posts or profile",
            "They can't send you messages or requests",
            "They can't see your comments or replies",
            "You won't see their posts or activity",
            "Existing conversations will be hidden",
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              <p>{text}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      <AlertDialog open={showUnblockConfirm} onOpenChange={setShowUnblockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {selectedUser?.profiles.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be able to see your posts, send you messages, and interact with you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>Unblock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
