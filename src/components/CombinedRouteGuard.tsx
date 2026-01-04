import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { PageSkeleton } from '@/components/skeletons';

interface CombinedRouteGuardProps {
  children: ReactNode;
}

export const CombinedRouteGuard = ({ children }: CombinedRouteGuardProps) => {
  const location = useLocation();
  const { loading, isBanned, hasCountry, hasDateOfBirth, profileComplete } = useProfileCheck();

  // Show skeleton while checking
  if (loading) {
    return <PageSkeleton variant="centered" />;
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
