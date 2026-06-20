import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, Sparkles, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';

interface RedEnvelopeCardProps {
  envelope: any;
  onClaim: () => void;
}

export const RedEnvelopeCard = ({ envelope, onClaim }: RedEnvelopeCardProps) => {
  const { user } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const { isPremium, tier, hasTierAccess } = usePremiumStatus();
  const navigate = useNavigate();

  // Get max claims per day based on tier
  const getMaxDailyClaims = (): number => {
    if (hasTierAccess('platinum')) return Infinity;
    if (hasTierAccess('gold')) return 5;
    if (hasTierAccess('silver')) return 1;
    return 1;
  };
  const maxDailyClaims = getMaxDailyClaims();

  // Check if user has claimed this envelope
  const { data: hasClaimed } = useQuery({
    queryKey: ['red_envelope_claim', envelope.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('red_envelope_claims')
        .select('amount')
        .eq('red_envelope_id', envelope.id)
        .eq('claimer_id', user?.id)
        .single();
      
      return data;
    },
    enabled: !!user?.id
  });

  // Check claim count for today
  const { data: todayClaimCount } = useQuery({
    queryKey: ['daily_red_envelope_claims', user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count, error } = await supabase
        .from('red_envelope_claims')
        .select('*', { count: 'exact', head: true })
        .eq('claimer_id', user?.id)
        .gte('claimed_at', today.toISOString());
      
      return count || 0;
    },
    enabled: !!user?.id && maxDailyClaims !== Infinity
  });

  const hasReachedDailyLimit = maxDailyClaims !== Infinity && (todayClaimCount || 0) >= maxDailyClaims;

  const handleClaim = async () => {
    if (!user) {
      toast.error('Please sign in to claim');
      return;
    }

    // Check daily limit for non-premium users
    if (hasReachedDailyLimit) {
      toast.error(
        <div className="space-y-2">
          <p className="font-semibold">Daily limit reached!</p>
          <p className="text-sm">
            {tier === 'silver' && 'Silver tier: 1 claim per day.'}
            {tier === 'gold' && 'Gold tier: 5 claims per day.'}
            {tier === 'none' && 'Free tier: 1 claim per day.'}
            {' '}Upgrade for more claims!
          </p>
          <Button 
            size="sm" 
            className="w-full mt-2 bg-primary"
            onClick={() => navigate('/premium')}
          >
            <Crown className="mr-2 h-4 w-4" />
            {tier === 'none' ? 'Get Premium' : 'Upgrade Tier'}
          </Button>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc('claim_red_envelope', {
        p_envelope_id: envelope.id
      });

      if (error) {
        // Check if error is due to daily limit (RLS policy rejection)
        if (error.message.includes('row-level security') || error.code === '42501') {
          toast.error(
            <div className="space-y-2">
              <p className="font-semibold">Daily limit reached!</p>
              <p className="text-sm">Upgrade to Premium for unlimited claims.</p>
              <Button 
                size="sm" 
                className="w-full mt-2 bg-primary"
                onClick={() => navigate('/premium')}
              >
                <Crown className="mr-2 h-4 w-4" />
                Get Premium
              </Button>
            </div>,
            { duration: 6000 }
          );
          return;
        }
        throw error;
      }

      const result = data as { success: boolean; message: string; amount?: number; is_last?: boolean };

      if (result.success) {
        toast.success(
          <div className="space-y-1">
            <p className="font-bold text-lg">🎉 You got {result.amount} Nexa!</p>
            <p className="text-sm">{result.message}</p>
            {result.is_last && <p className="text-xs text-muted-foreground">You claimed the last one!</p>}
          </div>,
          { duration: 5000 }
        );
        onClaim();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error claiming red envelope:', error);
      toast.error('Failed to claim red envelope');
    } finally {
      setClaiming(false);
    }
  };

  const progress = (envelope.claimed_count / envelope.recipient_count) * 100;
  const isFull = envelope.claimed_count >= envelope.recipient_count;

  return (
    <Card className="relative overflow-hidden border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-600/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-red-500">
            <AvatarImage src={envelope.sender?.avatar_url || undefined} />
            <AvatarFallback className="bg-red-500 text-white">
              {envelope.sender?.display_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium">{envelope.sender?.display_name}'s Red Envelope</p>
                <p className="text-sm text-muted-foreground">
                  {envelope.total_amount} Nexa · {envelope.recipient_count} people
                </p>
              </div>
              <Gift className="h-6 w-6 text-red-500" />
            </div>

            {envelope.message && (
              <p className="text-sm italic mb-3 text-muted-foreground">
                "{envelope.message}"
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{envelope.claimed_count} / {envelope.recipient_count} claimed</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4">
              {hasClaimed ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 text-center">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    ✓ You claimed {hasClaimed.amount} Nexa!
                  </p>
                </div>
              ) : isFull ? (
                <Button className="w-full" variant="outline" disabled>
                  All Claimed
                </Button>
              ) : hasReachedDailyLimit ? (
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-muted text-muted-foreground"
                    onClick={handleClaim}
                  >
                    <Crown className="mr-2 h-4 w-4 text-amber-500" />
                    Daily Limit ({todayClaimCount}/{maxDailyClaims})
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    {tier === 'platinum' ? '' : tier === 'gold' ? 'Upgrade to Platinum for unlimited' : 'Upgrade for more daily claims'}
                  </p>
                </div>
              ) : (
                <Button 
                  className="w-full bg-red-500 hover:bg-red-600 group"
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  {claiming ? (
                    'Opening...'
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 group-hover:animate-spin" />
                      Open Red Envelope 🧧
                    </>
                  )}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Expires: {new Date(envelope.expires_at).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
