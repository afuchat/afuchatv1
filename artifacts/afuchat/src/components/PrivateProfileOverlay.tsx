import { Lock, UserX, Clock, Check, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PrivateProfileOverlayProps {
  handle: string;
  requestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  onFollowRequest?: () => void;
  onFollowBack?: () => void;
  isLoading?: boolean;
  isFollowedByProfile?: boolean; // Does the private user follow the current user?
}

export const PrivateProfileOverlay = ({ 
  handle, 
  requestStatus = 'none',
  onFollowRequest,
  onFollowBack,
  isLoading = false,
  isFollowedByProfile = false
}: PrivateProfileOverlayProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const renderActionButton = () => {
    if (!user) {
      return (
        <Button 
          onClick={() => navigate('/auth')}
          className="mt-2 rounded-full px-6"
        >
          Sign in to Follow
        </Button>
      );
    }

    // If the private user follows the current user, show "Follow Back" instead of "Request"
    if (isFollowedByProfile && requestStatus === 'none') {
      return (
        <Button 
          onClick={onFollowBack}
          className="mt-2 rounded-full px-6"
          disabled={isLoading}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {isLoading ? 'Following...' : 'Follow Back'}
        </Button>
      );
    }

    switch (requestStatus) {
      case 'pending':
        return (
          <div className="mt-2 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Request Pending</span>
            </div>
            <p className="text-xs text-muted-foreground/70">
              Waiting for @{handle} to approve your request
            </p>
          </div>
        );
      case 'approved':
        return (
          <div className="mt-2 flex items-center gap-2 text-green-500">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Request Approved</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="mt-2 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Your follow request was declined
            </p>
            {onFollowRequest && (
              <Button 
                onClick={onFollowRequest}
                variant="outline"
                className="rounded-full px-6"
                disabled={isLoading}
              >
                Request Again
              </Button>
            )}
          </div>
        );
      default:
        return onFollowRequest && (
          <Button 
            onClick={onFollowRequest}
            className="mt-2 rounded-full px-6"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Request to Follow'}
          </Button>
        );
    }
  };

  // Different message based on whether the private user follows current user
  const getMessage = () => {
    if (isFollowedByProfile && requestStatus === 'none') {
      return `@${handle} follows you. Follow back to see their posts, photos, and other content.`;
    }
    return `Follow @${handle} to see their posts, photos, and other content.`;
  };

  return (
    <Card className="p-8 text-center bg-muted/30 border-dashed border-2 border-muted-foreground/20">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-muted/50">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">This Account is Private</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {getMessage()}
          </p>
        </div>
        {renderActionButton()}
      </div>
    </Card>
  );
};

// Masked placeholder for private profile data
export const PrivateDataPlaceholder = ({ type }: { type: 'avatar' | 'name' | 'bio' | 'stats' }) => {
  switch (type) {
    case 'avatar':
      return (
        <div className="w-full h-full rounded-full bg-muted/50 flex items-center justify-center">
          <UserX className="h-8 w-8 text-muted-foreground/50" />
        </div>
      );
    case 'name':
      return (
        <div className="flex items-center gap-2">
          <div className="h-6 w-32 bg-muted/50 rounded animate-pulse" />
          <Lock className="h-4 w-4 text-muted-foreground/50" />
        </div>
      );
    case 'bio':
      return (
        <div className="space-y-2 mt-3">
          <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
        </div>
      );
    case 'stats':
      return (
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-muted-foreground/50">Hidden</span>
        </div>
      );
    default:
      return null;
  }
};
