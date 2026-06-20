import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SubscriptionExpiryBannerProps {
  daysThreshold?: number; // Show banner if expiring within this many days
}

const EXPIRED_REMINDER_DAYS = 5; // Show reminder for 5 days after expiration
const DISMISS_COOLDOWN_HOURS = 24; // Reappear after 24 hours if dismissed

export function SubscriptionExpiryBanner({ daysThreshold = 7 }: SubscriptionExpiryBannerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [hadSubscription, setHadSubscription] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Trigger cleanup of expired subscriptions
        await supabase.rpc('cleanup_expired_subscriptions');

        // Check for active subscription (expiring soon)
        const { data: activeData } = await supabase
          .from('user_subscriptions')
          .select('expires_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeData?.expires_at) {
          // User has active subscription - check if expiring soon
          const expiry = new Date(activeData.expires_at);
          const now = new Date();
          const diffTime = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setExpiresAt(expiry);
          setDaysRemaining(diffDays);
          setIsExpired(false);
          setHadSubscription(true);
        } else {
          // Check if user ever had a subscription (now expired)
          const { data: expiredData } = await supabase
            .from('user_subscriptions')
            .select('expires_at')
            .eq('user_id', user.id)
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (expiredData?.expires_at) {
            const expiry = new Date(expiredData.expires_at);
            const now = new Date();
            const daysSinceExpiry = Math.floor((now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));
            
            // Only show expired reminder for 5 days after expiration
            if (daysSinceExpiry <= EXPIRED_REMINDER_DAYS) {
              setExpiresAt(expiry);
              setDaysRemaining(-daysSinceExpiry);
              setIsExpired(true);
              setHadSubscription(true);
            } else {
              // More than 5 days since expiration, stop showing
              setHadSubscription(false);
            }
          } else {
            // Never had a subscription
            setHadSubscription(false);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check dismissal from localStorage with timestamp
    const checkDismissal = () => {
      if (!user) return;
      
      const dismissKey = `subscription_expiry_dismissed_${user.id}`;
      const dismissData = localStorage.getItem(dismissKey);
      
      if (dismissData) {
        try {
          const { timestamp } = JSON.parse(dismissData);
          const dismissedAt = new Date(timestamp);
          const now = new Date();
          const hoursSinceDismiss = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60);
          
          // If less than 24 hours since dismissal, keep dismissed
          if (hoursSinceDismiss < DISMISS_COOLDOWN_HOURS) {
            setDismissed(true);
          } else {
            // Clear old dismissal, show banner again
            localStorage.removeItem(dismissKey);
            setDismissed(false);
          }
        } catch {
          localStorage.removeItem(dismissKey);
          setDismissed(false);
        }
      }
    };

    checkDismissal();
    checkSubscription();
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      const dismissKey = `subscription_expiry_dismissed_${user.id}`;
      localStorage.setItem(dismissKey, JSON.stringify({ timestamp: new Date().toISOString() }));
    }
    setDismissed(true);
  };

  // Don't show if loading or dismissed
  if (loading || dismissed) {
    return null;
  }

  // For expired subscriptions: only show if hadSubscription and isExpired
  if (isExpired && hadSubscription) {
    return (
      <div className="relative px-4 py-3 flex items-center gap-3 bg-destructive/15 border-b border-destructive/30">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">
            Your premium subscription has expired!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Renew now to restore your premium features and verified badge.
          </p>
        </div>

        <Button 
          size="sm" 
          variant="destructive"
          onClick={() => navigate('/premium')}
          className="flex-shrink-0 gap-1.5"
        >
          <Crown className="h-4 w-4" />
          Renew
        </Button>

        <button 
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-background/50 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // For active subscriptions expiring soon
  if (!isExpired && expiresAt && daysRemaining !== null && daysRemaining <= daysThreshold) {
    const isUrgent = daysRemaining <= 3;

    return (
      <div 
        className={`relative px-4 py-3 flex items-center gap-3 ${
          isUrgent 
            ? 'bg-orange-500/15 border-b border-orange-500/30' 
            : 'bg-yellow-500/15 border-b border-yellow-500/30'
        }`}
      >
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
          isUrgent ? 'text-orange-500' : 'text-yellow-600'
        }`} />
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${
            isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-700 dark:text-yellow-400'
          }`}>
            {daysRemaining === 1 
              ? 'Your premium subscription expires tomorrow!'
              : daysRemaining === 0
                ? 'Your premium subscription expires today!'
                : `Your premium subscription expires in ${daysRemaining} days`
            }
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Expires on {expiresAt.toLocaleDateString()}
          </p>
        </div>

        <Button 
          size="sm" 
          variant="default"
          onClick={() => navigate('/premium')}
          className="flex-shrink-0 gap-1.5"
        >
          <Crown className="h-4 w-4" />
          Extend
        </Button>

        <button 
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-background/50 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return null;
}
