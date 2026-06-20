import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

// Track if language has been synced this session
const LANG_SYNC_KEY = 'afuchat_lang_synced';

export const useLanguageSync = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!user || hasSyncedRef.current) return;
    
    // Check if already synced this session
    const sessionKey = `${LANG_SYNC_KEY}_${user.id}`;
    const alreadySynced = sessionStorage.getItem(sessionKey);
    
    if (alreadySynced) {
      hasSyncedRef.current = true;
      return;
    }

    const syncLanguage = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .single();

        if (profile?.language && profile.language !== i18n.language) {
          i18n.changeLanguage(profile.language);
          
          // Set document direction for RTL languages
          document.documentElement.dir = profile.language === 'ar' ? 'rtl' : 'ltr';
        }
        
        hasSyncedRef.current = true;
        sessionStorage.setItem(sessionKey, 'true');
      } catch (error) {
        console.error('Error syncing language:', error);
      }
    };

    syncLanguage();
  }, [user?.id, i18n]);
};
