import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationCache {
  [key: string]: string;
}

// Request queue to throttle API calls
class TranslationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private readonly delayMs = 100; // Delay between requests

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }
    this.processing = false;
  }
}

const globalQueue = new TranslationQueue();

export const useAITranslation = () => {
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});
  const [loading, setLoading] = useState(false);
  const retryCount = useRef<Map<string, number>>(new Map());

  // AI Features under development - temporarily disabled
  const AI_COMING_SOON = true;

  const translateText = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    // Return original text when AI features are disabled
    if (AI_COMING_SOON) {
      return text;
    }

    // Check cache first
    const cacheKey = `${text}-${targetLanguage}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }

    // Don't translate if target is English and text appears to be English
    if (targetLanguage === 'en' && /^[a-zA-Z0-9\s.,!?'"@#$%&*()_+=\-[\]{}:;<>\/\\]+$/.test(text)) {
      return text;
    }

    // Use queue to throttle requests
    return globalQueue.add(async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return text;
        }

        const response = await fetch(
          'https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/translate-post',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              text,
              targetLanguage,
            }),
          }
        );

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          const retries = retryCount.current.get(cacheKey) || 0;
          if (retries < 3) {
            retryCount.current.set(cacheKey, retries + 1);
            const delay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, delay));
            return translateText(text, targetLanguage); // Retry
          }
          console.warn('Translation rate limited after retries');
          return text;
        }

        // Handle service unavailable
        if (response.status === 503) {
          console.warn('Translation service temporarily unavailable');
          return text;
        }

        if (!response.ok) {
          console.warn('Translation failed:', response.status);
          return text;
        }

        const data = await response.json();
        const translatedText = data.translatedText || text;

        // Cache the translation
        setTranslationCache(prev => ({
          ...prev,
          [cacheKey]: translatedText,
        }));

        // Reset retry count on success
        retryCount.current.delete(cacheKey);

        return translatedText;
      } catch (error) {
        console.error('Translation error:', error);
        return text;
      } finally {
        setLoading(false);
      }
    });
  }, [translationCache]);

  return { translateText, loading };
};
