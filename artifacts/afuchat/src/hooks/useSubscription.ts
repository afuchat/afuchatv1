import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'none' | 'silver' | 'gold' | 'platinum';

// Feature definitions by tier
const tierFeatures: Record<SubscriptionTier, string[]> = {
  none: [],
  silver: [
    'verified_badge',
    'ad_free',
    'pin_1_gift',
    'red_envelope_claim_1',
    'basic_chat_themes'
  ],
  gold: [
    'verified_badge',
    'ad_free',
    'create_stories',
    'create_groups',
    'pin_2_gifts',
    'red_envelope_claim_5',
    'ai_post_analysis',
    'custom_chat_themes'
  ],
  platinum: [
    'verified_badge',
    'ad_free',
    'create_stories',
    'create_groups',
    'create_channels',
    'pin_3_gifts',
    'unlimited_red_envelope_claims',
    'create_red_envelopes',
    'ai_post_analysis',
    'ai_chat_themes',
    'gift_marketplace',
    'leaderboard_privacy',
    'afuai_chat',
    'priority_support'
  ]
};

// Feature to tier mapping for quick lookups
const featureMinTier: Record<string, SubscriptionTier> = {
  'verified_badge': 'silver',
  'ad_free': 'silver',
  'pin_1_gift': 'silver',
  'pin_2_gifts': 'gold',
  'pin_3_gifts': 'platinum',
  'basic_chat_themes': 'silver',
  'custom_chat_themes': 'gold',
  'ai_chat_themes': 'platinum',
  'red_envelope_claim_1': 'silver',
  'red_envelope_claim_5': 'gold',
  'unlimited_red_envelope_claims': 'platinum',
  'create_red_envelopes': 'platinum',
  'create_stories': 'gold',
  'create_groups': 'gold',
  'create_channels': 'platinum',
  'ai_post_analysis': 'gold',
  'gift_marketplace': 'platinum',
  'leaderboard_privacy': 'platinum',
  'afuai_chat': 'platinum',
  'priority_support': 'platinum'
};

// Tier hierarchy for comparison
const tierOrder: SubscriptionTier[] = ['none', 'silver', 'gold', 'platinum'];

interface SubscriptionData {
  tier: SubscriptionTier;
  planName: string | null;
  expiresAt: string | null;
  isPremium: boolean;
  features: string[];
}

// Cache keys
const SUBSCRIPTION_CACHE_KEY = 'afuchat_subscription';
const subscriptionCache = new Map<string, SubscriptionData & { timestamp: number }>();

