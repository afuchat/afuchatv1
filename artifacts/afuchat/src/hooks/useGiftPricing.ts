import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GiftPricing {
  giftId: string;
  basePrice: number;
  currentPrice: number;
  lastSalePrice: number | null;
  priceMultiplier: number;
  totalSent: number;
  priceIncrease: number; // percentage increase from base
}

interface GiftPricingCache {
  data: Map<string, GiftPricing>;
  timestamp: number;
}

// Module-level cache
let pricingCache: GiftPricingCache = {
  data: new Map(),
  timestamp: 0
};

const CACHE_DURATION = 60000; // 1 minute

export const useGiftPricing = (giftId?: string) => {
  const [pricing, setPricing] = useState<GiftPricing | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPricing = useCallback(async (id: string) => {
    // Check cache first
    const now = Date.now();
    if (now - pricingCache.timestamp < CACHE_DURATION && pricingCache.data.has(id)) {
      setPricing(pricingCache.data.get(id)!);
      return pricingCache.data.get(id)!;
    }

    setLoading(true);
    try {
      // Fetch gift and stats in parallel
      const [giftResult, statsResult] = await Promise.all([
        supabase.from('gifts').select('id, base_xp_cost').eq('id', id).single(),
        supabase.from('gift_statistics').select('*').eq('gift_id', id).maybeSingle()
      ]);

      if (giftResult.error) throw giftResult.error;

      const gift = giftResult.data;
      const stats = statsResult.data;

      // Use last_sale_price if available, otherwise base_xp_cost
      const currentPrice = stats?.last_sale_price || gift.base_xp_cost;
      const priceIncrease = ((currentPrice - gift.base_xp_cost) / gift.base_xp_cost) * 100;

      const pricingData: GiftPricing = {
        giftId: id,
        basePrice: gift.base_xp_cost,
        currentPrice,
        lastSalePrice: stats?.last_sale_price || null,
        priceMultiplier: stats?.price_multiplier || 1,
        totalSent: stats?.total_sent || 0,
        priceIncrease
      };

      // Update cache
      pricingCache.data.set(id, pricingData);
      pricingCache.timestamp = now;

      setPricing(pricingData);
      return pricingData;
    } catch (error) {
      console.error('Error fetching gift pricing:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (giftId) {
      fetchPricing(giftId);
    }
  }, [giftId, fetchPricing]);

  return { pricing, loading, refetch: fetchPricing };
};

// Hook to fetch all gift prices at once
export const useAllGiftPricing = () => {
  const [pricingMap, setPricingMap] = useState<Map<string, GiftPricing>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchAllPricing = useCallback(async () => {
    setLoading(true);
    try {
      const [giftsResult, statsResult] = await Promise.all([
        supabase.from('gifts').select('id, base_xp_cost'),
        supabase.from('gift_statistics').select('*')
      ]);

      if (giftsResult.error) throw giftsResult.error;

      const gifts = giftsResult.data || [];
      const stats = statsResult.data || [];
      const statsMap = new Map(stats.map(s => [s.gift_id, s]));

      const newPricingMap = new Map<string, GiftPricing>();

      gifts.forEach(gift => {
        const giftStats = statsMap.get(gift.id);
        const currentPrice = giftStats?.last_sale_price || gift.base_xp_cost;
        const priceIncrease = ((currentPrice - gift.base_xp_cost) / gift.base_xp_cost) * 100;

        const pricingData: GiftPricing = {
          giftId: gift.id,
          basePrice: gift.base_xp_cost,
          currentPrice,
          lastSalePrice: giftStats?.last_sale_price || null,
          priceMultiplier: giftStats?.price_multiplier || 1,
          totalSent: giftStats?.total_sent || 0,
          priceIncrease
        };

        newPricingMap.set(gift.id, pricingData);
        pricingCache.data.set(gift.id, pricingData);
      });

      pricingCache.timestamp = Date.now();
      setPricingMap(newPricingMap);
    } catch (error) {
      console.error('Error fetching all gift pricing:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPricing();
  }, [fetchAllPricing]);

  const getPrice = useCallback((giftId: string): GiftPricing | null => {
    return pricingMap.get(giftId) || null;
  }, [pricingMap]);

  return { pricingMap, loading, getPrice, refetch: fetchAllPricing };
};

// Utility function to invalidate cache (call after purchase)
export const invalidateGiftPricingCache = () => {
  pricingCache = {
    data: new Map(),
    timestamp: 0
  };
};
