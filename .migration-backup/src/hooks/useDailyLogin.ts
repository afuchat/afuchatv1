import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Track if daily login has already been checked this session
const DAILY_LOGIN_KEY = 'afuchat_daily_login_checked';

/**
 * Hook to automatically check and award daily login streak
 * Runs once per session when user logs in
 */
export const useDailyLogin = () => {
  const { user } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!user || hasCheckedRef.current) return;
    
    // Check if already checked this session
    const sessionKey = `${DAILY_LOGIN_KEY}_${user.id}`;
    const lastCheck = sessionStorage.getItem(sessionKey);
    const today = new Date().toDateString();
    
    if (lastCheck === today) {
      hasCheckedRef.current = true;
      return;
    }

    const timer = setTimeout(async () => {
      if (hasCheckedRef.current) return;
      hasCheckedRef.current = true;

      try {
        const { data, error } = await supabase.rpc('check_daily_login_streak', {
          p_user_id: user.id,
        });

        if (error) throw error;

        const result = data as { streak: number; xp_awarded: number; message: string } | null;

        if (result && result.xp_awarded > 0) {
          toast.success(`Daily login streak: ${result.streak} days!`, {
            description: `+${result.xp_awarded} Nexa earned!`,
            duration: 4000,
          });
        }
        
        // Mark as checked for today
        sessionStorage.setItem(sessionKey, today);
      } catch (error) {
        console.error('Error checking daily login:', error);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user?.id]); // Only depend on user.id, not the whole user object
};