const getCachedSubscription = (userId?: string): SubscriptionData | null => {
  if (!userId) return null;
  
  const memCached = subscriptionCache.get(userId);
  if (memCached && Date.now() - memCached.timestamp < 60000) {
    const { timestamp, ...data } = memCached;
    return data;
  }
  
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(`${SUBSCRIPTION_CACHE_KEY}_${userId}`);
    if (cached) {
      const data = JSON.parse(cached) as SubscriptionData;
      if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
        subscriptionCache.set(userId, { ...data, timestamp: Date.now() });
        return data;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

export const useSubscription = (targetUserId?: string) => {
  const { user } = useAuth();
  const checkUserId = targetUserId || user?.id;
  
  const cachedData = getCachedSubscription(checkUserId);
  
  const [subscription, setSubscription] = useState<SubscriptionData>(
    cachedData || {
      tier: 'none',
      planName: null,
      expiresAt: null,
      isPremium: false,
      features: []
    }
  );
  const [loading, setLoading] = useState(!cachedData);
  
  const isMountedRef = useRef(true);

  const fetchSubscription = useCallback(async () => {
    if (!checkUserId) {
      if (isMountedRef.current) {
        setSubscription({
          tier: 'none',
          planName: null,
          expiresAt: null,
          isPremium: false,
          features: []
        });
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
            name,
            tier,
            features
          )
        `)
        .eq('user_id', checkUserId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMountedRef.current) return;

      if (data && data.subscription_plans) {
        const planData = data.subscription_plans as any;
        const tier = (planData.tier || 'silver') as SubscriptionTier;
        const features = tierFeatures[tier] || [];
        
        const subData: SubscriptionData = {
          tier,
          planName: planData.name,
          expiresAt: data.expires_at,
          isPremium: true,
          features
        };
        
        setSubscription(subData);
        subscriptionCache.set(checkUserId, { ...subData, timestamp: Date.now() });
        sessionStorage.setItem(`${SUBSCRIPTION_CACHE_KEY}_${checkUserId}`, JSON.stringify(subData));
      } else {
        const subData: SubscriptionData = {
          tier: 'none',
          planName: null,
          expiresAt: null,
          isPremium: false,
          features: []
        };
        setSubscription(subData);
        subscriptionCache.set(checkUserId, { ...subData, timestamp: Date.now() });
        sessionStorage.removeItem(`${SUBSCRIPTION_CACHE_KEY}_${checkUserId}`);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      if (isMountedRef.current) {
        setSubscription({
          tier: 'none',
          planName: null,
          expiresAt: null,
          isPremium: false,
          features: []
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [checkUserId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSubscription();

    const channel = supabase
      .channel(`subscription-${checkUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${checkUserId}`,
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [checkUserId, fetchSubscription]);

  // Check if user has access to a specific feature
  const hasFeature = useCallback((feature: string): boolean => {
    return subscription.features.includes(feature);
  }, [subscription.features]);

  // Check if user's tier meets minimum requirement
  const hasTierAccess = useCallback((minTier: SubscriptionTier): boolean => {
    const userTierIndex = tierOrder.indexOf(subscription.tier);
    const minTierIndex = tierOrder.indexOf(minTier);
    return userTierIndex >= minTierIndex;
  }, [subscription.tier]);

  // Get the minimum tier required for a feature
  const getRequiredTier = useCallback((feature: string): SubscriptionTier => {
    return featureMinTier[feature] || 'platinum';
  }, []);

  // Get max pinned gifts allowed
  const getMaxPinnedGifts = useCallback((): number => {
    switch (subscription.tier) {
      case 'platinum': return 3;
      case 'gold': return 2;
      case 'silver': return 1;
      default: return 1;
    }
  }, [subscription.tier]);

  // Get max red envelope claims per day
  const getMaxRedEnvelopeClaims = useCallback((): number => {
    switch (subscription.tier) {
      case 'platinum': return Infinity;
      case 'gold': return 5;
      case 'silver': return 1;
      default: return 1;
    }
  }, [subscription.tier]);

  // Check if user can create content
  const canCreateStories = useCallback((): boolean => {
    return hasTierAccess('gold');
  }, [hasTierAccess]);

  const canCreateGroups = useCallback((): boolean => {
    return hasTierAccess('gold');
  }, [hasTierAccess]);

  const canCreateChannels = useCallback((): boolean => {
    return hasTierAccess('platinum');
  }, [hasTierAccess]);

  const canCreateRedEnvelopes = useCallback((): boolean => {
    return hasTierAccess('platinum');
  }, [hasTierAccess]);

  const canAccessMarketplace = useCallback((): boolean => {
    return hasTierAccess('platinum');
  }, [hasTierAccess]);

  const canUseAIPostAnalysis = useCallback((): boolean => {
    return hasTierAccess('gold');
  }, [hasTierAccess]);

  const canUseAfuAI = useCallback((): boolean => {
    return hasTierAccess('platinum');
  }, [hasTierAccess]);

  return {
    ...subscription,
    loading,
    hasFeature,
    hasTierAccess,
    getRequiredTier,
    getMaxPinnedGifts,
    getMaxRedEnvelopeClaims,
    canCreateStories,
    canCreateGroups,
    canCreateChannels,
    canCreateRedEnvelopes,
    canAccessMarketplace,
    canUseAIPostAnalysis,
    canUseAfuAI
  };
};
