import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  Gift, 
  Heart, 
  Mail, 
  Send, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coins, 
  Eye, 
  EyeOff, 
  RefreshCw,
  QrCode,
  CreditCard,
  ArrowRightLeft,
  History,
  ChevronRight,
  Shield,
  Zap,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ACoinConverter } from '@/components/currency/ACoinConverter';
import { PesapalPaymentDialog } from '@/components/currency/PesapalPaymentDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { NexaProgressBar } from '@/components/gamification/NexaProgressBar';
import { type Grade } from '@/components/gamification/GradeBadge';

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPesapalDialog, setShowPesapalDialog] = useState(false);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const [gifts, tips, transfers, redEnvSent, redEnvClaimed, conversions] = await Promise.all([
        supabase
          .from('gift_transactions')
          .select('*, sender:profiles!gift_transactions_sender_id_fkey(display_name, handle), receiver:profiles!gift_transactions_receiver_id_fkey(display_name, handle), gift:gifts(*)')
          .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('tips')
          .select('*, sender:profiles!tips_sender_id_fkey(display_name, handle), receiver:profiles!tips_receiver_id_fkey(display_name, handle)')
          .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('xp_transfers')
          .select('*, sender:profiles!xp_transfers_sender_id_fkey(display_name, handle), receiver:profiles!xp_transfers_receiver_id_fkey(display_name, handle)')
          .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('red_envelopes')
          .select('*')
          .eq('sender_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('red_envelope_claims')
          .select('*, envelope:red_envelopes(*, sender:profiles(display_name, handle))')
          .eq('claimer_id', user!.id)
          .order('claimed_at', { ascending: false })
          .limit(50),
        supabase
          .from('acoin_transactions')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      const all: any[] = [
        ...(gifts.data || []).map(t => ({ ...t, type: 'gift', timestamp: t.created_at })),
        ...(tips.data || []).map(t => ({ ...t, type: 'tip', timestamp: t.created_at })),
        ...(transfers.data || []).map(t => ({ ...t, type: 'transfer', timestamp: t.created_at })),
        ...(redEnvSent.data || []).map(t => ({ ...t, type: 'red_envelope_sent', timestamp: t.created_at })),
        ...(redEnvClaimed.data || []).map(t => ({ ...t, type: 'red_envelope_claimed', timestamp: t.claimed_at })),
        ...(conversions.data || []).map(t => ({ ...t, type: 'conversion', timestamp: t.created_at }))
      ];

      return all.sort((a, b) => 
        new Date(b.timestamp).getTime() - 
        new Date(a.timestamp).getTime()
      );
    },
    enabled: !!user?.id
  });

  const getTransactionIcon = (type: string) => {
    const iconClasses = "h-4 w-4";
    
    switch (type) {
      case 'gift': 
        return <Gift className={`${iconClasses} text-pink-500`} />;
      case 'tip': 
        return <Heart className={`${iconClasses} text-red-500`} />;
      case 'transfer': 
        return <Send className={`${iconClasses} text-primary`} />;
      case 'red_envelope_sent': 
        return <Mail className={`${iconClasses} text-red-500`} />;
      case 'red_envelope_claimed': 
        return <Mail className={`${iconClasses} text-green-500`} />;
      case 'conversion': 
        return <ArrowRightLeft className={`${iconClasses} text-yellow-600`} />;
      default: 
        return <TrendingUp className={`${iconClasses} text-primary`} />;
    }
  };

  const getTransactionBg = (type: string) => {
    switch (type) {
      case 'gift': return 'bg-pink-500/10';
      case 'tip': return 'bg-red-500/10';
      case 'transfer': return 'bg-primary/10';
      case 'red_envelope_sent': return 'bg-red-500/10';
      case 'red_envelope_claimed': return 'bg-green-500/10';
      case 'conversion': return 'bg-yellow-500/10';
      default: return 'bg-primary/10';
    }
  };

  const getTransactionLabel = (transaction: any) => {
    if (transaction.type === 'gift') {
      const isSender = transaction.sender_id === user?.id;
      return isSender 
        ? `Gift to @${transaction.receiver?.handle || 'user'}`
        : `Gift from @${transaction.sender?.handle || 'user'}`;
    }
    if (transaction.type === 'tip') {
      const isSender = transaction.sender_id === user?.id;
      return isSender 
        ? `Tip to @${transaction.receiver?.handle || 'user'}`
        : `Tip from @${transaction.sender?.handle || 'user'}`;
    }
    if (transaction.type === 'transfer') {
      const isSender = transaction.sender_id === user?.id;
      return isSender 
        ? `Transfer to @${transaction.receiver?.handle || 'user'}`
        : `Transfer from @${transaction.sender?.handle || 'user'}`;
    }
    if (transaction.type === 'red_envelope_sent') {
      return `Red Envelope sent`;
    }
    if (transaction.type === 'red_envelope_claimed') {
      return `Red Envelope claimed`;
    }
    if (transaction.type === 'conversion') {
      return 'Nexa → ACoin';
    }
    return 'Transaction';
  };

  const getTransactionAmount = (transaction: any) => {
    if (transaction.type === 'red_envelope_sent') {
      return -transaction.total_amount;
    }
    if (transaction.type === 'red_envelope_claimed') {
      return transaction.amount;
    }
    if (transaction.type === 'transfer') {
      const isSender = transaction.sender_id === user?.id;
      return isSender ? -transaction.amount : transaction.amount;
    }
    if (transaction.type === 'conversion') {
      return -(transaction.nexa_spent || 0);
    }
    
    const amount = transaction.xp_cost || transaction.xp_amount || transaction.xp_paid;
    const isSender = transaction.sender_id === user?.id;
    
    if (isSender) {
      return -amount;
    }
    return amount;
  };

  const totalReceived = transactions?.filter(t => getTransactionAmount(t) > 0)
    .reduce((sum, t) => sum + getTransactionAmount(t), 0) || 0;
  
  const totalSent = transactions?.filter(t => getTransactionAmount(t) < 0)
    .reduce((sum, t) => sum + Math.abs(getTransactionAmount(t)), 0) || 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchTransactions()
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
    toast({
      title: "Refreshed",
      description: "Wallet updated",
    });
  };

  // Quick actions
  const quickActions = [
    { icon: Send, label: 'Send', color: 'bg-primary', onClick: () => navigate('/transfer') },
    { icon: QrCode, label: 'Receive', color: 'bg-green-500', onClick: () => navigate('/qr-code') },
    { icon: ArrowRightLeft, label: 'Convert', color: 'bg-yellow-500', onClick: () => {} },
    { icon: Gift, label: 'Gifts', color: 'bg-pink-500', onClick: () => navigate('/gifts') },
  ];

  // Calculate grade progress with updated thresholds
  const getGradeProgress = () => {
    const xp = profile?.xp || 0;
    const grades = [
      { name: 'Newcomer', min: 0, max: 1000 },
      { name: 'Active Chatter', min: 1000, max: 5000 },
      { name: 'Community Builder', min: 5000, max: 20000 },
      { name: 'Rising Star', min: 20000, max: 75000 },
      { name: 'Influencer', min: 75000, max: 250000 },
      { name: 'Elite Creator', min: 250000, max: 750000 },
      { name: 'Champion', min: 750000, max: 2000000 },
      { name: 'Master', min: 2000000, max: 5000000 },
      { name: 'Grandmaster', min: 5000000, max: 10000000 },
      { name: 'Legend', min: 10000000, max: Infinity },
    ];
    
    const currentGrade = grades.find(g => xp >= g.min && xp < g.max) || grades[grades.length - 1];
    const nextGrade = grades[grades.indexOf(currentGrade) + 1];
    
    if (!nextGrade) return { progress: 100, current: currentGrade.name, next: null, needed: 0 };
    
    const progress = ((xp - currentGrade.min) / (nextGrade.min - currentGrade.min)) * 100;
    return { 
      progress: Math.min(progress, 100), 
      current: currentGrade.name, 
      next: nextGrade.name,
      needed: nextGrade.min - xp
    };
  };

  const gradeInfo = getGradeProgress();

  // Check if running in iframe (mini program)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Filter transactions based on active tab
  const filteredTransactions = transactions?.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'received') return getTransactionAmount(t) > 0;
    if (activeTab === 'sent') return getTransactionAmount(t) < 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {!isInIframe && (
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-lg font-bold">Wallet</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>
      )}

      <main className="pb-24">
        {/* Hero Balance Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <div className="relative px-4 pt-6 pb-8">
            {/* Balance Display */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-sm text-primary-foreground/80">Total Balance</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  onClick={() => setShowBalance(!showBalance)}
                >
                  {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-baseline justify-center gap-1"
              >
                {showBalance ? (
                  <>
                    <span className="text-4xl md:text-5xl font-bold tracking-tight">
                      {(profile?.xp || 0).toLocaleString()}
                    </span>
                    <span className="text-lg text-primary-foreground/80">Nexa</span>
                  </>
                ) : (
                  <span className="text-4xl md:text-5xl font-bold tracking-tight">••••••</span>
                )}
              </motion.div>
            </div>

            {/* Quick Stats Row */}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-300 mb-1">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="text-sm font-medium">Received</span>
                </div>
                <p className="text-lg font-bold">+{totalReceived.toLocaleString()}</p>
              </div>
              <div className="h-10 w-px bg-primary-foreground/20" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-300 mb-1">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="text-sm font-medium">Sent</span>
                </div>
                <p className="text-lg font-bold">-{totalSent.toLocaleString()}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center gap-4">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`p-3 ${action.color} rounded-2xl shadow-lg`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-primary-foreground/90">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 -mt-4 relative z-10 space-y-4">
          {/* ACoin Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-yellow-500/10 via-background to-background border-yellow-500/20 shadow-lg overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-md">
                      <Coins className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ACoin Balance</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {showBalance ? (profile?.acoin || 0).toLocaleString() : '••••'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPesapalDialog(true)}
                    className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10 gap-1.5"
                  >
                    <CreditCard className="h-4 w-4" />
                    Buy ACoin
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Grade Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-md border-border/50">
              <CardContent className="p-4">
                <NexaProgressBar 
                  currentNexa={profile?.xp || 0}
                  showDetails={true}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* ACoin Converter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ACoinConverter 
              currentNexa={profile?.xp || 0}
              currentACoin={profile?.acoin || 0}
              onConversionSuccess={() => {
                refetchProfile();
                toast({
                  title: "Success!",
                  description: "Conversion complete",
                });
              }}
            />
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-3"
          >
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-border/50"
              onClick={() => navigate('/red-envelope')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <Mail className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Red Envelope</p>
                    <p className="text-xs text-muted-foreground">Send lucky gifts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-border/50"
              onClick={() => navigate('/creator-earnings')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Earnings</p>
                    <p className="text-xs text-muted-foreground">Creator rewards</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold">Activity</h2>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {transactions?.length || 0} transactions
                  </Badge>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  {['all', 'received', 'sent'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeTab === tab 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                
                {/* Transaction List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {filteredTransactions?.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="inline-flex p-4 bg-muted rounded-2xl mb-3">
                          <WalletIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No transactions yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Start by sending gifts or tips
                        </p>
                      </div>
                    ) : (
                      filteredTransactions?.slice(0, 20).map((transaction, index) => {
                        const amount = getTransactionAmount(transaction);
                        const isNegative = amount < 0;

                        return (
                          <motion.div
                            key={`${transaction.type}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className={`p-2 rounded-xl ${getTransactionBg(transaction.type)}`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {getTransactionLabel(transaction)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
                                {isNegative ? '' : '+'}{Math.abs(amount).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Nexa</p>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-3 p-4 bg-green-500/5 rounded-xl border border-green-500/20">
              <Shield className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Secure Wallet</p>
                <p className="text-xs text-muted-foreground">Your transactions are protected with end-to-end encryption</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* PesaPal Payment Dialog */}
      <PesapalPaymentDialog 
        open={showPesapalDialog}
        onOpenChange={setShowPesapalDialog}
        onSuccess={() => {
          refetchProfile();
          refetchTransactions();
        }}
      />
    </div>
  );
};

export default Wallet;
