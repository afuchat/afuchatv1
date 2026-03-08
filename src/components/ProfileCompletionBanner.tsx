import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const ProfileCompletionBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [userHandle, setUserHandle] = useState<string>('');

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;

      // Check session dismissal
      const wasDismissed = sessionStorage.getItem('profileCompletionDismissed');
      if (wasDismissed) {
        setDismissed(true);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, country, avatar_url, bio, handle, profile_completion_rewarded')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserHandle(profile.handle);
        
        // Users without country are redirected by RequireCountry, so only check other fields
        const hasCountry = profile.country && profile.country.trim() !== '';
        if (!hasCountry) {
          // Country check is handled by RequireCountry redirect, don't show banner
          return;
        }
        
        // Show banner if any other profile field is incomplete AND not already rewarded
        const isIncomplete = !profile.phone_number || !profile.avatar_url || !profile.bio;
        if (isIncomplete && !profile.profile_completion_rewarded) {
          setShow(true);
        }
      }
    };

    checkProfile();
  }, [user]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem('profileCompletionDismissed', 'true');
  };

  const handleComplete = () => {
    if (userHandle) {
      navigate(`/@${userHandle}/edit`);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed left-0 right-0 z-[100] bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border-b border-primary/30 backdrop-blur-sm" style={{ top: 'var(--tg-safe-top, 0px)' }}>
      <div className="flex items-center justify-between px-4 py-2.5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs sm:text-sm text-foreground truncate">
            Complete your profile to earn <span className="font-semibold text-primary">100 Nexa</span>!
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleComplete}
            className="h-7 px-3 text-xs font-medium bg-primary hover:bg-primary/90"
          >
            Complete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
