import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { PageSkeleton } from '@/components/skeletons';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, hasCountry, hasDateOfBirth, isBanned, profileComplete } = useProfileCheck();

  // Show skeleton while checking auth state and profile
  if (authLoading || (user && profileLoading)) {
    return <PageSkeleton variant="centered" />;
  }

  // Not logged in - go to welcome
  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Banned users go to banned page
  if (isBanned) {
    return <Navigate to="/banned" replace />;
  }

  // Users with complete profile always go to home - never redirect to onboarding
  if (profileComplete) {
    return <Navigate to="/home" replace />;
  }

  // Users with incomplete profile go to onboarding
  if (!hasCountry || !hasDateOfBirth) {
    return <Navigate to="/onboarding" replace />;
  }

  // Fallback - go to home
  return <Navigate to="/home" replace />;
};

export default Index;
