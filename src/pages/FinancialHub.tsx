import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Wallet, Send, Mail, TrendingUp, Gift, 
  ArrowUpRight, ArrowDownRight, Trophy, Heart, Sparkles, 
  Coins, Megaphone, Eye, EyeOff, ArrowRightLeft, Crown,
  Shield, ChevronRight, Star, Zap, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ACoinConverter } from '@/components/currency/ACoinConverter';
import { GradeBadge, Grade } from '@/components/gamification/GradeBadge';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'transfer' | 'tip' | 'red_envelope' | 'gift';
  amount: number;
  direction: 'sent' | 'received';
  otherParty: {
    id: string;
    name: string;
    avatar: string;
  };
  message?: string;
  created_at: string;
}

interface GradeInfo {
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  icon: string;
}

const grades: GradeInfo[] = [
  { name: 'Bronze', minXp: 0, maxXp: 999, color: 'from-amber-600 to-amber-800', icon: '🥉' },
  { name: 'Silver', minXp: 1000, maxXp: 4999, color: 'from-gray-400 to-gray-600', icon: '🥈' },
  { name: 'Gold', minXp: 5000, maxXp: 19999, color: 'from-yellow-400 to-yellow-600', icon: '🥇' },
  { name: 'Platinum', minXp: 20000, maxXp: 49999, color: 'from-cyan-400 to-cyan-600', icon: '💎' },
  { name: 'Diamond', minXp: 50000, maxXp: 99999, color: 'from-purple-400 to-purple-600', icon: '💠' },
  { name: 'Master', minXp: 100000, maxXp: Infinity, color: 'from-rose-400 to-rose-600', icon: '👑' },
];

const FinancialHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = usePremiumStatus();
  const [balance, setBalance] = useState(0);
  const [acoinBalance, setAcoinBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<Grade>('Newcomer');
  const [loginStreak, setLoginStreak] = useState(0);
  
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const getGradeProgress = (xp: number): number => {
    const gradeThresholds = [0, 100, 500, 2000, 10000];
    for (let i = gradeThresholds.length - 1; i >= 0; i--) {
      if (xp >= gradeThresholds[i]) {
        if (i === gradeThresholds.length - 1) return 100;
        const current = gradeThresholds[i];
        const next = gradeThresholds[i + 1];
        return ((xp - current) / (next - current)) * 100;
      }
    }
    return 0;
  };

  const gradeProgress = getGradeProgress(balance);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
      fetchUserData();
      setupRealtimeSubscriptions();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_grade, login_streak')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      setCurrentGrade((profile.current_grade as Grade) || 'Newcomer');
      setLoginStreak(profile.login_streak || 0);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    supabase
      .channel('xp-transfers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'xp_transfers',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`
        },
        () => fetchFinancialData()
      )
      .subscribe();

    supabase
      .channel('tips-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tips',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`
        },
        () => fetchFinancialData()
      )
      .subscribe();

    supabase
      .channel('red-envelope-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'red_envelope_claims',
          filter: `claimer_id=eq.${user.id}`
        },
        () => fetchFinancialData()
      )
      .subscribe();

    supabase
      .channel('gifts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `receiver_id=eq.${user.id}`
        },
        () => fetchFinancialData()
      )
      .subscribe();

    supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && 'xp' in payload.new) {
            setBalance(payload.new.xp);
          }
        }
      )
      .subscribe();
  };

  const fetchFinancialData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, acoin')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBalance(profile.xp);
        setAcoinBalance(profile.acoin || 0);
      }

      const [transfers, tips, redEnvelopes, gifts] = await Promise.all([
        fetchTransfers(),
        fetchTips(),
        fetchRedEnvelopes(),
        fetchGifts()
      ]);

      const allTransactions = [
        ...transfers,
        ...tips,
        ...redEnvelopes,
        ...gifts
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTransfers = async (): Promise<Transaction[]> => {
    const { data: sent } = await supabase
      .from('xp_transfers')
      .select(`
        id,
        amount,
        message,
        created_at,
        receiver:profiles!xp_transfers_receiver_id_fkey(id, display_name, avatar_url)
      `)
      .eq('sender_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: received } = await supabase
      .from('xp_transfers')
      .select(`
        id,
        amount,
        message,
        created_at,
        sender:profiles!xp_transfers_sender_id_fkey(id, display_name, avatar_url)
      `)
      .eq('receiver_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const sentTransactions: Transaction[] = (sent || []).map(t => ({
      id: t.id,
      type: 'transfer',
      amount: t.amount,
      direction: 'sent',
      otherParty: {
        id: t.receiver.id,
        name: t.receiver.display_name,
        avatar: t.receiver.avatar_url || ''
      },
      message: t.message,
      created_at: t.created_at
    }));

    const receivedTransactions: Transaction[] = (received || []).map(t => ({
      id: t.id,
      type: 'transfer',
      amount: t.amount,
      direction: 'received',
      otherParty: {
        id: t.sender.id,
        name: t.sender.display_name,
        avatar: t.sender.avatar_url || ''
      },
      message: t.message,
      created_at: t.created_at
    }));

    return [...sentTransactions, ...receivedTransactions];
  };

  const fetchTips = async (): Promise<Transaction[]> => {
    const { data: sent } = await supabase
      .from('tips')
      .select('id, xp_amount, message, created_at, receiver_id')
      .eq('sender_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: received } = await supabase
      .from('tips')
      .select('id, xp_amount, message, created_at, sender_id')
      .eq('receiver_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const sentWithProfiles = await Promise.all(
      (sent || []).map(async (t) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', t.receiver_id)
          .single();

        return {
          id: t.id,
          type: 'tip' as const,
          amount: t.xp_amount,
          direction: 'sent' as const,
          otherParty: {
            id: profile?.id || '',
            name: profile?.display_name || 'Unknown',
            avatar: profile?.avatar_url || ''
          },
          message: t.message,
          created_at: t.created_at
        };
      })
    );

    const receivedWithProfiles = await Promise.all(
      (received || []).map(async (t) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', t.sender_id)
          .single();

        return {
          id: t.id,
          type: 'tip' as const,
          amount: t.xp_amount,
          direction: 'received' as const,
          otherParty: {
            id: profile?.id || '',
            name: profile?.display_name || 'Unknown',
            avatar: profile?.avatar_url || ''
          },
          message: t.message,
          created_at: t.created_at
        };
      })
    );

    return [...sentWithProfiles, ...receivedWithProfiles];
  };

  const fetchRedEnvelopes = async (): Promise<Transaction[]> => {
    const { data: claims } = await supabase
      .from('red_envelope_claims')
      .select(`
        id,
        amount,
        claimed_at,
        red_envelope:red_envelopes(
          message,
          sender:profiles!red_envelopes_sender_id_fkey(id, display_name, avatar_url)
        )
      `)
      .eq('claimer_id', user!.id)
      .order('claimed_at', { ascending: false })
      .limit(10);

    return (claims || []).map(c => ({
      id: c.id,
      type: 'red_envelope',
      amount: c.amount,
      direction: 'received',
      otherParty: {
        id: c.red_envelope.sender.id,
        name: c.red_envelope.sender.display_name,
        avatar: c.red_envelope.sender.avatar_url || ''
      },
      message: c.red_envelope.message,
      created_at: c.claimed_at
    }));
  };

  const fetchGifts = async (): Promise<Transaction[]> => {
    const { data: received } = await supabase
      .from('gift_transactions')
      .select('id, xp_cost, message, created_at, sender_id')
      .eq('receiver_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const receivedWithProfiles = await Promise.all(
      (received || []).map(async (g) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', g.sender_id)
          .single();

        return {
          id: g.id,
          type: 'gift' as const,
          amount: g.xp_cost,
          direction: 'received' as const,
          otherParty: {
            id: profile?.id || '',
            name: profile?.display_name || 'Unknown',
            avatar: profile?.avatar_url || ''
          },
          message: g.message,
          created_at: g.created_at
        };
      })
    );

    return receivedWithProfiles;
  };

  const getTransactionTypeIcon = (type: string, direction: string) => {
    const iconClasses = "h-4 w-4";
    const wrapperClasses = "p-2 rounded-xl";
    
    switch (type) {
      case 'transfer':
        return (
          <div className={cn(wrapperClasses, direction === 'sent' ? 'bg-blue-500/10' : 'bg-indigo-500/10')}>
            <Send className={cn(iconClasses, direction === 'sent' ? 'text-blue-500' : 'text-indigo-500')} />
          </div>
        );
      case 'tip':
        return (
          <div className={cn(wrapperClasses, 'bg-pink-500/10')}>
            <Heart className={cn(iconClasses, 'text-pink-500')} />
          </div>
        );
      case 'red_envelope':
        return (
          <div className={cn(wrapperClasses, 'bg-red-500/10')}>
            <Mail className={cn(iconClasses, 'text-red-500')} />
          </div>
        );
      case 'gift':
        return (
          <div className={cn(wrapperClasses, 'bg-purple-500/10')}>
            <Gift className={cn(iconClasses, 'text-purple-500')} />
          </div>
        );
      default:
        return (
          <div className={cn(wrapperClasses, 'bg-primary/10')}>
            <Wallet className={cn(iconClasses, 'text-primary')} />
          </div>
        );
    }
  };

  const totalReceived = transactions.filter(t => t.direction === 'received').reduce((sum, t) => sum + t.amount, 0);
  const totalSent = transactions.filter(t => t.direction === 'sent').reduce((sum, t) => sum + t.amount, 0);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const quickActions = [
    { icon: Send, label: 'Send', color: 'bg-blue-500', path: '/transfer' },
    { icon: ArrowDownRight, label: 'Receive', color: 'bg-green-500', path: '/qr-code' },
    { icon: ArrowRightLeft, label: 'Convert', color: 'bg-purple-500', action: () => setShowConverter(!showConverter) },
    { icon: Gift, label: 'Gifts', color: 'bg-pink-500', path: '/gifts' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      {!isInIframe && (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="flex h-14 items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="font-semibold">Wallet</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHideBalance(!hideBalance)}
                className="shrink-0 rounded-full"
              >
                {hideBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className="container max-w-4xl mx-auto px-4 py-6 pb-32 space-y-6">
        {/* Main Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-2xl shadow-primary/20">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <CardContent className="relative p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-primary-foreground/70 text-sm mb-1">Total Balance</p>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    {hideBalance ? '••••••' : balance.toLocaleString()}
                  </h1>
                  <p className="text-primary-foreground/70 text-sm mt-1">Nexa Points</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isPremium && (
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  <GradeBadge grade={currentGrade} size="sm" showLabel />
                </div>
              </div>

              {/* Grade Progress */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary-foreground/70">Progress to next grade</span>
                  <span className="font-medium">{currentGrade}</span>
                </div>
                <Progress value={gradeProgress} className="h-2 bg-white/20" />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    onClick={() => action.path ? navigate(action.path) : action.action?.()}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                  >
                    <div className={cn("p-2 rounded-full", action.color)}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ACoin Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/20">
                    <Coins className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ACoin Balance</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {hideBalance ? '••••' : acoinBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10"
                    onClick={() => window.open('https://t.me/afuchatbot?start=buy_acoin', '_blank')}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Buy ACoin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Converter Section */}
        <AnimatePresence>
          {showConverter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ACoinConverter 
                currentNexa={balance}
                currentACoin={acoinBalance}
                onConversionSuccess={() => {
                  fetchFinancialData();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <div className="inline-flex p-2 rounded-xl bg-green-500/10 mb-2">
                <ArrowDownRight className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Received</p>
              <p className="text-lg font-bold text-green-500">
                +{hideBalance ? '••••' : totalReceived.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4 text-center">
              <div className="inline-flex p-2 rounded-xl bg-red-500/10 mb-2">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Sent</p>
              <p className="text-lg font-bold text-red-500">
                -{hideBalance ? '••••' : totalSent.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <div className="inline-flex p-2 rounded-xl bg-primary/10 mb-2">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Streak</p>
              <p className="text-lg font-bold text-primary">
                {loginStreak} days
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Card 
            className="cursor-pointer hover:border-red-500/40 transition-all group"
            onClick={() => navigate('/red-envelope')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 group-hover:scale-110 transition-transform">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Red Envelope</p>
                    <p className="text-xs text-muted-foreground">Send lucky money</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-purple-500/40 transition-all group"
            onClick={() => navigate('/creator-earnings')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Creator Earnings</p>
                    <p className="text-xs text-muted-foreground">View your earnings</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-orange-500/40 transition-all group"
            onClick={() => navigate('/ads')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 group-hover:scale-110 transition-transform">
                    <Megaphone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Ad Manager</p>
                    <p className="text-xs text-muted-foreground">Promote your content</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-cyan-500/40 transition-all group"
            onClick={() => navigate('/leaderboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 group-hover:scale-110 transition-transform">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Leaderboard</p>
                    <p className="text-xs text-muted-foreground">Top earners</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Transaction History</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchFinancialData}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
              
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 h-10">
                  <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
                  <TabsTrigger value="received" className="text-sm">Received</TabsTrigger>
                  <TabsTrigger value="sent" className="text-sm">Sent</TabsTrigger>
                </TabsList>
                
                {['all', 'received', 'sent'].map((tab) => (
                  <TabsContent key={tab} value={tab} className="space-y-2 mt-0">
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                          <Sparkles className="h-8 w-8 text-muted-foreground animate-pulse" />
                        </div>
                        <p className="text-muted-foreground">Loading transactions...</p>
                      </div>
                    ) : (
                      (() => {
                        const filteredTransactions = tab === 'all' 
                          ? transactions 
                          : transactions.filter(t => t.direction === tab);
                        
                        if (filteredTransactions.length === 0) {
                          return (
                            <div className="text-center py-12">
                              <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                                <Wallet className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <p className="text-muted-foreground">No transactions yet</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Start by sending gifts or tips to friends
                              </p>
                            </div>
                          );
                        }
                        
                        return filteredTransactions.map((transaction, index) => (
                          <motion.div
                            key={transaction.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                          >
                            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                              {getTransactionTypeIcon(transaction.type, transaction.direction)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">
                                    {transaction.direction === 'sent' ? 'To ' : 'From '}
                                    {transaction.otherParty.name}
                                  </p>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                    {transaction.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                {transaction.message && (
                                  <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
                                    "{transaction.message}"
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={cn(
                                  "font-bold text-sm",
                                  transaction.direction === 'sent' ? 'text-red-500' : 'text-green-500'
                                )}>
                                  {transaction.direction === 'sent' ? '-' : '+'}
                                  {hideBalance ? '••••' : transaction.amount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Nexa</p>
                              </div>
                            </div>
                          </motion.div>
                        ));
                      })()
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Your transactions are secured with end-to-end encryption</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default FinancialHub;
