import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Heart, UserPlus, Gift, AtSign, Mail, Moon, Clock, Bell, BellRing, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { SettingsSection, SettingsRow, SettingsInfoBox } from './SettingsUI';
import { Loader2 } from 'lucide-react';

export const NotificationsSettings = () => {
  const { user } = useAuth();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailMessages, setEmailMessages] = useState(true);
  const [emailLikes, setEmailLikes] = useState(true);
  const [emailFollows, setEmailFollows] = useState(true);
  const [emailGifts, setEmailGifts] = useState(true);
  const [emailMentions, setEmailMentions] = useState(true);
  const [emailReplies, setEmailReplies] = useState(true);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<string>('instant');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) toast.success('Push notifications enabled!');
    else toast.error('Permission denied. Enable in browser settings.');
  };

  useEffect(() => { if (user) loadPreferences(); }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', user!.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setEmailEnabled(data.email_enabled ?? false); setEmailMessages(data.email_messages ?? false);
        setEmailLikes(data.email_likes ?? false); setEmailFollows(data.email_follows ?? false);
        setEmailGifts(data.email_gifts ?? false); setEmailMentions(data.email_mentions ?? false);
        setEmailReplies(data.email_replies ?? false); setEmailDigestFrequency(data.email_digest_frequency ?? '');
        setQuietHoursEnabled(data.quiet_hours_enabled ?? false);
        setQuietHoursStart(data.quiet_hours_start?.slice(0, 5) || '22:00');
        setQuietHoursEnd(data.quiet_hours_end?.slice(0, 5) || '08:00');
      }
    } catch (error) { toast.error('Failed to load preferences'); }
    finally { setLoading(false); }
  };

  const updatePreferences = async (updates: any) => {
    try {
      const { error } = await supabase.from('notification_preferences').upsert({ user_id: user?.id, ...updates, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Updated');
    } catch (error) { toast.error('Failed to update'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Push Notifications */}
      <SettingsSection title="Push Notifications">
        <div className="p-4">
          {!isSupported ? (
            <SettingsInfoBox variant="default" icon={XCircle}>
              Push notifications are not supported in this browser
            </SettingsInfoBox>
          ) : permission === 'granted' ? (
            <SettingsInfoBox variant="success" icon={CheckCircle}>
              Push notifications are enabled. You'll receive alerts for messages, likes, follows, and more.
            </SettingsInfoBox>
          ) : permission === 'denied' ? (
            <SettingsInfoBox variant="destructive" icon={XCircle}>
              Push notifications are blocked. Enable them in your browser settings.
            </SettingsInfoBox>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Get instant alerts for messages, likes, follows, gifts, and mentions.
              </p>
              <Button onClick={handleEnablePush} className="w-full" size="sm">
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                Enable Push Notifications
              </Button>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Email Notifications */}
      <SettingsSection title="Email Notifications">
        <SettingsRow
          icon={Mail}
          iconColor="bg-pink-500"
          label="Email Notifications"
          description="Receive notifications via email"
          toggle
          checked={emailEnabled}
          onCheckedChange={(checked) => { setEmailEnabled(checked); updatePreferences({ email_enabled: checked }); }}
        />
        {emailEnabled && (
          <>
            <SettingsRow
              icon={MessageSquare} iconColor="bg-blue-500" label="Messages" description="New direct messages"
              toggle checked={emailMessages}
              onCheckedChange={(c) => { setEmailMessages(c); updatePreferences({ email_messages: c }); }}
            />
            <SettingsRow
              icon={Heart} iconColor="bg-red-500" label="Likes & Reactions" description="When someone likes your post"
              toggle checked={emailLikes}
              onCheckedChange={(c) => { setEmailLikes(c); updatePreferences({ email_likes: c }); }}
            />
            <SettingsRow
              icon={UserPlus} iconColor="bg-green-500" label="New Followers" description="When someone follows you"
              toggle checked={emailFollows}
              onCheckedChange={(c) => { setEmailFollows(c); updatePreferences({ email_follows: c }); }}
            />
            <SettingsRow
              icon={Gift} iconColor="bg-amber-500" label="Gifts & Tips" description="When you receive gifts or tips"
              toggle checked={emailGifts}
              onCheckedChange={(c) => { setEmailGifts(c); updatePreferences({ email_gifts: c }); }}
            />
            <SettingsRow
              icon={AtSign} iconColor="bg-violet-500" label="Mentions" description="When someone mentions you"
              toggle checked={emailMentions}
              onCheckedChange={(c) => { setEmailMentions(c); updatePreferences({ email_mentions: c }); }}
            />
            <SettingsRow
              icon={MessageSquare} iconColor="bg-indigo-500" label="Replies" description="When someone replies to your post"
              toggle checked={emailReplies}
              onCheckedChange={(c) => { setEmailReplies(c); updatePreferences({ email_replies: c }); }}
            />
            <div className="px-4 py-3.5 border-t border-border/40">
              <Label htmlFor="digest-frequency" className="text-xs font-semibold text-muted-foreground mb-2 block">
                Email Digest Frequency
              </Label>
              <Select value={emailDigestFrequency} onValueChange={(v) => { setEmailDigestFrequency(v); updatePreferences({ email_digest_frequency: v }); }}>
                <SelectTrigger id="digest-frequency" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </SettingsSection>

      {/* Quiet Hours */}
      <SettingsSection title="Quiet Hours">
        <SettingsRow
          icon={Moon} iconColor="bg-slate-600" label="Quiet Hours" description="Pause notifications during specific hours"
          toggle checked={quietHoursEnabled}
          onCheckedChange={(c) => { setQuietHoursEnabled(c); updatePreferences({ quiet_hours_enabled: c }); }}
          isLast={!quietHoursEnabled}
        />
        {quietHoursEnabled && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quiet-start" className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Start
                </Label>
                <input id="quiet-start" type="time" value={quietHoursStart}
                  onChange={(e) => { setQuietHoursStart(e.target.value); updatePreferences({ quiet_hours_start: e.target.value }); }}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
              <div>
                <Label htmlFor="quiet-end" className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> End
                </Label>
                <input id="quiet-end" type="time" value={quietHoursEnd}
                  onChange={(e) => { setQuietHoursEnd(e.target.value); updatePreferences({ quiet_hours_end: e.target.value }); }}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              No push notifications between {quietHoursStart} and {quietHoursEnd}
            </p>
          </div>
        )}
      </SettingsSection>
    </div>
  );
};
