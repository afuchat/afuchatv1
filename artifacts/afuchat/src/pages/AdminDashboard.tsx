import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminDashboardSkeleton } from '@/components/skeletons';
import { 
  Users, MessageSquare, Package, Activity, Shield, Gift, Coins, 
  TrendingUp, Globe, Briefcase, Wallet, AlertTriangle, Eye, 
  Heart, UserPlus, FileText, Image, Gamepad2, RefreshCw, Store, Github, Mail,
  ShieldAlert, Ban, Trash2, BadgeCheck, BadgeX, Crown, LayoutDashboard,
  BarChart3, Settings, ChevronRight, ArrowUpRight, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { getCountryFlag } from '@/lib/countryFlags';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts';
import { ActiveUsersAnalytics } from '@/components/admin/ActiveUsersAnalytics';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminWithdrawalsPanel } from '@/components/admin/AdminWithdrawalsPanel';
import { AdminReportsPanel } from '@/components/admin/AdminReportsPanel';
import { AdminGroupChannelVerification } from '@/components/admin/AdminGroupChannelVerification';
import { AdminMiniProgramsPanel } from '@/components/admin/AdminMiniProgramsPanel';
import { PageHeader } from '@/components/PageHeader';
import AdminDeveloperPanel from '@/components/admin/AdminDeveloperPanel';
import AdminYearWrappedPanel from '@/components/admin/AdminYearWrappedPanel';

interface DashboardStats {
  totalUsers: number;
  totalMessages: number;
  totalChats: number;
  totalPosts: number;
  totalGiftTransactions: number;
  totalAcoinTransactions: number;
  totalPremiumUsers: number;
  totalVerifiedUsers: number;
  totalStories: number;
  totalGroups: number;
  totalFollows: number;
  totalPostViews: number;
  totalLikes: number;
  totalReplies: number;
  totalTips: number;
  totalRedEnvelopes: number;
  totalReferrals: number;
  totalBlockedUsers: number;
  totalGameScores: number;
}

interface Merchant {
  id: string;
  name: string;
  api_endpoint: string;
  is_active: boolean;
  last_sync_at: string | null;
}

