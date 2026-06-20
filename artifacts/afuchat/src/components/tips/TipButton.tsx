import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Coins, Banknote } from 'lucide-react';
import { toast } from 'sonner';

interface TipButtonProps {
  receiverId: string;
  receiverName: string;
  postId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export const TipButton = ({
  receiverId,
  receiverName,
  postId,
  variant = 'ghost',
  size = 'sm',
  showLabel = true,
  className,
}: TipButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userXP, setUserXP] = useState(0);

  const fetchUserNexa = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();

    if (data) {
      setUserXP(data.xp);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchUserNexa();
    } else {
      setAmount('');
      setMessage('');
    }
  };

  const quickAmounts = [10, 25, 50, 100, 250];

  const handleSendTip = async () => {
    if (!user) {
      toast.error('Please sign in to send tips');
      return;
    }

    const tipAmount = parseInt(amount);
    if (!tipAmount || tipAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('send_tip', {
        p_receiver_id: receiverId,
        p_xp_amount: tipAmount,
        p_post_id: postId || undefined,
        p_message: message || undefined,
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        message: string; 
        new_sender_xp?: number;
      };

      if (result.success) {
        toast.success(`Tipped ${tipAmount} Nexa to ${receiverName}!`, {
          description: message || 'Thank you for supporting this creator!',
        });
        setOpen(false);
        
        // Dispatch Nexa update event
        window.dispatchEvent(new CustomEvent('nexa-updated', { 
          detail: { nexa: result.new_sender_xp } 
        }));
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Tip error:', error);
      toast.error('Failed to send tip');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id === receiverId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={`gap-1.5 ${className || ''}`}>
          <Banknote className="w-4 h-4 text-green-500" />
          {showLabel && <span className="text-green-500 font-semibold text-sm">Tip</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Tip to {receiverName}</DialogTitle>
          <DialogDescription>
            Support this creator with Nexa. Your current balance: <Badge variant="outline" className="ml-1">{userXP} Nexa</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Amount (Nexa)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max={userXP}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((quick) => (
              <Button
                key={quick}
                variant="outline"
                size="sm"
                onClick={() => setAmount(quick.toString())}
                disabled={quick > userXP}
              >
                {quick} Nexa
              </Button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Message (Optional)</label>
            <Textarea
              placeholder="Add a message with your tip..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/200
            </p>
          </div>

          <Button
            onClick={handleSendTip}
            disabled={!amount || parseInt(amount) <= 0 || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Send {amount || '0'} Nexa Tip
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
