import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type NexaAction = 
  | 'create_post'
  | 'create_reply'
  | 'give_reaction'
  | 'receive_reaction'
  | 'daily_login'
  | 'invite_user'
  | 'complete_profile'
  | 'use_ai';

const NEXA_VALUES: Record<NexaAction, number> = {
  create_post: 5,
  create_reply: 2,
  give_reaction: 1,
  receive_reaction: 2,
  daily_login: 10,
  invite_user: 20,
  complete_profile: 15,
  use_ai: 5,
};

export const useNexa = () => {
  const { user } = useAuth();

  const awardNexa = useCallback(async (
    action: NexaAction,
    metadata?: Record<string, any>,
    showToast: boolean = false
  ) => {
    if (!user) return;

    const nexaAmount = NEXA_VALUES[action];

    try {
      const response = await fetch(
        'https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/award-xp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            actionType: action,
            xpAmount: nexaAmount,
            metadata,
          }),
        }
      );

      const data = await response.json();

      if (data.success && showToast) {
        toast.success(`+${nexaAmount} Nexa earned! 🎉`, {
          description: `Total Nexa: ${data.xp}`,
        });
      }

      // Check for newly unlocked accessories
      if (data.success) {
        try {
          const { data: unlockData } = await supabase.rpc('check_and_unlock_accessories', {
            p_user_id: user.id,
          });
          
          const result = unlockData as { newly_unlocked: string[]; user_xp: number } | null;
          
          if (result?.newly_unlocked && result.newly_unlocked.length > 0) {
            result.newly_unlocked.forEach((accessory: string) => {
              toast.success(`🎉 New accessory unlocked: ${accessory}!`, {
                description: `You can now use the ${accessory} in your avatar.`,
                duration: 5000,
              });
            });
          }
        } catch (error) {
          console.error('Error checking accessories unlock:', error);
        }
      }

      return data;
    } catch (error) {
      console.error('Error awarding Nexa:', error);
    }
  }, [user]);

  const checkDailyLogin = useCallback(async () => {
    if (!user) return;

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

      return result;
    } catch (error) {
      console.error('Error checking daily login:', error);
    }
  }, [user]);

  const checkProfileCompletion = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_profile_completion', {
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data as { completed: boolean; xp_awarded: number; message: string } | null;

      if (result && result.xp_awarded > 0) {
        toast.success('Profile completed!', {
          description: `+${result.xp_awarded} Nexa bonus unlocked! 🎉`,
          duration: 5000,
        });
      }

      return result;
    } catch (error) {
      console.error('Error checking profile completion:', error);
    }
  }, [user]);

  const convertNexaToACoin = useCallback(async (nexaAmount: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('convert_nexa_to_acoin', {
        p_nexa_amount: nexaAmount,
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        message: string;
        nexa_spent?: number;
        fee_charged?: number;
        acoin_received?: number;
        new_nexa_balance?: number;
        new_acoin_balance?: number;
      } | null;

      if (result?.success) {
        toast.success('Conversion successful! ✨', {
          description: `Converted ${result.nexa_spent} Nexa to ${result.acoin_received} ACoin (Fee: ${result.fee_charged} Nexa)`,
          duration: 5000,
        });
      } else {
        toast.error('Conversion failed', {
          description: result?.message || 'Unknown error',
        });
      }

      return result;
    } catch (error) {
      console.error('Error converting Nexa to ACoin:', error);
      toast.error('Conversion failed', {
        description: 'Please try again later',
      });
    }
  }, [user]);

  return { awardNexa, checkDailyLogin, checkProfileCompletion, convertNexaToACoin };
};