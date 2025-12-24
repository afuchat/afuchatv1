import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/skeletons';

const Index = () => {
  const { user, loading } = useAuth();

  // Show skeleton while checking auth state
  if (loading) {
    return <PageSkeleton variant="centered" />;
  }

  // Immediate redirect - no useEffect delay
  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/welcome" replace />;
};

export default Index;
