import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface SendRedEnvelopeDialogProps {
  chatId: string;
  onSuccess: () => void;
}

export const SendRedEnvelopeDialog = ({ chatId, onSuccess }: SendRedEnvelopeDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canCreateRedEnvelopes, tier } = useSubscription();
  const [open, setOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [recipientCount, setRecipientCount] = useState('');
  const [message, setMessage] = useState('');
  const [envelopeType, setEnvelopeType] = useState<'random' | 'equal'>('random');
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id && open
  });

  const handleSend = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    if (!canCreateRedEnvelopes()) {
      toast.error('Platinum subscription required to create red envelopes');
      navigate('/premium');
      setOpen(false);
      return;
    }

    const amount = parseInt(totalAmount);
    const count = parseInt(recipientCount);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!count || count <= 0 || count > 100) {
      toast.error('Recipient count must be between 1 and 100');
      return;
    }

    if (amount < count) {
      toast.error('Total amount must be at least equal to recipient count');
      return;
    }

      if (amount > (profile?.xp || 0)) {
      toast.error('Insufficient Nexa balance');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_red_envelope', {
        p_total_amount: amount,
        p_recipient_count: count,
        p_message: message.trim() || null,
        p_envelope_type: envelopeType,
        p_chat_id: chatId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (result.success) {
        toast.success('🧧 Red envelope sent!');
        setOpen(false);
        setTotalAmount('');
        setRecipientCount('');
        setMessage('');
        onSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error creating red envelope:', error);
      toast.error('Failed to create red envelope');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Gift className="h-5 w-5 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Red Envelope 🧧</DialogTitle>
          <DialogDescription>
            Send Nexa to group members in a fun way!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Your Nexa Balance</Label>
            <div className="text-2xl font-bold text-primary">
              {profile?.xp?.toLocaleString() || 0} Nexa
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Total Amount (Nexa)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g., 100"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Number of Recipients</Label>
            <Input
              id="count"
              type="number"
              placeholder="e.g., 10"
              value={recipientCount}
              onChange={(e) => setRecipientCount(e.target.value)}
              min="1"
              max="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Distribution Type</Label>
            <Select value={envelopeType} onValueChange={(v) => setEnvelopeType(v as 'random' | 'equal')}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random (More fun!)</SelectItem>
                <SelectItem value="equal">Equal Split</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {envelopeType === 'random' 
                ? 'Recipients get random amounts - more exciting!' 
                : 'Everyone gets the same amount'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Best wishes!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={100}
            />
          </div>

          <Button 
            onClick={handleSend} 
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            {loading ? 'Sending...' : `Send Red Envelope 🧧`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
