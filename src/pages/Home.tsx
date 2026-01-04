import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Feed from './Feed';
import NewPostModal from '@/components/ui/NewPostModal';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import { HomeContentSkeleton } from '@/components/skeletons';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { GuestAuthBanner } from '@/components/GuestAuthBanner';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [checkingFollows, setCheckingFollows] = useState(!!user);

  useEffect(() => {
    if (user) {
      checkUserFollows();
    }
  }, [user]);

  useEffect(() => {
    const handleNewPostEvent = () => {
      if (user) {
        setIsPostModalOpen(true);
      } else {
        navigate('/auth');
      }
    };
    
    window.addEventListener('open-new-post', handleNewPostEvent);
    return () => window.removeEventListener('open-new-post', handleNewPostEvent);
  }, [user, navigate]);

  useEffect(() => {
    if (searchParams.get('action') === 'new-post' && user) {
      setIsPostModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, user, setSearchParams]);

  const checkUserFollows = async () => {
    if (!user) {
      setCheckingFollows(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error checking follows:', error);
        setCheckingFollows(false);
        return;
      }

      if (!data || data.length === 0) {
        // Redirect to onboarding for completion - user hasn't followed anyone
        navigate('/onboarding', { replace: true });
        return;
      }
    } catch (error) {
      console.error('Error checking follows:', error);
    } finally {
      setCheckingFollows(false);
    }
  };

  if (loading || (user && checkingFollows)) {
    return <HomeContentSkeleton />;
  }

  // No Layout wrapper here - Layout is applied at router level in App.tsx
  return (
    <>
      <PWAInstallBanner />
      {user ? <ProfileCompletionBanner /> : <GuestAuthBanner />}
      <Feed />
      {user && <FloatingActionButton />}
      {user && (
        <NewPostModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
        />
      )}
    </>
  );
};

export default Home;
