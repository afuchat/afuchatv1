import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useGiftImage = (
  giftId: string,
  giftName: string,
  emoji: string,
  rarity: string
) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const AI_FEATURES_COMING_SOON = false;

  useEffect(() => {
    let mounted = true;

    const loadOrGenerateImage = async () => {
      try {
        setIsLoading(true);
        setError(false);

        // First, check if the gift already has a stored image URL
        const { data: gift } = await supabase
          .from('gifts')
          .select('image_url')
          .eq('id', giftId)
          .single();

        if (!mounted) return;

        // If image exists in database, use it
        if (gift?.image_url) {
          setImageUrl(gift.image_url);
          setIsLoading(false);
          return;
        }

        // AI features temporarily disabled - skip generation
        if (AI_FEATURES_COMING_SOON) {
          setImageUrl(null);
          setIsLoading(false);
          return;
        }

        // Otherwise, generate a new image
        const { data, error: functionError } = await supabase.functions.invoke(
          'generate-gift-image',
          {
            body: { giftId, giftName, emoji, rarity }
          }
        );

        if (!mounted) return;

        if (functionError) {
          console.error('Error generating gift image:', functionError);
          setError(true);
          setImageUrl(null);
          return;
        }

        if (data?.imageUrl) {
          setImageUrl(data.imageUrl);
        } else {
          setError(true);
          setImageUrl(null);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Error in useGiftImage:', err);
        setError(true);
        setImageUrl(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrGenerateImage();

    return () => {
      mounted = false;
    };
  }, [giftId, giftName, emoji, rarity]);

  return { imageUrl, isLoading, error };
};
