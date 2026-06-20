import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { CustomLoader } from '@/components/ui/CustomLoader';

interface RequireDateOfBirthProps {
  children: ReactNode;
}

export const RequireDateOfBirth = ({ children }: RequireDateOfBirthProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const { loading, hasDateOfBirth } = useProfileCheck();

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

  // User is logged in but has no date of birth - redirect to onboarding
  if (!hasDateOfBirth) {
    if (location.pathname === '/onboarding' || location.pathname === '/complete-profile') {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
