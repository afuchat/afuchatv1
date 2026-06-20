import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const GuestAuthBanner = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('guestAuthDismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('guestAuthDismissed', 'true');
  };

  // Never show while loading auth or for logged-in users
  if (loading || user || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border-b border-primary/30 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2.5 max-w-7xl mx-auto">
        <p className="text-xs sm:text-sm text-foreground flex-1 min-w-0 truncate">
          Join AfuChat to post, chat, and connect!
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/auth/signin')}
            className="h-7 px-3 text-xs font-medium"
          >
            Sign In
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/auth/signup')}
            className="h-7 px-3 text-xs font-medium bg-primary hover:bg-primary/90"
          >
            Sign Up
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