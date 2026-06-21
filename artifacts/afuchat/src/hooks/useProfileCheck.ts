import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCheckResult {
  loading: boolean;
  isBanned: boolean;
  hasCountry: boolean;
  hasDateOfBirth: boolean;
  profileComplete: boolean;
  refetch: () => void;
}

const CACHE_KEY_PREFIX = 'profile_check_';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (reduced from 5)

export const useProfileCheck = (): ProfileCheckResult => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    isBanned: false,
    hasCountry: false,
    hasDateOfBirth: false,
    profileComplete: false,
  });
  const fetchedRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchProfile = useCallback(async (userId: string, forceRefresh = false) => {
    // Avoid duplicate fetches for the same user in the same component instance
    if (!forceRefresh && fetchedRef.current === userId) {
      return;
    }

    // Safety timeout — if Supabase hangs, don't block the app forever
    const profileTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setData({ isBanned: false, hasCountry: true, hasDateOfBirth: true, profileComplete: true });
        setLoading(false);
      }
    }, 6000);

    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    
    // Check cache first (only if not forcing refresh)
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          // Only use cache if profile is complete AND not banned AND cache is fresh
          if (cachedData.profileComplete && !cachedData.isBanned && Date.now() - timestamp < CACHE_DURATION) {
            clearTimeout(profileTimeout);
            if (isMountedRef.current) {
              setData(cachedData);
              setLoading(false);
              fetchedRef.current = userId;
            }
            return;
          }
        } catch {
          // Invalid cache, continue to fetch
          sessionStorage.removeItem(cacheKey);
        }
      }
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_banned, country, date_of_birth, display_name, handle, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking profile:', error);
        if (isMountedRef.current) {
          // On error, assume incomplete to be safe - redirect to complete profile
          setData({
            isBanned: false,
            hasCountry: false,
            hasDateOfBirth: false,
            profileComplete: false,
          });
          setLoading(false);
        }
        return;
      }

      const banned = profile?.is_banned === true;
      const countrySet = !!(profile?.country && profile.country.trim() !== '');
      const dobSet = !!profile?.date_of_birth;
      const complete = !!(
        profile?.display_name &&
        profile?.handle &&
        profile?.country &&
        profile?.avatar_url &&
        profile?.date_of_birth
      );

      const result = {
        isBanned: banned,
        hasCountry: countrySet,
        hasDateOfBirth: dobSet,
        profileComplete: complete,
      };

      // Cache only if profile is complete and not banned
      if (complete && !banned) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      } else {
        // Remove stale cache for incomplete profiles
        sessionStorage.removeItem(cacheKey);
      }

      if (isMountedRef.current) {
        setData(result);
        fetchedRef.current = userId;
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      if (isMountedRef.current) {
        setData({
          isBanned: false,
          hasCountry: false,
          hasDateOfBirth: false,
          profileComplete: false,
        });
      }
    } finally {
      clearTimeout(profileTimeout);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => {
    if (user) {
      setLoading(true);
      fetchedRef.current = null;
      // Clear cache for this user
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${user.id}`);
      fetchProfile(user.id, true);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setData({
        isBanned: false,
        hasCountry: true,
        hasDateOfBirth: true,
        profileComplete: true,
      });
      setLoading(false);
      return;
    }

    fetchProfile(user.id);
  }, [user, authLoading, fetchProfile]);

  return useMemo(() => ({
    loading: authLoading || loading,
    ...data,
    refetch,
  }), [authLoading, loading, data, refetch]);
};

// Helper to clear profile cache (call after profile update)
export const clearProfileCache = (userId: string) => {
  sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
  sessionStorage.removeItem(`profile_country_${userId}`);
  sessionStorage.removeItem(`profile_dob_${userId}`);
};
