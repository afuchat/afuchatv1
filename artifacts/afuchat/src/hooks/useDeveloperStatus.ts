import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DeveloperStatus {
  isDeveloper: boolean;
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected' | null;
  featuresEnabled: string[];
  loading: boolean;
  refetch: () => void;
}

// Cache for developer status
const developerCache = new Map<string, { data: Omit<DeveloperStatus, 'loading' | 'refetch'>; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useDeveloperStatus = (userId?: string): DeveloperStatus => {
  const { user } = useAuth();
  const checkUserId = userId || user?.id;
  
  const [status, setStatus] = useState<Omit<DeveloperStatus, 'loading' | 'refetch'>>({
    isDeveloper: false,
    applicationStatus: null,
    featuresEnabled: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async (forceRefresh = false) => {
    if (!checkUserId) {
      setStatus({ isDeveloper: false, applicationStatus: null, featuresEnabled: [] });
      setLoading(false);
      return;
    }

    // Check cache
    if (!forceRefresh) {
      const cached = developerCache.get(checkUserId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setStatus(cached.data);
        setLoading(false);
        return;
      }
    }

    try {
      // Check developer role
      const { data: roleData } = await supabase
        .from('developer_roles')
        .select('features_enabled')
        .eq('user_id', checkUserId)
        .maybeSingle();

      // Check application status
      const { data: appData } = await supabase
        .from('developer_applications')
        .select('status')
        .eq('user_id', checkUserId)
        .maybeSingle();

      const result = {
        isDeveloper: !!roleData,
        applicationStatus: (appData?.status as 'none' | 'pending' | 'approved' | 'rejected') || 'none',
        featuresEnabled: roleData?.features_enabled || [],
      };

      developerCache.set(checkUserId, { data: result, timestamp: Date.now() });
      setStatus(result);
    } catch (error) {
      console.error('Error fetching developer status:', error);
    } finally {
      setLoading(false);
    }
  }, [checkUserId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refetch = useCallback(() => {
    if (checkUserId) {
      developerCache.delete(checkUserId);
    }
    setLoading(true);
    fetchStatus(true);
  }, [checkUserId, fetchStatus]);

  return { ...status, loading, refetch };
};

// Helper to check if user has specific developer feature
export const hasDeveloperFeature = (featuresEnabled: string[], feature: string): boolean => {
  return featuresEnabled.includes(feature);
};

// Clear developer cache
export const clearDeveloperCache = (userId?: string) => {
  if (userId) {
    developerCache.delete(userId);
  } else {
    developerCache.clear();
  }
};
