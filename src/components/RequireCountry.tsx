import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { CustomLoader } from '@/components/ui/CustomLoader';

interface RequireCountryProps {
  children: ReactNode;
}

export const RequireCountry = ({ children }: RequireCountryProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const { loading, hasCountry } = useProfileCheck();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <CustomLoader size="lg" />
      </div>
    );
  }

  // Not logged in - allow access (public pages)
  if (!user) {
    return <>{children}</>;
  }

  // User is logged in but has no country - redirect to onboarding
  if (!hasCountry) {
    if (location.pathname === '/onboarding' || location.pathname === '/complete-profile') {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
