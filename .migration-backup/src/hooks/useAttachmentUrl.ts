import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAttachmentUrl = (storagePath: string | null | undefined) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storagePath) {
      setLoading(false);
      return;
    }

    // If it's already a full URL (external URL like Tenor GIFs), use it directly
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      setUrl(storagePath);
      setLoading(false);
      return;
    }

    const getSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(storagePath, 3600); // 1 hour expiry

        if (error) {
          console.error('Error getting signed URL:', error);
          setUrl(null);
        } else {
          setUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error:', error);
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [storagePath]);

  return { url, loading };
};
