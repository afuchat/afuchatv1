import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { PageSkeleton } from '@/components/skeletons';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, hasCountry, hasDateOfBirth, isBanned } = useProfileCheck();

  // Show skeleton while checking auth state and profile
  if (authLoading || (user && profileLoading)) {
    return <PageSkeleton variant="centered" />;
  }

  // Not logged in - go to welcome
  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  // Banned users go to banned page
  if (isBanned) {
    return <Navigate to="/banned" replace />;
  }

  // Users with incomplete profile go to onboarding
  if (!hasCountry || !hasDateOfBirth) {
    return <Navigate to="/onboarding" replace />;
  }

  // Fully authenticated and complete profile - go to home
  return <Navigate to="/home" replace />;
};

export default Index;
