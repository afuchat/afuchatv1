import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatPreferences {
  bubbleStyle: string;
  fontSize: number;
  soundsEnabled: boolean;
  autoDownload: boolean;
  mediaQuality: string;
  chatLock: boolean;
  readReceipts: boolean;
}

const DEFAULT_PREFERENCES: ChatPreferences = {
  bubbleStyle: 'rounded',
  fontSize: 16,
  soundsEnabled: true,
  autoDownload: true,
  mediaQuality: 'high',
  chatLock: false,
  readReceipts: true,
};

export const useChatPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ChatPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      // Load from cache first
      const cached = sessionStorage.getItem(`chatPrefs_${user.id}`);
      if (cached) {
        try {
          setPreferences(JSON.parse(cached));
          setLoading(false);
        } catch (e) {
          console.error('Failed to parse cached preferences:', e);
        }
      }

      const { data, error } = await supabase
        .from('chat_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading chat preferences:', error);
      }

      if (data) {
        const prefs: ChatPreferences = {
          bubbleStyle: data.bubble_style || 'rounded',
          fontSize: data.font_size || 16,
          soundsEnabled: data.sounds_enabled ?? true,
          autoDownload: data.auto_download ?? true,
          mediaQuality: data.media_quality || 'high',
          chatLock: data.chat_lock ?? false,
          readReceipts: data.read_receipts ?? true,
        };
        setPreferences(prefs);
        sessionStorage.setItem(`chatPrefs_${user.id}`, JSON.stringify(prefs));
      }
      
      setLoading(false);
    };

    loadPreferences();

    // Real-time subscription
    const channel = supabase
      .channel('chat-preferences-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_preferences', 
        filter: `user_id=eq.${user.id}` 
      }, () => {
        loadPreferences();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { preferences, loading };
};
