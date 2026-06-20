import { ReactNode } from 'react';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  showUpgrade?: boolean;
  requiredTier?: SubscriptionTier;
}

const tierNames: Record<SubscriptionTier, string> = {
  none: 'Premium',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum'
};

export const PremiumGate = ({ 
  children, 
  feature = 'this feature', 
  showUpgrade = true,
  requiredTier = 'silver'
}: PremiumGateProps) => {
  const { tier, loading, hasTierAccess } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has required tier access
  const hasAccess = hasTierAccess(requiredTier);

  if (!hasAccess && showUpgrade) {
    const requiredTierName = tierNames[requiredTier];
    const currentTierName = tier !== 'none' ? tierNames[tier] : null;
    
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Card className="p-8 text-center bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Crown className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-2">
            <Lock className="h-6 w-6" />
            {requiredTierName}+ Required
          </h2>
          
          <p className="text-muted-foreground mb-2">
            {feature} requires {requiredTierName} tier or higher
          </p>
          
          {currentTierName && (
            <p className="text-sm text-muted-foreground mb-6">
              Your current tier: <span className="font-medium text-foreground">{currentTierName}</span>
            </p>
          )}

          <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Verified Badge</p>
                <p className="text-sm text-muted-foreground">Get the verified checkmark on your profile</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Tier-Exclusive Features</p>
                <p className="text-sm text-muted-foreground">Access features based on your subscription tier</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Priority Support</p>
                <p className="text-sm text-muted-foreground">Get faster response times and dedicated support</p>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => navigate('/premium')}
            className="gap-2"
          >
            <Crown className="h-5 w-5" />
            {currentTierName ? `Upgrade to ${requiredTierName}` : 'View Premium Plans'}
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
