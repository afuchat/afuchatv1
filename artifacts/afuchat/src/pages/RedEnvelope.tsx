import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Gift, Users, Sparkles, TrendingUp, Share2, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RedEnvelopeCard } from '@/components/red-envelope/RedEnvelopeCard';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const RedEnvelope = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, hasTierAccess } = usePremiumStatus();
  const canCreateRedEnvelopes = hasTierAccess('platinum');
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claim');

  const [totalAmount, setTotalAmount] = useState('');
  const [recipientCount, setRecipientCount] = useState('');
  const [message, setMessage] = useState('');
  const [envelopeType, setEnvelopeType] = useState<'random' | 'equal'>('random');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Fetch user's Nexa
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

  // Fetch active red envelopes
  const { data: activeEnvelopes, refetch } = useQuery({
    queryKey: ['red_envelopes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('red_envelopes')
        .select(`
          *,
          sender:profiles!red_envelopes_sender_id_fkey(display_name, avatar_url, handle)
        `)
        .eq('is_expired', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []).filter(e => e.claimed_count < e.recipient_count);
    }
  });

  // Fetch my sent envelopes
  const { data: myEnvelopes, refetch: refetchMy } = useQuery({
    queryKey: ['my_red_envelopes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('red_envelopes')
        .select(`
          *,
          claims:red_envelope_claims(count)
        `)
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch envelope to claim from URL
  const { data: claimEnvelope, refetch: refetchClaim } = useQuery({
    queryKey: ['claim-envelope', claimId, user?.id],
    queryFn: async () => {
      if (!claimId) return null;
      
      const { data: envelope, error } = await supabase
        .from('red_envelopes')
        .select('*, sender:profiles!red_envelopes_sender_id_fkey(display_name, handle, avatar_url)')
        .eq('id', claimId)
        .single();
      
      if (error) return null;

      // Check if already claimed
      const { data: claim } = await supabase
        .from('red_envelope_claims')
        .select('amount')
        .eq('red_envelope_id', claimId)
        .eq('claimer_id', user?.id)
        .single();

      return { envelope, hasClaimed: !!claim, claimedAmount: claim?.amount };
    },
    enabled: !!claimId && !!user?.id
  });

  // Copy share link
  const copyShareLink = (envelopeId: string) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/red-envelope?claim=${envelopeId}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(envelopeId);
    toast.success('Share link copied to clipboard!');
    
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Share to platform (native share or copy)
  const shareEnvelope = async (envelopeId: string, envelopeMessage?: string) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/red-envelope?claim=${envelopeId}`;
    const text = envelopeMessage 
      ? `🧧 ${envelopeMessage}\n\nClaim your lucky Nexa on AfuChat!`
      : `🧧 I'm sharing a Red Envelope on AfuChat!\n\nClaim your lucky Nexa!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '🧧 Red Envelope',
          text,
          url: shareUrl
        });
      } catch (err) {
        copyShareLink(envelopeId);
      }
    } else {
      copyShareLink(envelopeId);
    }
  };

  // Get Telegram share link
  const getTelegramShareLink = (envelopeId: string, envelopeMessage?: string) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/red-envelope?claim=${envelopeId}`;
    const text = encodeURIComponent(
      envelopeMessage 
        ? `🧧 ${envelopeMessage}\n\nClaim your lucky Nexa on AfuChat!`
        : `🧧 I'm sharing a Red Envelope on AfuChat! Claim your lucky Nexa!`
    );
    return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
  };

  // Claim red envelope
  const handleClaim = async (envelopeId: string) => {
    if (!user) {
      toast.error('Please sign in to claim');
      return;
    }

    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_red_envelope', {
        p_envelope_id: envelopeId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; amount?: number };

      if (result.success) {
        toast.success(
          <div className="space-y-1">
            <p className="font-bold text-lg">🎉 You got {result.amount} Nexa!</p>
            <p className="text-sm">{result.message}</p>
          </div>,
          { duration: 5000 }
        );
        refetch();
        refetchClaim();
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Claim error:', error);
      toast.error('Failed to claim red envelope');
    } finally {
      setClaiming(false);
    }
  };

  const handleCreateEnvelope = async () => {
    if (!user) {
      toast.error('Please sign in');
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
        p_envelope_type: envelopeType
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; envelope_id?: string };

      if (result.success) {
        toast.success('Red envelope created!');
        setTotalAmount('');
        setRecipientCount('');
        setMessage('');
        refetch();
        refetchMy();
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        
        // Copy share link for the new envelope
        if (result.envelope_id) {
          setTimeout(() => copyShareLink(result.envelope_id!), 500);
        }
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto">
        {/* Claim from URL - Show at top if there's a claim ID */}
        {claimId && claimEnvelope?.envelope && (
          <div className="p-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-500 rounded-full">
                      <Gift className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">
                        🧧 {claimEnvelope.envelope.sender?.display_name}'s Red Envelope
                      </h3>
                      {claimEnvelope.envelope.message && (
                        <p className="text-sm italic text-muted-foreground">
                          "{claimEnvelope.envelope.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span>{claimEnvelope.envelope.claimed_count}/{claimEnvelope.envelope.recipient_count} claimed</span>
                    <span>{claimEnvelope.envelope.total_amount} Nexa total</span>
                  </div>
                  
                  <Progress 
                    value={(claimEnvelope.envelope.claimed_count / claimEnvelope.envelope.recipient_count) * 100} 
                    className="h-2 mb-4"
                  />

                  {claimEnvelope.hasClaimed ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        ✓ You claimed {claimEnvelope.claimedAmount} Nexa
                      </p>
                    </div>
                  ) : claimEnvelope.envelope.claimed_count >= claimEnvelope.envelope.recipient_count ? (
                    <Button className="w-full" disabled variant="outline">
                      All Claimed
                    </Button>
                  ) : claimEnvelope.envelope.is_expired ? (
                    <Button className="w-full" disabled variant="outline">
                      Expired
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleClaim(claimId)}
                      disabled={claiming}
                    >
                      {claiming ? 'Opening...' : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Open Red Envelope 🧧
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Balance Card */}
        <div className="p-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold">{profile?.xp?.toLocaleString() || 0} Nexa</p>
                </div>
                <Gift className="h-12 w-12 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={claimId ? "active" : "create"} className="px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">
              <Sparkles className="h-4 w-4 mr-2" />
              Create
            </TabsTrigger>
            <TabsTrigger value="active">
              <TrendingUp className="h-4 w-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="my">
              <Users className="h-4 w-4 mr-2" />
              My History
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-4">
            {canCreateRedEnvelopes ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create Red Envelope</CardTitle>
                  <CardDescription>
                    Share Nexa with multiple friends - they'll get random amounts!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Total Nexa Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="100"
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
                      placeholder="5"
                      value={recipientCount}
                      onChange={(e) => setRecipientCount(e.target.value)}
                      min="1"
                      max="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Distribution Type</Label>
                    <Select value={envelopeType} onValueChange={(v: 'random' | 'equal') => setEnvelopeType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">🎲 Random Amount (Lucky Draw)</SelectItem>
                        <SelectItem value="equal">⚖️ Equal Split</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {envelopeType === 'random' 
                        ? 'Each person gets a random amount - more exciting!' 
                        : 'Everyone gets the same amount'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Happy holidays! 🎉"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      maxLength={100}
                    />
                  </div>

                  <Button 
                    className="w-full bg-red-500 hover:bg-red-600" 
                    onClick={handleCreateEnvelope}
                    disabled={loading || !totalAmount || !recipientCount}
                  >
                    {loading ? 'Creating...' : 'Create & Get Share Link 🧧'}
                  </Button>

                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium">How it works:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Your Nexa is immediately deducted when you create</li>
                      <li>Share the link with friends on any platform</li>
                      <li>They can claim until all spots are taken or 24 hours pass</li>
                      <li>Random mode: Each claim gets a different random amount</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/20">
                <CardContent className="py-12 text-center space-y-4">
                  <Gift className="h-16 w-16 mx-auto text-red-500" />
                  <div>
                    <h3 className="text-lg font-semibold">Platinum Feature</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Creating red envelopes requires a Platinum subscription.
                      {tier !== 'none' && (
                        <span className="block mt-1">Your current tier: <span className="font-medium">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span></span>
                      )}
                    </p>
                  </div>
                  <Button onClick={() => navigate('/premium')} className="bg-gradient-to-r from-primary to-primary/80">
                    {tier !== 'none' ? 'Upgrade to Platinum' : 'View Premium Plans'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You can still claim red envelopes from others
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Tab */}
          <TabsContent value="active">
            <div className="space-y-3">
              {activeEnvelopes && activeEnvelopes.length > 0 ? (
                activeEnvelopes.map((envelope) => (
                  <RedEnvelopeCard
                    key={envelope.id}
                    envelope={envelope}
                    onClaim={refetch}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No active red envelopes</p>
                    <p className="text-xs text-muted-foreground mt-1">Create one and share with friends!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* My History Tab */}
          <TabsContent value="my">
            <div className="space-y-3">
              {myEnvelopes && myEnvelopes.length > 0 ? (
                myEnvelopes.map((envelope) => (
                  <Card key={envelope.id} className="border-red-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-red-500" />
                          <span className="font-medium">{envelope.total_amount} Nexa</span>
                          <Badge variant={envelope.is_expired ? "secondary" : "default"} className="text-xs">
                            {envelope.is_expired ? 'Expired' : 'Active'}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(envelope.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {envelope.message && (
                        <p className="text-sm italic text-muted-foreground mb-3">"{envelope.message}"</p>
                      )}

                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {envelope.claimed_count}/{envelope.recipient_count} claimed
                        </span>
                      </div>

                      <Progress 
                        value={(envelope.claimed_count / envelope.recipient_count) * 100} 
                        className="h-1.5 mb-4"
                      />

                      {!envelope.is_expired && envelope.claimed_count < envelope.recipient_count && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => copyShareLink(envelope.id)}
                          >
                            {copiedId === envelope.id ? (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-3 w-3" />
                                Copy Link
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => shareEnvelope(envelope.id, envelope.message)}
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <a 
                              href={getTelegramShareLink(envelope.id, envelope.message)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No red envelopes sent yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RedEnvelope;
