import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, UserPlus, Check, LogOut, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { AddAccountSheet } from '@/components/AddAccountSheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface LinkedAccount {
  id: string;
  linked_user_id: string;
  profile: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
  } | null;
}

interface CurrentProfile {
  display_name: string;
  handle: string;
  avatar_url: string | null;
}

export const DesktopAccountSwitcher = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [switching, setSwitching] = useState(false);

  const fetchCurrentProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, handle, avatar_url')
      .eq('id', user.id)
      .single();
    if (data) setCurrentProfile(data);
  }, [user]);

  const fetchLinkedAccounts = useCallback(async () => {
    if (!user) return;

    const { data: asPrimary } = await supabase
      .from('linked_accounts')
      .select('id, linked_user_id')
      .eq('primary_user_id', user.id);

    const { data: asLinked } = await supabase
      .from('linked_accounts')
      .select('id, primary_user_id')
      .eq('linked_user_id', user.id);

    const allLinkedUserIds = new Set<string>();
    asPrimary?.forEach(d => allLinkedUserIds.add(d.linked_user_id));
    asLinked?.forEach(d => allLinkedUserIds.add(d.primary_user_id));

    if (allLinkedUserIds.size > 0) {
      const linkedUserIdsArray = Array.from(allLinkedUserIds);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .in('id', linkedUserIdsArray);

      setLinkedAccounts(
        linkedUserIdsArray.map(linkedUserId => ({
          id: linkedUserId,
          linked_user_id: linkedUserId,
          profile: profiles?.find(p => p.id === linkedUserId) || null,
        }))
      );
    } else {
      setLinkedAccounts([]);
    }
  }, [user]);

  useEffect(() => {
    if (user && open) {
      fetchCurrentProfile();
      fetchLinkedAccounts();
    }
  }, [user, open, fetchCurrentProfile, fetchLinkedAccounts]);

  const handleSwitchAccount = async (linkedUserId: string) => {
    if (switching) return;
    setSwitching(true);

    try {
      const storedSessions = JSON.parse(localStorage.getItem('afuchat_linked_sessions') || '{}');
      const linkedSession = storedSessions[linkedUserId];

      if (!linkedSession?.refresh_token) {
        toast.error('Session expired. Please re-link this account.');
        setSwitching(false);
        return;
      }

      // Store current session before switching
      if (user) {
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
          storedSessions[user.id] = {
            access_token: currentSession.session.access_token,
            refresh_token: currentSession.session.refresh_token,
          };
          localStorage.setItem('afuchat_linked_sessions', JSON.stringify(storedSessions));
        }
      }

      const { error } = await supabase.auth.setSession({
        access_token: linkedSession.access_token,
        refresh_token: linkedSession.refresh_token,
      });

      if (error) {
        toast.error('Failed to switch account. Please re-link.');
        setSwitching(false);
        return;
      }

      toast.success('Switched account!');
      setOpen(false);
      window.location.href = '/home';
    } catch {
      toast.error('Failed to switch account');
      setSwitching(false);
    }
  };

  const handleUnlinkAccount = async (linkedUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase
        .from('linked_accounts')
        .delete()
        .or(`and(primary_user_id.eq.${user?.id},linked_user_id.eq.${linkedUserId}),and(primary_user_id.eq.${linkedUserId},linked_user_id.eq.${user?.id})`);

      const storedSessions = JSON.parse(localStorage.getItem('afuchat_linked_sessions') || '{}');
      delete storedSessions[linkedUserId];
      localStorage.setItem('afuchat_linked_sessions', JSON.stringify(storedSessions));

      toast.success('Account unlinked');
      fetchLinkedAccounts();
    } catch {
      toast.error('Failed to unlink account');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (!user) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            {currentProfile?.avatar_url ? (
              <Avatar className="h-8 w-8 border border-border/50">
                <AvatarImage src={currentProfile.avatar_url} alt={currentProfile.display_name} />
                <AvatarFallback className="text-xs">
                  {currentProfile.display_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-5 w-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
          {/* Current Account */}
          <div className="p-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Current Account
            </p>
            <button
              onClick={() => { navigate(`/${user.id}`); setOpen(false); }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={currentProfile?.avatar_url || ''} alt={currentProfile?.display_name} />
                <AvatarFallback>{currentProfile?.display_name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm truncate">{currentProfile?.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{currentProfile?.handle}</p>
              </div>
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            </button>
          </div>

          {/* Linked Accounts */}
          {linkedAccounts.length > 0 && (
            <>
              <Separator />
              <div className="p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Switch Account
                </p>
                <div className="space-y-1">
                  {linkedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => handleSwitchAccount(account.linked_user_id)}
                    >
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={account.profile?.avatar_url || ''} alt={account.profile?.display_name} />
                        <AvatarFallback className="text-xs">
                          {account.profile?.display_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-sm truncate">{account.profile?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{account.profile?.handle || 'user'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleUnlinkAccount(account.linked_user_id, e)}
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => { setAddAccountOpen(true); setOpen(false); }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium"
            >
              <UserPlus className="h-4 w-4 text-primary" />
              Add Account
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <AddAccountSheet
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        onSuccess={fetchLinkedAccounts}
      />
    </>
  );
};
