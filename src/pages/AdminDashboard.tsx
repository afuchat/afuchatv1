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
  ShieldAlert, Ban, Trash2, BadgeCheck, BadgeX, Crown
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

      if (isAdmin) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchMessages(),
      fetchChats(),
      fetchPosts(),
      fetchGiftTransactions(),
      fetchAcoinTransactions(),
      fetchSubscriptions(),
      fetchStories(),
      fetchFollows(),
      fetchPostViews(),
      fetchTips(),
      fetchRedEnvelopes(),
      fetchReferrals(),
      fetchBlockedUsers(),
      fetchGameScores(),
      fetchLikes(),
      fetchReplies(),
      fetchUserReports(),
      fetchMessageReports(),
      fetchMerchants(),
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
        usersCount,
        messagesCount,
        chatsCount,
        postsCount,
        giftsCount,
        acoinsCount,
        premiumCount,
        verifiedCount,
        storiesCount,
        groupsCount,
        followsCount,
        postViewsCount,
        likesCount,
        repliesCount,
        tipsCount,
        redEnvelopesCount,
        referralsCount,
        blockedCount,
        gameScoresCount,
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
        totalUsers: usersCount.count || 0,
        totalMessages: messagesCount.count || 0,
        totalChats: chatsCount.count || 0,
        totalPosts: postsCount.count || 0,
        totalGiftTransactions: giftsCount.count || 0,
        totalAcoinTransactions: acoinsCount.count || 0,
        totalPremiumUsers: premiumCount.count || 0,
        totalVerifiedUsers: verifiedCount.count || 0,
        totalStories: storiesCount.count || 0,
        totalGroups: groupsCount.count || 0,
        totalFollows: followsCount.count || 0,
        totalPostViews: postViewsCount.count || 0,
        totalLikes: likesCount.count || 0,
        totalReplies: repliesCount.count || 0,
        totalTips: tipsCount.count || 0,
        totalRedEnvelopes: redEnvelopesCount.count || 0,
        totalReferrals: referralsCount.count || 0,
        totalBlockedUsers: blockedCount.count || 0,
        totalGameScores: gameScoresCount.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, handle, phone_number, country, avatar_url, xp, acoin, is_verified, is_admin, is_warned, is_banned, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, encrypted_content, sender_id, chat_id, sent_at, profiles!messages_sender_id_fkey(display_name, handle)')
        .order('sent_at', { ascending: false })
        .limit(100);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchChats = async () => {
    try {
      const { data } = await supabase
        .from('chats')
        .select('id, name, is_group, created_at, created_by, profiles!chats_created_by_fkey(display_name, handle)')
        .order('created_at', { ascending: false })
        .limit(100);
      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data } = await supabase
        .from('posts')
        .select('id, content, author_id, view_count, created_at, profiles!posts_author_id_fkey(display_name, handle)')
        .order('created_at', { ascending: false })
        .limit(100);
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchGiftTransactions = async () => {
    try {
      const { data } = await supabase
        .from('gift_transactions')
        .select('id, gift_id, sender_id, receiver_id, xp_cost, message, created_at, gifts(name, emoji)')
        .order('created_at', { ascending: false })
        .limit(100);
      setGiftTransactions(data || []);
    } catch (error) {
      console.error('Error fetching gift transactions:', error);
    }
  };

  const fetchAcoinTransactions = async () => {
    try {
      const { data } = await supabase
        .from('acoin_transactions')
        .select('id, user_id, transaction_type, amount, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setAcoinTransactions(data || []);
    } catch (error) {
      console.error('Error fetching acoin transactions:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('id, user_id, plan_id, started_at, expires_at, is_active, profiles(display_name, handle, avatar_url, is_verified)')
        .order('started_at', { ascending: false })
        .limit(500);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const fetchStories = async () => {
    try {
      const { data } = await supabase
        .from('stories')
        .select('id, user_id, media_type, view_count, created_at, expires_at, profiles(display_name, handle)')
        .order('created_at', { ascending: false })
        .limit(100);
      setStories(data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const fetchFollows = async () => {
    try {
      const { data } = await supabase
        .from('follows')
        .select('id, follower_id, following_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setFollows(data || []);
    } catch (error) {
      console.error('Error fetching follows:', error);
    }
  };

  const fetchPostViews = async () => {
    try {
      const { data } = await supabase
        .from('post_views')
        .select('id, post_id, viewer_id, viewed_at')
        .order('viewed_at', { ascending: false })
        .limit(200);
      setPostViews(data || []);
    } catch (error) {
      console.error('Error fetching post views:', error);
    }
  };

  const fetchTips = async () => {
    try {
      const { data } = await supabase
        .from('tips')
        .select('id, sender_id, receiver_id, xp_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setTips(data || []);
    } catch (error) {
      console.error('Error fetching tips:', error);
    }
  };

  const fetchRedEnvelopes = async () => {
    try {
      const { data } = await supabase
        .from('red_envelopes')
        .select('id, sender_id, total_amount, remaining_amount, created_at, expires_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setRedEnvelopes(data || []);
    } catch (error) {
      console.error('Error fetching red envelopes:', error);
    }
  };

  const fetchReferrals = async () => {
    try {
      const { data } = await supabase
        .from('referrals')
        .select('id, referrer_id, referred_id, rewarded, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setReferrals(data || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('id, blocker_id, blocked_id, reason, blocked_at')
        .order('blocked_at', { ascending: false })
        .limit(100);
      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const fetchGameScores = async () => {
    try {
      const { data } = await supabase
        .from('game_scores')
        .select('id, user_id, game_type, score, difficulty, created_at, profiles(display_name, handle)')
        .order('created_at', { ascending: false })
        .limit(100);
      setGameScores(data || []);
    } catch (error) {
      console.error('Error fetching game scores:', error);
    }
  };

  const fetchLikes = async () => {
    try {
      const { data } = await supabase
        .from('post_acknowledgments')
        .select('id, post_id, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setLikes(data || []);
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const fetchReplies = async () => {
    try {
      const { data } = await supabase
        .from('post_replies')
        .select('id, post_id, author_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setReplies(data || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const fetchUserReports = async () => {
    try {
      const { data } = await supabase
        .from('user_reports')
        .select('id, reporter_id, reported_user_id, reason, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setUserReports(data || []);
    } catch (error) {
      console.error('Error fetching user reports:', error);
    }
  };

  const fetchMessageReports = async () => {
    try {
      const { data } = await supabase
        .from('message_reports')
        .select('id, reporter_id, message_id, reason, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setMessageReports(data || []);
    } catch (error) {
      console.error('Error fetching message reports:', error);
    }
  };

  const fetchMerchants = async () => {
    try {
      const { data } = await supabase
        .from('merchants')
        .select('id, name, api_endpoint, is_active, last_sync_at')
        .order('created_at', { ascending: false });
      setMerchants(data || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
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
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync products');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (!user || !hasAdminPrivileges) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center pt-20">
        <div className="w-full max-w-4xl">
          <PageHeader title="Admin Dashboard" />
          
          <Card className="border-l-4 border-red-500 mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-red-500" />
                Access Restricted
              </CardTitle>
              <CardDescription>
                {!user 
                  ? 'You must be logged in to view this page.'
                  : 'Your account does not have administrator privileges.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user && (
                <Button onClick={() => navigate('/auth')}>
                  Go to Login
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black">Admin Dashboard</h1>
            <p className="text-muted-foreground">Complete platform control and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/business-dashboard')} className="gap-2">
              <Briefcase className="h-4 w-4" />
              Business
            </Button>
          </div>
        </div>

        {/* Stats summary bar */}
        {stats && (
          <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{stats.totalUsers.toLocaleString()} users</span>
            <span>·</span>
            <span>{stats.totalPosts.toLocaleString()} posts</span>
            <span>·</span>
            <span>{stats.totalMessages.toLocaleString()} messages</span>
            <span>·</span>
            <span>{stats.totalPremiumUsers} premium</span>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="text-xs font-bold">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
            <TabsTrigger value="developers" className="text-xs gap-1">
              <Github className="h-3 w-3" />
              Developers
            </TabsTrigger>
            <TabsTrigger value="mini-programs" className="text-xs">Mini Apps</TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs">Withdrawals</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
            <TabsTrigger value="groups" className="text-xs">Groups/Channels</TabsTrigger>
            <TabsTrigger value="shop" className="text-xs">Shop</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs">Posts</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
            <TabsTrigger value="gifts" className="text-xs">Gifts</TabsTrigger>
            <TabsTrigger value="premium" className="text-xs">Premium</TabsTrigger>
            <TabsTrigger value="moderation" className="text-xs gap-1">
              <ShieldAlert className="h-3 w-3" />
              Moderation
            </TabsTrigger>
            <TabsTrigger value="games" className="text-xs">Games</TabsTrigger>
            <TabsTrigger value="year-wrapped" className="text-xs gap-1">
              <Mail className="h-3 w-3" />
              Year Wrapped
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Complete platform snapshot */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {stats && (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {[
                    { icon: Users, label: 'Total Users', value: stats.totalUsers, sub: `${stats.totalVerifiedUsers} verified`, color: 'text-primary' },
                    { icon: MessageSquare, label: 'Messages', value: stats.totalMessages, sub: `${stats.totalChats} chats`, color: 'text-blue-500' },
                    { icon: Package, label: 'Posts', value: stats.totalPosts, sub: `${stats.totalReplies} replies`, color: 'text-green-500' },
                    { icon: Eye, label: 'Post Views', value: stats.totalPostViews, sub: '', color: 'text-purple-500' },
                    { icon: Heart, label: 'Total Likes', value: stats.totalLikes, sub: '', color: 'text-red-500' },
                    { icon: Gift, label: 'Gift Transactions', value: stats.totalGiftTransactions, sub: '', color: 'text-yellow-500' },
                    { icon: Coins, label: 'ACoin Transactions', value: stats.totalAcoinTransactions, sub: `${stats.totalPremiumUsers} premium`, color: 'text-amber-500' },
                    { icon: UserPlus, label: 'Follows', value: stats.totalFollows, sub: '', color: 'text-cyan-500' },
                    { icon: Image, label: 'Stories', value: stats.totalStories, sub: `${stats.totalGroups} groups`, color: 'text-pink-500' },
                    { icon: Gamepad2, label: 'Game Scores', value: stats.totalGameScores, sub: '', color: 'text-indigo-500' },
                    { icon: TrendingUp, label: 'Tips Sent', value: stats.totalTips, sub: '', color: 'text-emerald-500' },
                    { icon: Activity, label: 'Red Envelopes', value: stats.totalRedEnvelopes, sub: '', color: 'text-orange-500' },
                    { icon: Users, label: 'Referrals', value: stats.totalReferrals, sub: '', color: 'text-teal-500' },
                    { icon: AlertTriangle, label: 'Blocked Users', value: stats.totalBlockedUsers, sub: '', color: 'text-destructive' },
                  ].map((metric, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-1 pt-3 px-3">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                          <metric.icon className={cn("h-3.5 w-3.5", metric.color)} />
                          {metric.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-xl font-bold">{metric.value.toLocaleString()}</div>
                        {metric.sub && <p className="text-xs text-muted-foreground">{metric.sub}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('users')} className="gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Manage Users
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('reports')} className="gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> View Reports
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('withdrawals')} className="gap-1.5">
                        <Wallet className="h-3.5 w-3.5" /> Withdrawals
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('premium')} className="gap-1.5">
                        <Shield className="h-3.5 w-3.5" /> Premium Users
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('groups')} className="gap-1.5">
                        <Globe className="h-3.5 w-3.5" /> Verify Groups
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('developers')} className="gap-1.5">
                        <Github className="h-3.5 w-3.5" /> Developers
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('year-wrapped')} className="gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Year Wrapped
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate('/business-dashboard')} className="gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" /> Business
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Users */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">Recent Users</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => setActiveTab('users')} className="text-xs text-primary h-7">
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {users.slice(0, 8).map((u: any) => (
                          <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                {u.display_name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{u.display_name || 'Unknown'}</p>
                                <p className="text-[10px] text-muted-foreground">@{u.handle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {u.is_verified && <Badge variant="secondary" className="text-[9px] h-4 px-1">✓</Badge>}
                              {u.country && <span className="text-xs">{getCountryFlag(u.country)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Posts */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">Recent Posts</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => setActiveTab('posts')} className="text-xs text-primary h-7">
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {posts.slice(0, 8).map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-muted-foreground">@{p.profiles?.handle || 'unknown'}</p>
                              <p className="text-xs truncate max-w-[250px]">{p.content}</p>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-2">
                              <Eye className="h-3 w-3" />
                              <span className="text-[10px]">{p.view_count || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Gift Transactions */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">Recent Gifts</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => setActiveTab('gifts')} className="text-xs text-primary h-7">
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {giftTransactions.slice(0, 6).map((g: any) => (
                          <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{g.gifts?.emoji || '🎁'}</span>
                              <div>
                                <p className="text-xs font-medium">{g.gifts?.name || 'Gift'}</p>
                                <p className="text-[10px] text-muted-foreground">{g.xp_cost} Nexa</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{formatDate(g.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Game Scores */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold">Recent Game Scores</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => setActiveTab('games')} className="text-xs text-primary h-7">
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {gameScores.slice(0, 6).map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                            <div>
                              <p className="text-xs font-medium">@{s.profiles?.handle || 'unknown'}</p>
                              <p className="text-[10px] text-muted-foreground">{s.game_type} · {s.difficulty}</p>
                            </div>
                            <Badge variant="outline" className="text-xs font-bold">{s.score}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-6 space-y-8">
            {/* Active Users Analytics - DAU, WAU, MAU, YAU */}
            <ActiveUsersAnalytics 
              users={users}
              messages={messages}
              posts={posts}
              postViews={postViews}
              likes={likes}
            />
            
            {/* Other Analytics Charts */}
            <AdminAnalyticsCharts 
              data={{
                users,
                posts,
                messages,
                giftTransactions,
                acoinTransactions,
                follows,
                postViews,
                stories,
                tips,
                redEnvelopes,
                referrals,
                gameScores,
                likes,
                replies,
                subscriptions,
                userReports,
                messageReports,
              }}
              timeRange={timeRange}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management ({users.length})</CardTitle>
                <CardDescription>Full control over all platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminUserManagement users={users} onRefresh={fetchUsers} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="developers" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <AdminDeveloperPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mini-programs" className="mt-6">
            <AdminMiniProgramsPanel />
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Creator Withdrawals
                </CardTitle>
                <CardDescription>Manage withdrawal requests from creators</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminWithdrawalsPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Reports & Moderation
                </CardTitle>
                <CardDescription>Review and manage user reports</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminReportsPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <AdminGroupChannelVerification />
          </TabsContent>

          <TabsContent value="shop" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Merchant Shop Management
                </CardTitle>
                <CardDescription>Manage connected merchants and sync products</CardDescription>
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
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No merchants configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        merchants.map((merchant) => (
                          <TableRow key={merchant.id}>
                            <TableCell className="font-medium">{merchant.name}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{merchant.api_endpoint}</TableCell>
                            <TableCell>
                              {merchant.is_active ? (
                                <Badge className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {merchant.last_sync_at ? formatDate(merchant.last_sync_at) : 'Never'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => syncMerchantProducts(merchant.id)}
                                disabled={syncing}
                              >
                                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                                Sync Products
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Posts ({posts.length})</CardTitle>
                <CardDescription>All platform posts</CardDescription>
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
                          <TableCell className="font-medium">
                            @{post.profiles?.handle || 'unknown'}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{post.content}</TableCell>
                          <TableCell>{post.view_count?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(post.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Messages ({messages.length})</CardTitle>
                <CardDescription>Recent platform messages</CardDescription>
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
                          <TableCell className="font-medium">
                            @{msg.profiles?.handle || 'unknown'}
                          </TableCell>
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

          <TabsContent value="gifts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gift Transactions ({giftTransactions.length})</CardTitle>
                <CardDescription>All gift transactions</CardDescription>
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
                              <span>{txn.gifts?.emoji}</span>
                              <span>{txn.gifts?.name}</span>
                            </span>
                          </TableCell>
                          <TableCell>{txn.xp_cost} Nexa</TableCell>
                          <TableCell className="max-w-[200px] truncate">{txn.message || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(txn.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Premium Subscriptions ({subscriptions.length})
                </CardTitle>
                <CardDescription>All premium subscribers — active and expired</CardDescription>
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
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No premium subscriptions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        subscriptions.map((sub: any) => {
                          const daysLeft = sub.expires_at ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                          return (
                            <TableRow key={sub.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                    {sub.profiles?.avatar_url ? (
                                      <img src={sub.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      sub.profiles?.display_name?.[0]?.toUpperCase() || '?'
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{sub.profiles?.display_name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">@{sub.profiles?.handle || 'unknown'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{sub.plan_id || 'premium'}</Badge>
                              </TableCell>
                              <TableCell>
                                {sub.is_active ? (
                                  <Badge className="bg-green-500">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Expired</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDate(sub.started_at)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDate(sub.expires_at)}</TableCell>
                              <TableCell>
                                {sub.is_active && daysLeft > 0 ? (
                                  <span className={cn("text-xs font-bold", daysLeft <= 7 ? "text-destructive" : "text-green-500")}>{daysLeft}d</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="mt-6 space-y-6">
            {/* Warned Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  Warned Users ({users.filter((u: any) => u.is_warned).length})
                </CardTitle>
                <CardDescription>Users currently under warning</CardDescription>
              </CardHeader>
              <CardContent>
                {users.filter((u: any) => u.is_warned).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No warned users</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Handle</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.filter((u: any) => u.is_warned).map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                                  {u.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="font-medium text-sm">{u.display_name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">@{u.handle}</TableCell>
                            <TableCell>{u.country ? <span>{getCountryFlag(u.country)} {u.country}</span> : '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={async () => {
                                  await supabase.rpc('admin_remove_warning', { p_user_id: u.id });
                                  toast.success('Warning removed');
                                  fetchUsers();
                                }}>
                                  <ShieldAlert className="h-3 w-3" /> Remove Warning
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={async () => {
                                  await supabase.rpc('admin_ban_user', { p_user_id: u.id, p_reason: 'Escalated from warning' });
                                  toast.success('User banned');
                                  fetchUsers();
                                }}>
                                  <Ban className="h-3 w-3" /> Ban
                                </Button>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Ban className="h-5 w-5" />
                  Banned Users ({users.filter((u: any) => u.is_banned).length})
                </CardTitle>
                <CardDescription>Users currently banned from the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {users.filter((u: any) => u.is_banned).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No banned users</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Handle</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.filter((u: any) => u.is_banned).map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold shrink-0">
                                  {u.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="font-medium text-sm">{u.display_name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">@{u.handle}</TableCell>
                            <TableCell>{u.country ? <span>{getCountryFlag(u.country)} {u.country}</span> : '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={async () => {
                                await supabase.rpc('admin_unban_user', { p_user_id: u.id });
                                toast.success('User unbanned');
                                fetchUsers();
                              }}>
                                <ShieldAlert className="h-3 w-3" /> Unban
                              </Button>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  User Reports ({userReports.length})
                </CardTitle>
                <CardDescription>All reported users</CardDescription>
              </CardHeader>
              <CardContent>
                {userReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No user reports</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reporter ID</TableHead>
                          <TableHead>Reported User ID</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userReports.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.reporter_id}</TableCell>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.reported_user_id}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'} className="text-xs">{r.status}</Badge>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-yellow-500" />
                  Message Reports ({messageReports.length})
                </CardTitle>
                <CardDescription>All reported messages</CardDescription>
              </CardHeader>
              <CardContent>
                {messageReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No message reports</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reporter ID</TableHead>
                          <TableHead>Message ID</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {messageReports.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.reporter_id}</TableCell>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.message_id}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'} className="text-xs">{r.status}</Badge>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                  Blocked Users ({blockedUsers.length})
                </CardTitle>
                <CardDescription>User-to-user blocks on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {blockedUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No blocked users</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Blocker ID</TableHead>
                          <TableHead>Blocked ID</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blockedUsers.map((b: any) => (
                          <TableRow key={b.id}>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{b.blocker_id}</TableCell>
                            <TableCell className="text-xs font-mono truncate max-w-[120px]">{b.blocked_id}</TableCell>
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

          <TabsContent value="games" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Game Scores ({gameScores.length})</CardTitle>
                <CardDescription>All game scores and leaderboard data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gameScores.map((score: any) => (
                        <TableRow key={score.id}>
                          <TableCell className="font-medium">
                            @{score.profiles?.handle || 'unknown'}
                          </TableCell>
                          <TableCell>{score.game_type}</TableCell>
                          <TableCell className="font-bold">{score.score}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{score.difficulty}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(score.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="year-wrapped" className="mt-6">
            <AdminYearWrappedPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
