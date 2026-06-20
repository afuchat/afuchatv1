import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useImageDescription = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const AI_FEATURES_COMING_SOON = true;

  const generateDescription = async (imageData: string): Promise<string | null> => {
    if (AI_FEATURES_COMING_SOON) {
      toast.info('AI image descriptions coming soon!');
      return null;
    }
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-description', {
        body: { 
          imageBase64: imageData 
        }
      });

      if (error) {
        console.error('Error generating description:', error);
        
        if (error.message?.includes('429')) {
          toast.error('Rate limit reached. Please try again in a moment.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits depleted. Please contact support.');
        } else {
          toast.error('Failed to generate image description');
        }
        return null;
      }

      if (data?.description) {
        return data.description;
      }

      return null;
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while generating description');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateDescription,
    isGenerating,
  };
};