const StatCard = ({ icon: Icon, label, value, sub, trend }: { 
  icon: any; label: string; value: number; sub?: string; trend?: string;
}) => (
  <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 hover:shadow-md transition-all group">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value.toLocaleString()}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
    {trend && (
      <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
        <ArrowUpRight className="h-3 w-3" />
        {trend}
      </div>
    )}
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-all text-sm font-medium text-foreground hover:border-primary/30 group"
  >
    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    {label}
    <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-auto" />
  </button>
);

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAdminPrivileges, setHasAdminPrivileges] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [refreshing, setRefreshing] = useState(false);

  // Detailed data states
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<any[]>([]);
  const [acoinTransactions, setAcoinTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [follows, setFollows] = useState<any[]>([]);
  const [postViews, setPostViews] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [redEnvelopes, setRedEnvelopes] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [gameScores, setGameScores] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [messageReports, setMessageReports] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      checkAdminStatusAndLoadData(user.id);
    } else {
      setLoading(false);
      setHasAdminPrivileges(false);
    }
  }, [authLoading, user]);

  const checkAdminStatusAndLoadData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      const isAdmin = data?.role === 'admin';
      setHasAdminPrivileges(isAdmin);
      if (isAdmin) await loadAllData();
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchStats(), fetchUsers(), fetchMessages(), fetchChats(), fetchPosts(),
      fetchGiftTransactions(), fetchAcoinTransactions(), fetchSubscriptions(),
      fetchStories(), fetchFollows(), fetchPostViews(), fetchTips(),
      fetchRedEnvelopes(), fetchReferrals(), fetchBlockedUsers(), fetchGameScores(),
      fetchLikes(), fetchReplies(), fetchUserReports(), fetchMessageReports(), fetchMerchants(),
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const fetchStats = async () => {
    try {
      const [
        usersCount, messagesCount, chatsCount, postsCount, giftsCount, acoinsCount,
        premiumCount, verifiedCount, storiesCount, groupsCount, followsCount,
        postViewsCount, likesCount, repliesCount, tipsCount, redEnvelopesCount,
        referralsCount, blockedCount, gameScoresCount,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('chats').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('gift_transactions').select('*', { count: 'exact', head: true }),
        supabase.from('acoin_transactions').select('*', { count: 'exact', head: true }),
        supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('stories').select('*', { count: 'exact', head: true }),
        supabase.from('chats').select('*', { count: 'exact', head: true }).eq('is_group', true),
        supabase.from('follows').select('*', { count: 'exact', head: true }),
        supabase.from('post_views').select('*', { count: 'exact', head: true }),
        supabase.from('post_acknowledgments').select('*', { count: 'exact', head: true }),
        supabase.from('post_replies').select('*', { count: 'exact', head: true }),
        supabase.from('tips').select('*', { count: 'exact', head: true }),
        supabase.from('red_envelopes').select('*', { count: 'exact', head: true }),
        supabase.from('referrals').select('*', { count: 'exact', head: true }),
        supabase.from('blocked_users').select('*', { count: 'exact', head: true }),
        supabase.from('game_scores').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        totalUsers: usersCount.count || 0, totalMessages: messagesCount.count || 0,
        totalChats: chatsCount.count || 0, totalPosts: postsCount.count || 0,
        totalGiftTransactions: giftsCount.count || 0, totalAcoinTransactions: acoinsCount.count || 0,
        totalPremiumUsers: premiumCount.count || 0, totalVerifiedUsers: verifiedCount.count || 0,
        totalStories: storiesCount.count || 0, totalGroups: groupsCount.count || 0,
        totalFollows: followsCount.count || 0, totalPostViews: postViewsCount.count || 0,
        totalLikes: likesCount.count || 0, totalReplies: repliesCount.count || 0,
        totalTips: tipsCount.count || 0, totalRedEnvelopes: redEnvelopesCount.count || 0,
        totalReferrals: referralsCount.count || 0, totalBlockedUsers: blockedCount.count || 0,
        totalGameScores: gameScoresCount.count || 0,
      });
    } catch (error) { console.error('Error fetching stats:', error); }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles')
      .select('id, display_name, handle, phone_number, country, avatar_url, xp, acoin, is_verified, is_admin, is_warned, is_banned, created_at')
      .order('created_at', { ascending: false }).limit(200);
    setUsers(data || []);
  };
  const fetchMessages = async () => {
    const { data } = await supabase.from('messages')
      .select('id, encrypted_content, sender_id, chat_id, sent_at, profiles!messages_sender_id_fkey(display_name, handle)')
      .order('sent_at', { ascending: false }).limit(100);
    setMessages(data || []);
  };
  const fetchChats = async () => {
    const { data } = await supabase.from('chats')
      .select('id, name, is_group, created_at, created_by, profiles!chats_created_by_fkey(display_name, handle)')
      .order('created_at', { ascending: false }).limit(100);
    setChats(data || []);
  };
  const fetchPosts = async () => {
    const { data } = await supabase.from('posts')
      .select('id, content, author_id, view_count, created_at, profiles!posts_author_id_fkey(display_name, handle)')
      .order('created_at', { ascending: false }).limit(100);
    setPosts(data || []);
  };
  const fetchGiftTransactions = async () => {
    const { data } = await supabase.from('gift_transactions')
      .select('id, gift_id, sender_id, receiver_id, xp_cost, message, created_at, gifts(name, emoji)')
      .order('created_at', { ascending: false }).limit(100);
    setGiftTransactions(data || []);
  };
  const fetchAcoinTransactions = async () => {
    const { data } = await supabase.from('acoin_transactions')
      .select('id, user_id, transaction_type, amount, created_at')
      .order('created_at', { ascending: false }).limit(100);
    setAcoinTransactions(data || []);
  };
  const fetchSubscriptions = async () => {
    const { data } = await supabase.from('user_subscriptions')
      .select('id, user_id, plan_id, started_at, expires_at, is_active, profiles(display_name, handle, avatar_url, is_verified)')
      .order('started_at', { ascending: false }).limit(500);
    setSubscriptions(data || []);
  };
  const fetchStories = async () => {
    const { data } = await supabase.from('stories')
      .select('id, user_id, media_type, view_count, created_at, expires_at, profiles(display_name, handle)')
      .order('created_at', { ascending: false }).limit(100);
    setStories(data || []);
  };
  const fetchFollows = async () => {
    const { data } = await supabase.from('follows')
      .select('id, follower_id, following_id, created_at')
      .order('created_at', { ascending: false }).limit(200);
    setFollows(data || []);
  };
  const fetchPostViews = async () => {
    const { data } = await supabase.from('post_views')
      .select('id, post_id, viewer_id, viewed_at')
      .order('viewed_at', { ascending: false }).limit(200);
    setPostViews(data || []);
  };
  const fetchTips = async () => {
    const { data } = await supabase.from('tips')
      .select('id, sender_id, receiver_id, xp_amount, created_at')
      .order('created_at', { ascending: false }).limit(100);
    setTips(data || []);
  };
  const fetchRedEnvelopes = async () => {
    const { data } = await supabase.from('red_envelopes')
      .select('id, sender_id, total_amount, remaining_amount, created_at, expires_at')
      .order('created_at', { ascending: false }).limit(100);
    setRedEnvelopes(data || []);
  };
  const fetchReferrals = async () => {
    const { data } = await supabase.from('referrals')
      .select('id, referrer_id, referred_id, rewarded, created_at')
      .order('created_at', { ascending: false }).limit(100);
    setReferrals(data || []);
  };
  const fetchBlockedUsers = async () => {
    const { data } = await supabase.from('blocked_users')
      .select('id, blocker_id, blocked_id, reason, blocked_at')
      .order('blocked_at', { ascending: false }).limit(100);
    setBlockedUsers(data || []);
  };
  const fetchGameScores = async () => {
    const { data } = await supabase.from('game_scores')
      .select('id, user_id, game_type, score, difficulty, created_at, profiles(display_name, handle)')
      .order('created_at', { ascending: false }).limit(100);
    setGameScores(data || []);
  };
  const fetchLikes = async () => {
    const { data } = await supabase.from('post_acknowledgments')
      .select('id, post_id, user_id, created_at')
      .order('created_at', { ascending: false }).limit(200);
    setLikes(data || []);
  };
  const fetchReplies = async () => {
    const { data } = await supabase.from('post_replies')
      .select('id, post_id, author_id, created_at')
      .order('created_at', { ascending: false }).limit(200);
    setReplies(data || []);
  };
  const fetchUserReports = async () => {
    const { data } = await supabase.from('user_reports')
      .select('id, reporter_id, reported_user_id, reason, status, created_at')
      .order('created_at', { ascending: false }).limit(100);
    setUserReports(data || []);
  };
  const fetchMessageReports = async () => {
    const { data } = await supabase.from('message_reports')
      .select('id, reporter_id, message_id, reason, status, created_at')
      .order('created_at', { ascending: false }).limit(100);
    setMessageReports(data || []);
  };
  const fetchMerchants = async () => {
    const { data } = await supabase.from('merchants')
      .select('id, name, api_endpoint, is_active, last_sync_at')
      .order('created_at', { ascending: false });
    setMerchants(data || []);
  };

  const syncMerchantProducts = async (merchantId: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-merchant-products', {
        body: { merchant_id: merchantId }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Synced ${data.synced} products`);
        await fetchMerchants();
      } else {
        toast.error(data?.error || 'Sync failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync products');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  if (loading) return <AdminDashboardSkeleton />;

  if (!user || !hasAdminPrivileges) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center pt-20">
        <div className="w-full max-w-lg text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {!user ? 'You must be logged in to view this page.' : 'Your account does not have administrator privileges.'}
          </p>
          {!user && (
            <Button onClick={() => navigate('/auth')} className="rounded-xl">Go to Login</Button>
          )}
        </div>
      </div>
    );
  }

  const pendingReports = userReports.filter((r: any) => r.status === 'pending').length + 
                          messageReports.filter((r: any) => r.status === 'pending').length;
  const warnedCount = users.filter((u: any) => u.is_warned).length;
  const bannedCount = users.filter((u: any) => u.is_banned).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Platform control & analytics</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-36 rounded-xl h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-xl h-9 w-9">
              <RefreshCw className={cn("h-4 w-4", refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Summary bar */}
        {stats && (
          <div className="flex flex-wrap items-center gap-6 mb-6 px-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-foreground">{stats.totalUsers.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-foreground">{stats.totalPosts.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">posts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-foreground">{stats.totalMessages.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">messages</span>
            </div>
            {pendingReports > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-semibold text-destructive">{pendingReports}</span>
                <span className="text-xs text-destructive">pending reports</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex h-10 gap-0.5 bg-muted/40 p-1 rounded-xl min-w-max">
              {[
                { value: 'overview', label: 'Overview', icon: LayoutDashboard },
                { value: 'analytics', label: 'Analytics', icon: BarChart3 },
                { value: 'users', label: 'Users', icon: Users },
                { value: 'developers', label: 'Developers', icon: Github },
                { value: 'mini-programs', label: 'Mini Apps', icon: Package },
                { value: 'withdrawals', label: 'Withdrawals', icon: Wallet },
                { value: 'reports', label: 'Reports', icon: AlertTriangle },
                { value: 'groups', label: 'Groups', icon: Globe },
                { value: 'shop', label: 'Shop', icon: Store },
                { value: 'posts', label: 'Posts', icon: FileText },
                { value: 'messages', label: 'Messages', icon: MessageSquare },
                { value: 'gifts', label: 'Gifts', icon: Gift },
                { value: 'premium', label: 'Premium', icon: Crown },
                { value: 'moderation', label: 'Moderation', icon: ShieldAlert },
                { value: 'games', label: 'Games', icon: Gamepad2 },
                { value: 'year-wrapped', label: 'Wrapped', icon: Mail },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs font-medium gap-1.5 rounded-lg px-3 data-[state=active]:shadow-sm">
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ===== OVERVIEW ===== */}
          <TabsContent value="overview" className="mt-6 space-y-8">
            {stats && (
              <>
                {/* Key Metrics */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Key Metrics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    <StatCard icon={Users} label="Users" value={stats.totalUsers} sub={`${stats.totalVerifiedUsers} verified`} />
                    <StatCard icon={MessageSquare} label="Messages" value={stats.totalMessages} sub={`${stats.totalChats} chats`} />
                    <StatCard icon={Package} label="Posts" value={stats.totalPosts} sub={`${stats.totalReplies} replies`} />
                    <StatCard icon={Eye} label="Post Views" value={stats.totalPostViews} />
                    <StatCard icon={Heart} label="Likes" value={stats.totalLikes} />
                    <StatCard icon={Gift} label="Gifts Sent" value={stats.totalGiftTransactions} />
                    <StatCard icon={Coins} label="ACoin Txns" value={stats.totalAcoinTransactions} sub={`${stats.totalPremiumUsers} premium`} />
                    <StatCard icon={UserPlus} label="Follows" value={stats.totalFollows} />
                    <StatCard icon={Image} label="Stories" value={stats.totalStories} sub={`${stats.totalGroups} groups`} />
                    <StatCard icon={Gamepad2} label="Game Scores" value={stats.totalGameScores} />
                    <StatCard icon={TrendingUp} label="Tips" value={stats.totalTips} />
                    <StatCard icon={Activity} label="Red Envelopes" value={stats.totalRedEnvelopes} />
                    <StatCard icon={Users} label="Referrals" value={stats.totalReferrals} />
                    <StatCard icon={AlertTriangle} label="Blocked" value={stats.totalBlockedUsers} />
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    <QuickAction icon={Users} label="Manage Users" onClick={() => setActiveTab('users')} />
                    <QuickAction icon={AlertTriangle} label="View Reports" onClick={() => setActiveTab('reports')} />
                    <QuickAction icon={Wallet} label="Withdrawals" onClick={() => setActiveTab('withdrawals')} />
                    <QuickAction icon={Crown} label="Premium Users" onClick={() => setActiveTab('premium')} />
                    <QuickAction icon={Globe} label="Verify Groups" onClick={() => setActiveTab('groups')} />
                    <QuickAction icon={Github} label="Developers" onClick={() => setActiveTab('developers')} />
                    <QuickAction icon={ShieldAlert} label="Moderation" onClick={() => setActiveTab('moderation')} />
                    <QuickAction icon={Briefcase} label="Business" onClick={() => navigate('/business-dashboard')} />
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Activity</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Recent Users */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold">Recent Users</CardTitle>
                        <button onClick={() => setActiveTab('users')} className="text-xs text-primary font-medium hover:underline">View All</button>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {users.slice(0, 8).map((u: any) => (
                            <div key={u.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : u.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{u.display_name || 'Unknown'}</p>
                                  <p className="text-[11px] text-muted-foreground">@{u.handle}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {u.is_verified && <Badge variant="secondary" className="text-[9px] h-5 px-1.5 rounded-md">✓</Badge>}
                                {u.country && <span className="text-xs">{getCountryFlag(u.country)}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Posts */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold">Recent Posts</CardTitle>
                        <button onClick={() => setActiveTab('posts')} className="text-xs text-primary font-medium hover:underline">View All</button>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {posts.slice(0, 8).map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium text-primary">@{p.profiles?.handle || 'unknown'}</p>
                                <p className="text-sm truncate max-w-[280px] text-foreground">{p.content}</p>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-3">
                                <Eye className="h-3 w-3" />
                                <span className="text-[11px] font-medium">{p.view_count || 0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Gifts */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold">Recent Gifts</CardTitle>
                        <button onClick={() => setActiveTab('gifts')} className="text-xs text-primary font-medium hover:underline">View All</button>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {giftTransactions.slice(0, 6).map((g: any) => (
                            <div key={g.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">{g.gifts?.emoji || '🎁'}</span>
                                <div>
                                  <p className="text-sm font-medium">{g.gifts?.name || 'Gift'}</p>
                                  <p className="text-[11px] text-muted-foreground">{g.xp_cost} Nexa</p>
                                </div>
                              </div>
                              <span className="text-[11px] text-muted-foreground">{formatDate(g.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Game Scores */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold">Recent Scores</CardTitle>
                        <button onClick={() => setActiveTab('games')} className="text-xs text-primary font-medium hover:underline">View All</button>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {gameScores.slice(0, 6).map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                              <div>
                                <p className="text-sm font-medium">@{s.profiles?.handle || 'unknown'}</p>
                                <p className="text-[11px] text-muted-foreground">{s.game_type} · {s.difficulty}</p>
                              </div>
                              <Badge variant="outline" className="text-xs font-bold rounded-lg">{s.score}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ===== ANALYTICS ===== */}
          <TabsContent value="analytics" className="mt-6 space-y-8">
            <ActiveUsersAnalytics users={users} messages={messages} posts={posts} postViews={postViews} likes={likes} />
            <AdminAnalyticsCharts 
              data={{ users, posts, messages, giftTransactions, acoinTransactions, follows, postViews, stories, tips, redEnvelopes, referrals, gameScores, likes, replies, subscriptions, userReports, messageReports }}
              timeRange={timeRange}
            />
          </TabsContent>

          {/* ===== USERS ===== */}
          <TabsContent value="users" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  User Management
                  <Badge variant="secondary" className="ml-2 rounded-lg">{users.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUserManagement users={users} onRefresh={fetchUsers} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== DEVELOPERS ===== */}
          <TabsContent value="developers" className="mt-6">
            <Card className="border-border/50">
              <CardContent className="pt-6"><AdminDeveloperPanel /></CardContent>
            </Card>
          </TabsContent>

          {/* ===== MINI PROGRAMS ===== */}
          <TabsContent value="mini-programs" className="mt-6"><AdminMiniProgramsPanel /></TabsContent>

          {/* ===== WITHDRAWALS ===== */}
          <TabsContent value="withdrawals" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Creator Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent><AdminWithdrawalsPanel /></CardContent>
            </Card>
          </TabsContent>

          {/* ===== REPORTS ===== */}
          <TabsContent value="reports" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Reports & Moderation
                  {pendingReports > 0 && <Badge variant="destructive" className="rounded-lg">{pendingReports} pending</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent><AdminReportsPanel /></CardContent>
            </Card>
          </TabsContent>

          {/* ===== GROUPS ===== */}
          <TabsContent value="groups" className="mt-6"><AdminGroupChannelVerification /></TabsContent>

          {/* ===== SHOP ===== */}
          <TabsContent value="shop" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Merchant Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>API Endpoint</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Synced</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No merchants configured</TableCell></TableRow>
                      ) : merchants.map((merchant) => (
                        <TableRow key={merchant.id}>
                          <TableCell className="font-medium">{merchant.name}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">{merchant.api_endpoint}</TableCell>
                          <TableCell>
                            <Badge className={cn("rounded-lg", merchant.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground")}>
                              {merchant.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{merchant.last_sync_at ? formatDate(merchant.last_sync_at) : 'Never'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5" onClick={() => syncMerchantProducts(merchant.id)} disabled={syncing}>
                              <RefreshCw className={cn("h-3.5 w-3.5", syncing && 'animate-spin')} /> Sync
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== POSTS ===== */}
          <TabsContent value="posts" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Posts
                  <Badge variant="secondary" className="ml-2 rounded-lg">{posts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Author</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.map((post: any) => (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium text-primary">@{post.profiles?.handle || 'unknown'}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{post.content}</TableCell>
                          <TableCell className="font-medium">{post.view_count?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(post.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== MESSAGES ===== */}
          <TabsContent value="messages" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Messages
                  <Badge variant="secondary" className="ml-2 rounded-lg">{messages.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Sent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg: any) => (
                        <TableRow key={msg.id}>
                          <TableCell className="font-medium text-primary">@{msg.profiles?.handle || 'unknown'}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{msg.encrypted_content}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(msg.sent_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== GIFTS ===== */}
          <TabsContent value="gifts" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Gift Transactions
                  <Badge variant="secondary" className="ml-2 rounded-lg">{giftTransactions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gift</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {giftTransactions.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              <span className="text-lg">{txn.gifts?.emoji}</span>
                              <span className="font-medium">{txn.gifts?.name}</span>
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{txn.xp_cost} Nexa</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">{txn.message || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(txn.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PREMIUM ===== */}
          <TabsContent value="premium" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Premium Subscriptions
                  <Badge variant="secondary" className="ml-2 rounded-lg">{subscriptions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Days Left</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions</TableCell></TableRow>
                      ) : subscriptions.map((sub: any) => {
                        const daysLeft = sub.expires_at ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                        return (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                  {sub.profiles?.avatar_url ? <img src={sub.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : sub.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{sub.profiles?.display_name || 'Unknown'}</p>
                                  <p className="text-[11px] text-muted-foreground">@{sub.profiles?.handle || 'unknown'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="capitalize rounded-lg">{sub.plan_id || 'premium'}</Badge></TableCell>
                            <TableCell>
                              <Badge className={cn("rounded-lg", sub.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground")}>
                                {sub.is_active ? 'Active' : 'Expired'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(sub.started_at)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(sub.expires_at)}</TableCell>
                            <TableCell>
                              {sub.is_active && daysLeft > 0 ? (
                                <span className={cn("text-xs font-bold", daysLeft <= 7 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>{daysLeft}d</span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== MODERATION ===== */}
          <TabsContent value="moderation" className="mt-6 space-y-6">
            {/* Warned Users */}
            <Card className="border-border/50 border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Warned Users
                  <Badge variant="secondary" className="rounded-lg">{warnedCount}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {warnedCount === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No warned users</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>User</TableHead><TableHead>Handle</TableHead><TableHead>Country</TableHead><TableHead>Joined</TableHead><TableHead>Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {users.filter((u: any) => u.is_warned).map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center text-xs font-bold shrink-0">{u.display_name?.[0]?.toUpperCase() || '?'}</div>
                                <span className="font-medium text-sm">{u.display_name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">@{u.handle}</TableCell>
                            <TableCell>{u.country ? <span>{getCountryFlag(u.country)} {u.country}</span> : '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 rounded-xl" onClick={async () => {
                                  await supabase.rpc('admin_remove_warning', { p_user_id: u.id });
                                  toast.success('Warning removed'); fetchUsers();
                                }}><ShieldAlert className="h-3 w-3" /> Remove</Button>
                                <Button size="sm" variant="destructive" className="h-8 text-xs gap-1 rounded-xl" onClick={async () => {
                                  await supabase.rpc('admin_ban_user', { p_user_id: u.id, p_reason: 'Escalated from warning' });
                                  toast.success('User banned'); fetchUsers();
                                }}><Ban className="h-3 w-3" /> Ban</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Banned Users */}
            <Card className="border-border/50 border-l-4 border-l-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Ban className="h-5 w-5" />
                  Banned Users
                  <Badge variant="secondary" className="rounded-lg">{bannedCount}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bannedCount === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No banned users</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>User</TableHead><TableHead>Handle</TableHead><TableHead>Country</TableHead><TableHead>Joined</TableHead><TableHead>Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {users.filter((u: any) => u.is_banned).map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-destructive/15 flex items-center justify-center text-xs font-bold shrink-0">{u.display_name?.[0]?.toUpperCase() || '?'}</div>
                                <span className="font-medium text-sm">{u.display_name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">@{u.handle}</TableCell>
                            <TableCell>{u.country ? <span>{getCountryFlag(u.country)} {u.country}</span> : '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="h-8 text-xs gap-1 rounded-xl" onClick={async () => {
                                await supabase.rpc('admin_unban_user', { p_user_id: u.id });
                                toast.success('User unbanned'); fetchUsers();
                              }}><ShieldAlert className="h-3 w-3" /> Unban</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Reports */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  User Reports
                  <Badge variant="secondary" className="rounded-lg">{userReports.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No user reports</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Reporter</TableHead><TableHead>Reported User</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {userReports.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.reporter_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.reported_user_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                            <TableCell>
                              <Badge className={cn("rounded-lg", r.status === 'pending' ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-muted text-muted-foreground')}>{r.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Reports */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-amber-500" />
                  Message Reports
                  <Badge variant="secondary" className="rounded-lg">{messageReports.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messageReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No message reports</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Reporter</TableHead><TableHead>Message</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {messageReports.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.reporter_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.message_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                            <TableCell>
                              <Badge className={cn("rounded-lg", r.status === 'pending' ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-muted text-muted-foreground')}>{r.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Blocked Users */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                  User-to-User Blocks
                  <Badge variant="secondary" className="rounded-lg">{blockedUsers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blockedUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No blocks</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Blocker</TableHead><TableHead>Blocked</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {blockedUsers.map((b: any) => (
                          <TableRow key={b.id}>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{b.blocker_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{b.blocked_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{b.reason || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(b.blocked_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== GAMES ===== */}
          <TabsContent value="games" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                  Game Scores
                  <Badge variant="secondary" className="ml-2 rounded-lg">{gameScores.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Player</TableHead><TableHead>Game</TableHead><TableHead>Score</TableHead><TableHead>Difficulty</TableHead><TableHead>Date</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {gameScores.map((score: any) => (
                        <TableRow key={score.id}>
                          <TableCell className="font-medium text-primary">@{score.profiles?.handle || 'unknown'}</TableCell>
                          <TableCell>{score.game_type}</TableCell>
                          <TableCell className="font-bold">{score.score}</TableCell>
                          <TableCell><Badge variant="outline" className="rounded-lg">{score.difficulty}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(score.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== YEAR WRAPPED ===== */}
          <TabsContent value="year-wrapped" className="mt-6"><AdminYearWrappedPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
