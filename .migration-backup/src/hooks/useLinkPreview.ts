import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name?: string;
}

export const useLinkPreview = () => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchPreview = async (url: string): Promise<LinkPreview | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-link-preview', {
        body: { url },
      });

      if (error) throw error;
      return data as LinkPreview;
    } catch (error) {
      console.error('Error fetching link preview:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { fetchPreview, isLoading };
};
