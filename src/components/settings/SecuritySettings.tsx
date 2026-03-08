import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Shield, Eye, EyeOff, UserX, Clock, Users, MessageCircle, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { Button } from '@/components/ui/button';
import { SettingsSection, SettingsRow, SettingsInfoBox } from './SettingsUI';

export const SecuritySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [hideFollowingList, setHideFollowingList] = useState(false);
  const [hideFollowersList, setHideFollowersList] = useState(false);
  const [telegramLinkCode, setTelegramLinkCode] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (user) { fetchPrivacySettings(); checkTelegramLink(); }
  }, [user]);

  const fetchPrivacySettings = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('is_private, show_online_status, show_read_receipts, hide_following_list, hide_followers_list').eq('id', user.id).single();
    if (data) {
      setPrivateAccount(data.is_private || false);
      setShowOnlineStatus(data.show_online_status ?? true);
      setShowReadReceipts(data.show_read_receipts ?? true);
      setHideFollowingList(data.hide_following_list || false);
      setHideFollowersList(data.hide_followers_list || false);
    }
  };

  const checkTelegramLink = async () => {
    if (!user) return;
    const { data } = await supabase.from('telegram_users').select('is_linked, telegram_username, link_token, link_token_expires_at').eq('user_id', user.id).single();
    if (data) {
      setTelegramLinked(data.is_linked || false);
      if (data.link_token && data.link_token_expires_at) {
        const expiresAt = new Date(data.link_token_expires_at);
        if (expiresAt > new Date()) setTelegramLinkCode(data.link_token);
      }
    }
  };

  const generateTelegramLinkCode = async () => {
    if (!user) return;
    setGeneratingCode(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      const { data: existing } = await supabase.from('telegram_users').select('id').eq('user_id', user.id).single();
      if (existing) {
        await supabase.from('telegram_users').update({ link_token: code, link_token_expires_at: expiresAt.toISOString() }).eq('user_id', user.id);
      } else {
        const placeholderId = -Math.floor(Math.random() * 1000000000);
        await supabase.from('telegram_users').insert({ telegram_id: placeholderId, user_id: user.id, link_token: code, link_token_expires_at: expiresAt.toISOString(), is_linked: false });
      }
      setTelegramLinkCode(code);
      toast.success('Link code generated! Valid for 10 minutes.');
    } catch (error) { toast.error('Failed to generate code'); }
    finally { setGeneratingCode(false); }
  };

  const copyCodeToClipboard = () => {
    if (telegramLinkCode) { navigator.clipboard.writeText(telegramLinkCode); toast.success('Code copied!'); }
  };

  const unlinkTelegram = async () => {
    if (!user) return;
    try {
      await supabase.from('telegram_users').update({ is_linked: false, telegram_id: null, telegram_username: null }).eq('user_id', user.id);
      setTelegramLinked(false); setTelegramLinkCode(null);
      toast.success('Telegram unlinked');
    } catch (error) { toast.error('Failed to unlink Telegram'); }
  };

  const handlePrivacyToggle = async (field: string, value: boolean) => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({ [field]: value }).eq('id', user.id);
      toast.success('Settings updated');
    } catch (error) { toast.error('Failed to update settings'); }
  };

  return (
    <div className="space-y-0">
      <SettingsSection title="Account Security">
        <SettingsRow icon={Lock} iconColor="bg-primary" label="Change Password" description="Update your account password" onClick={() => navigate('/change-password')} chevron />
        <SettingsRow icon={Clock} iconColor="bg-primary/80" label="Active Sessions" description="Manage your active login sessions" onClick={() => navigate('/security')} chevron isLast />
      </SettingsSection>

      <SettingsSection title="Telegram Integration">
        {telegramLinked ? (
          <div className="p-4 space-y-3">
            <SettingsInfoBox variant="success" icon={MessageCircle}>
              <p className="font-semibold">Telegram Linked</p>
              <p className="text-xs mt-0.5 opacity-80">Your Telegram is connected to AfuChat</p>
            </SettingsInfoBox>
            <Button variant="outline" size="sm" onClick={unlinkTelegram} className="w-full text-destructive border-destructive/30 hover:bg-destructive/10">
              Unlink Telegram
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect Telegram to access AfuChat from the bot. Generate a code and enter it in <strong>@AfuChatBot</strong>.
            </p>
            {telegramLinkCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border/50">
                  <code className="text-2xl font-mono font-bold tracking-[0.3em] flex-1 text-center">{telegramLinkCode}</code>
                  <Button size="icon-sm" variant="ghost" onClick={copyCodeToClipboard}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">Expires in 10 minutes</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={generateTelegramLinkCode} disabled={generatingCode}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generatingCode ? 'animate-spin' : ''}`} />New Code
                  </Button>
                  <Button size="sm" onClick={() => window.open('https://t.me/AfuChatBot', '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open Bot
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={generateTelegramLinkCode} disabled={generatingCode} className="w-full" size="sm">
                {generatingCode ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating...</> : 'Generate Link Code'}
              </Button>
            )}
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Privacy Controls">
        <SettingsRow icon={UserX} iconColor="bg-destructive" label="Private Account" description="Hide your profile content from other users"
          toggle checked={privateAccount} onCheckedChange={(c) => { setPrivateAccount(c); handlePrivacyToggle('is_private', c); }} />
        <SettingsRow icon={Eye} iconColor="bg-primary" label="Show Online Status" description="Let others see when you're online"
          toggle checked={showOnlineStatus} onCheckedChange={(c) => { setShowOnlineStatus(c); handlePrivacyToggle('show_online_status', c); }} />
        <SettingsRow icon={EyeOff} iconColor="bg-primary/80" label="Read Receipts" description="Show when you've read messages"
          toggle checked={showReadReceipts} onCheckedChange={(c) => { setShowReadReceipts(c); handlePrivacyToggle('show_read_receipts', c); }} />
        <SettingsRow icon={Users} iconColor="bg-primary" label="Hide Following List" description="Hide who you follow from others"
          toggle checked={hideFollowingList} disabled={!isPremium} premium={!isPremium}
          onCheckedChange={(c) => {
            if (!isPremium) { toast.error('Premium feature', { description: 'Upgrade to Premium', action: { label: 'Upgrade', onClick: () => navigate('/premium') } }); return; }
            setHideFollowingList(c); handlePrivacyToggle('hide_following_list', c);
          }} />
        <SettingsRow icon={Users} iconColor="bg-primary/80" label="Hide Followers List" description="Hide your followers from others"
          toggle checked={hideFollowersList} onCheckedChange={(c) => { setHideFollowersList(c); handlePrivacyToggle('hide_followers_list', c); }} isLast />
      </SettingsSection>
    </div>
  );
};
