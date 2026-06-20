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

    const checkStories = async () => {
      try {
        const { data, error } = await supabase
          .from('stories')
          .select('id')
          .eq('user_id', userId)
          .gt('expires_at', new Date().toISOString())
          .limit(1);

        if (error) throw error;
        setHasActiveStories((data || []).length > 0);
      } catch (error) {
        console.error('Error checking stories:', error);
        setHasActiveStories(false);
      } finally {
        setLoading(false);
      }
    };

    checkStories();

    // Subscribe to story changes for real-time updates
    const channel = supabase
      .channel('story-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `user_id=eq.${userId}`
        },
        () => {
          checkStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { hasActiveStories, loading };
};
