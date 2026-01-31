import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface ChatRedEnvelopeProps {
  envelope: any;
  onClaim: () => void;
}

export const ChatRedEnvelope = ({ envelope, onClaim }: ChatRedEnvelopeProps) => {
  const { user } = useAuth();
  const [claiming, setClaiming] = useState(false);

  const { data: hasClaimed } = useQuery({
    queryKey: ['red_envelope_claim', envelope.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('red_envelope_claims')
        .select('amount')
        .eq('red_envelope_id', envelope.id)
        .eq('claimer_id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const handleClaim = async () => {
    if (!user) {
      toast.error('Please sign in to claim');
      return;
    }

    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc('claim_red_envelope', {
        p_envelope_id: envelope.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; amount?: number; is_last?: boolean };

      if (result.success) {
        toast.success(
          <div className="space-y-1">
            <p className="font-bold text-lg">🎉 You got {result.amount} Nexa!</p>
            <p className="text-sm">{result.message}</p>
            {result.is_last && <p className="text-xs">You claimed the last one!</p>}
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
  const isExpired = envelope.expires_at && new Date(envelope.expires_at) < new Date();

  return (
    <div className="flex justify-start mb-2">
      <Card className="border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-600/10 max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Gift className="h-8 w-8 text-red-500 flex-shrink-0 mt-1" />
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{envelope.sender?.display_name}'s Red Envelope</p>
              
              {envelope.message && (
                <p className="text-xs italic mt-1 text-muted-foreground">"{envelope.message}"</p>
              )}
              
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{envelope.claimed_count}/{envelope.recipient_count} claimed</span>
                  <span className="text-muted-foreground">{envelope.total_amount} Nexa</span>
                </div>
                <div className="w-full bg-background/50 rounded-full h-1.5">
                  <div 
                    className="bg-red-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3">
                {hasClaimed ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-1.5 text-center">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      ✓ Claimed {hasClaimed.amount} Nexa
                    </p>
                  </div>
                ) : isFull ? (
                  <div className="bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-center">
                    <p className="text-xs font-medium text-muted-foreground">
                      🧧 All envelopes claimed!
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Better luck next time
                    </p>
                  </div>
                ) : isExpired ? (
                  <div className="bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-center">
                    <p className="text-xs font-medium text-muted-foreground">
                      ⏰ This envelope has expired
                    </p>
                  </div>
                ) : (
                  <Button 
                    size="sm"
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={handleClaim}
                    disabled={claiming}
                  >
                    {claiming ? (
                      'Opening...'
                    ) : (
                      <>
                        <Sparkles className="mr-1 h-3 w-3" />
                        Open 🧧
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
