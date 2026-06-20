import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserStories = (userId: string | undefined) => {
  const [hasActiveStories, setHasActiveStories] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setHasActiveStories(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const checkStories = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('stories')
          .select('id')
          .eq('user_id', userId)
          .gt('expires_at', new Date().toISOString())
          .limit(1);

        if (!cancelled) {
          if (error) throw error;
          setHasActiveStories((data || []).length > 0);
        }
      } catch {
        if (!cancelled) setHasActiveStories(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkStories();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { hasActiveStories, loading };
};
