import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { PageSkeleton } from '@/components/skeletons';

interface CombinedRouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export const CombinedRouteGuard = ({ children, requireAuth = false }: CombinedRouteGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { loading, isBanned, hasCountry, hasDateOfBirth, profileComplete } = useProfileCheck();

  // Show skeleton while checking
  if (authLoading || loading) {
    return <PageSkeleton variant="centered" />;
  }

  // If auth is required and user is not logged in, redirect to welcome
  if (requireAuth && !user) {
    return <Navigate to="/auth/welcome" replace />;
  }

  // If user is not logged in and auth is not required, allow access (public pages)
  if (!user) {
    return <>{children}</>;
  }

  // Banned users go to banned page
  if (isBanned) {
    if (location.pathname === '/banned') {
      return <>{children}</>;
    }
    return <Navigate to="/banned" replace />;
  }

  // Users with complete profiles should never be redirected to onboarding
  if (profileComplete) {
    return <>{children}</>;
  }

  // Missing country or DOB - redirect to onboarding
  if (!hasCountry || !hasDateOfBirth) {
    if (location.pathname === '/onboarding' || location.pathname === '/complete-profile') {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
