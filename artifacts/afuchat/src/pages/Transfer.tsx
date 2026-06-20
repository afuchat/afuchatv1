import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Scan, Send, Wallet, History } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';

interface Transfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  message: string | null;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url: string | null;
    handle: string;
  };
  receiver?: {
    display_name: string;
    avatar_url: string | null;
    handle: string;
  };
}

const Transfer = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const receiverId = searchParams.get('to');

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [receiverHandle, setReceiverHandle] = useState('');
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Fetch user's Nexa balance
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('xp, display_name')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch transfer history
  const { data: transfers } = useQuery({
    queryKey: ['transfers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_transfers')
        .select(`
          *,
          sender:profiles!xp_transfers_sender_id_fkey(display_name, avatar_url, handle),
          receiver:profiles!xp_transfers_receiver_id_fkey(display_name, avatar_url, handle)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Transfer[];
    },
    enabled: !!user?.id
  });

  const handleSearchUser = async () => {
    if (!receiverHandle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, handle')
        .eq('handle', receiverHandle.trim())
        .single();

      if (error || !data) {
        toast.error('User not found');
        return;
      }

      if (data.id === user?.id) {
        toast.error('Cannot transfer to yourself');
        return;
      }

      setReceiverProfile(data);
    } catch (error) {
      console.error('Error searching user:', error);
      toast.error('Failed to search user');
    }
  };

  const handleTransfer = async () => {
    if (!user) {
      toast.error('Please sign in to transfer Nexa');
      return;
    }

    const nexaAmount = parseInt(amount);
    if (!nexaAmount || nexaAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!receiverProfile) {
      toast.error('Please select a recipient');
      return;
    }

    if (nexaAmount > (profile?.xp || 0)) {
      toast.error('Insufficient Nexa balance');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('process_xp_transfer', {
        p_receiver_id: receiverProfile.id,
        p_amount: nexaAmount,
        p_message: message.trim() || null
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (result.success) {
        toast.success(`Successfully transferred ${nexaAmount} Nexa!`);
        setAmount('');
        setMessage('');
        setReceiverProfile(null);
        setReceiverHandle('');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error transferring Nexa:', error);
      toast.error('Failed to transfer Nexa');
    } finally {
      setLoading(false);
    }
  };

  const myQRData = JSON.stringify({
    type: 'xp_transfer',
    userId: user?.id,
    handle: profile?.display_name
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <PageHeader 
        title="Transfer Nexa" 
        icon={<Send className="h-5 w-5 text-primary" />}
      />

      <div className="max-w-4xl mx-auto">

        {/* Balance Card */}
        <div className="p-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold">{profile?.xp?.toLocaleString() || 0} Nexa</p>
                </div>
                <Wallet className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send">
              <Send className="h-4 w-4 mr-2" />
              Send
            </TabsTrigger>
            <TabsTrigger value="receive">
              <Scan className="h-4 w-4 mr-2" />
              Receive
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Nexa</CardTitle>
                <CardDescription>Transfer Nexa to another user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search User */}
                <div className="space-y-2">
                  <Label htmlFor="handle">Recipient Handle</Label>
                  <div className="flex gap-2">
                    <Input
                      id="handle"
                      placeholder="@username"
                      value={receiverHandle}
                      onChange={(e) => setReceiverHandle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                    />
                    <Button onClick={handleSearchUser}>Search</Button>
                  </div>
                </div>

                {/* Selected User */}
                {receiverProfile && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={receiverProfile.avatar_url || undefined} />
                          <AvatarFallback>{receiverProfile.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{receiverProfile.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{receiverProfile.handle}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (Nexa)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a note..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleTransfer}
                  disabled={loading || !receiverProfile || !amount}
                >
                  {loading ? 'Processing...' : 'Transfer Nexa'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receive Tab */}
          <TabsContent value="receive">
            <Card>
              <CardHeader>
                <CardTitle>Receive Nexa</CardTitle>
                <CardDescription>Show your QR code to receive Nexa</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="bg-white p-6 rounded-lg">
                  <QRCodeSVG value={myQRData} size={200} />
                </div>
                <div className="text-center">
                  <p className="font-medium">{profile?.display_name}</p>
                  <p className="text-sm text-muted-foreground">Scan to transfer Nexa</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Transfer History</CardTitle>
                <CardDescription>Your recent Nexa transfers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transfers?.map((transfer) => {
                    const isSent = transfer.sender_id === user?.id;
                    const otherUser = isSent ? transfer.receiver : transfer.sender;

                    return (
                      <div key={transfer.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={otherUser?.avatar_url || undefined} />
                            <AvatarFallback>{otherUser?.display_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {isSent ? 'Sent to' : 'Received from'} {otherUser?.display_name}
                            </p>
                            {transfer.message && (
                              <p className="text-sm text-muted-foreground">{transfer.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(transfer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={`text-right ${isSent ? 'text-red-500' : 'text-green-500'}`}>
                          <p className="font-bold">
                            {isSent ? '-' : '+'}{transfer.amount} Nexa
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {(!transfers || transfers.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No transfers yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Transfer;
