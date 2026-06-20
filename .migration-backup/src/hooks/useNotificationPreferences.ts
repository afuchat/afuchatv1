import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  email_enabled: boolean;
  email_messages: boolean;
  email_likes: boolean;
  email_follows: boolean;
  email_gifts: boolean;
  email_mentions: boolean;
  email_replies: boolean;
  email_digest_frequency: 'instant' | 'daily' | 'weekly' | 'never';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaultPreferences: NotificationPreferences = {
  email_enabled: true,
  email_messages: true,
  email_likes: true,
  email_follows: true,
  email_gifts: true,
  email_mentions: true,
  email_replies: true,
  email_digest_frequency: 'instant',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '08:00:00',
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          ...defaultPreferences,
          ...data,
          email_digest_frequency: data.email_digest_frequency as 'instant' | 'daily' | 'weekly' | 'never',
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id,
          ...preferences,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...updates }));
      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { success: false, error };
    }
  };

  const isInQuietHours = () => {
    if (!preferences.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const start = preferences.quiet_hours_start?.slice(0, 5);
    const end = preferences.quiet_hours_end?.slice(0, 5);

    if (!start || !end) return false;

    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  };

  const shouldSendNotification = (type: string, channel: 'email') => {
    if (channel === 'email' && !preferences.email_enabled) return false;
    if (isInQuietHours()) return false;

    const prefKey = `${channel}_${type}` as keyof NotificationPreferences;
    return preferences[prefKey] !== false;
  };

  return {
    preferences,
    loading,
    updatePreferences,
    isInQuietHours,
    shouldSendNotification,
    reload: loadPreferences,
  };
};
