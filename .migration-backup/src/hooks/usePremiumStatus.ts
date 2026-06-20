import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'none' | 'silver' | 'gold' | 'platinum';

// Cache key for premium status
const PREMIUM_CACHE_KEY = 'afuchat_premium_status';

// Tier hierarchy for comparison
const tierOrder: SubscriptionTier[] = ['none', 'silver', 'gold', 'platinum'];

// Global cache to prevent multiple subscriptions for same user
const premiumStatusCache = new Map<string, { 
  isPremium: boolean; 
  tier: SubscriptionTier;
  expiresAt: string | null; 
  timestamp: number 
}>();
const activeSubscriptions = new Map<string, ReturnType<typeof supabase.channel>>();

// Get cached premium status synchronously to prevent ad flash
const getCachedPremiumStatus = (userId?: string): { 
  isPremium: boolean; 
  tier: SubscriptionTier;
  expiresAt: string | null 
} | null => {
  if (!userId) return null;
  
  // Check memory cache first (faster)
  const memCached = premiumStatusCache.get(userId);
  if (memCached && Date.now() - memCached.timestamp < 60000) { // 1 minute memory cache
    return { isPremium: memCached.isPremium, tier: memCached.tier, expiresAt: memCached.expiresAt };
  }
  
  // Check session storage
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(`${PREMIUM_CACHE_KEY}_${userId}`);
    if (cached) {
      const { isPremium, tier, expiresAt } = JSON.parse(cached);
      // Check if cached data is still valid
      if (expiresAt && new Date(expiresAt) > new Date()) {
        // Update memory cache
        premiumStatusCache.set(userId, { isPremium, tier: tier || 'none', expiresAt, timestamp: Date.now() });
        return { isPremium, tier: tier || 'none', expiresAt };
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

export const usePremiumStatus = (targetUserId?: string) => {
  const { user } = useAuth();
  
  // Use targetUserId if provided, otherwise fallback to current user
  const checkUserId = targetUserId || user?.id;
  
  // Initialize with cached value to prevent flash
  const cachedData = getCachedPremiumStatus(checkUserId);
  const [isPremium, setIsPremium] = useState(cachedData?.isPremium ?? false);
  const [tier, setTier] = useState<SubscriptionTier>(cachedData?.tier ?? 'none');
  const [loading, setLoading] = useState(!cachedData);
  const [expiresAt, setExpiresAt] = useState<string | null>(cachedData?.expiresAt ?? null);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const checkPremiumStatus = async () => {
      if (!checkUserId) {
        if (isMountedRef.current) {
          setIsPremium(false);
          setTier('none');
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await supabase
          .from('user_subscriptions')
          .select(`
            expires_at, 
            is_active,
            subscription_plans (
              tier
            )
          `)
          .eq('user_id', checkUserId)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMountedRef.current) return;

        if (data) {
          const planTier = ((data.subscription_plans as any)?.tier || 'silver') as SubscriptionTier;
          setIsPremium(true);
          setTier(planTier);
          setExpiresAt(data.expires_at);
          // Update both caches
          premiumStatusCache.set(checkUserId, { 
            isPremium: true, 
            tier: planTier,
            expiresAt: data.expires_at, 
            timestamp: Date.now() 
          });
          sessionStorage.setItem(`${PREMIUM_CACHE_KEY}_${checkUserId}`, JSON.stringify({
            isPremium: true,
            tier: planTier,
            expiresAt: data.expires_at
          }));
        } else {
          setIsPremium(false);
          setTier('none');
          setExpiresAt(null);
          premiumStatusCache.set(checkUserId, { 
            isPremium: false, 
            tier: 'none',
            expiresAt: null, 
            timestamp: Date.now() 
          });
          sessionStorage.removeItem(`${PREMIUM_CACHE_KEY}_${checkUserId}`);
        }
      } catch (error) {
        console.error('Error checking premium status:', error);
        if (isMountedRef.current) {
          setIsPremium(false);
          setTier('none');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    checkPremiumStatus();

    // Only create ONE subscription per user globally
    if (checkUserId && !activeSubscriptions.has(checkUserId)) {
      const channel = supabase
        .channel(`premium-status-${checkUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${checkUserId}`,
          },
          () => {
            checkPremiumStatus();
          }
        )
        .subscribe();
      
      activeSubscriptions.set(checkUserId, channel);
    }

    return () => {
      isMountedRef.current = false;
      // Don't remove subscription on unmount - keep it alive for reuse
    };
  }, [checkUserId]);

  // Check if user's tier meets minimum requirement
  const hasTierAccess = (minTier: SubscriptionTier): boolean => {
    const userTierIndex = tierOrder.indexOf(tier);
    const minTierIndex = tierOrder.indexOf(minTier);
    return userTierIndex >= minTierIndex;
  };

  return { 
    isPremium, 
    tier,
    loading, 
    expiresAt,
    hasTierAccess
  };
};
