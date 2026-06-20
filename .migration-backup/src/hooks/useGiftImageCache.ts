import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Global cache for gift images
const giftImageCache = new Map<string, string | null>();
const pendingRequests = new Map<string, Promise<string | null>>();
let isPreloading = false;
let preloadComplete = false;

// Subscribers for cache updates
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

export const preloadAllGiftImages = async () => {
  if (isPreloading || preloadComplete) return;
  isPreloading = true;

  try {
    // Fetch all gifts with their image URLs
    const { data: gifts, error } = await supabase
      .from('gifts')
      .select('id, name, emoji, rarity, image_url');

    if (error || !gifts) {
      console.error('Error fetching gifts for preload:', error);
      isPreloading = false;
      return;
    }

    // Process gifts - cache existing images, generate missing ones in background
    for (const gift of gifts) {
      if (gift.image_url) {
        // Already has image, cache it
        giftImageCache.set(gift.id, gift.image_url);
        
        // Preload image into browser cache
        const img = new Image();
        img.src = gift.image_url;
      } else {
        // Generate image in background (don't await)
        generateGiftImageBackground(gift.id, gift.name, gift.emoji, gift.rarity);
      }
    }

    preloadComplete = true;
    notifySubscribers();
  } catch (err) {
    console.error('Error in gift preload:', err);
  } finally {
    isPreloading = false;
  }
};

const generateGiftImageBackground = async (
  giftId: string,
  giftName: string,
  emoji: string,
  rarity: string
): Promise<string | null> => {
  // Check if already in cache or pending
  if (giftImageCache.has(giftId)) {
    return giftImageCache.get(giftId) || null;
  }

  if (pendingRequests.has(giftId)) {
    return pendingRequests.get(giftId)!;
  }

  const request = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-gift-image', {
        body: { giftId, giftName, emoji, rarity }
      });

      if (error) {
        console.error('Error generating gift image:', error);
        giftImageCache.set(giftId, null);
        return null;
      }

      const imageUrl = data?.imageUrl || null;
      giftImageCache.set(giftId, imageUrl);
      
      // Preload into browser cache
      if (imageUrl) {
        const img = new Image();
        img.src = imageUrl;
      }
      
      notifySubscribers();
      return imageUrl;
    } catch (err) {
      console.error('Error in generateGiftImageBackground:', err);
      giftImageCache.set(giftId, null);
      return null;
    } finally {
      pendingRequests.delete(giftId);
    }
  })();

  pendingRequests.set(giftId, request);
  return request;
};

export const getCachedGiftImage = (giftId: string): string | null | undefined => {
  return giftImageCache.get(giftId);
};

export const useGiftImageCache = () => {
  const [, setUpdateCounter] = useState(0);

  useEffect(() => {
    const callback = () => {
      setUpdateCounter(c => c + 1);
    };
    
    subscribers.add(callback);
    
    // Start preloading on first mount
    preloadAllGiftImages();
    
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  return {
    getCachedImage: getCachedGiftImage,
    isPreloading,
    preloadComplete
  };
};

export const useGiftImageFromCache = (
  giftId: string,
  giftName: string,
  emoji: string,
  rarity: string
) => {
  const cachedUrl = giftImageCache.get(giftId);
  
  useEffect(() => {
    // If not in cache and not pending, trigger generation
    if (cachedUrl === undefined && !pendingRequests.has(giftId)) {
      generateGiftImageBackground(giftId, giftName, emoji, rarity);
    }
  }, [giftId, giftName, emoji, rarity, cachedUrl]);

  // Subscribe to updates
  useEffect(() => {
    const callback = () => {};
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  return {
    imageUrl: cachedUrl ?? null,
    // Never show loading - just show emoji fallback until image is ready
    isLoading: false,
    error: cachedUrl === null
  };
};