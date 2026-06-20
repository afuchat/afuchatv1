import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, TrendingUp, Eye, Heart, Phone, AlertCircle, CheckCircle, Clock, Ban, Timer, BarChart3, Trophy, MessageCircle, Gift, ChevronRight, EyeOff, Crown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { EngagementDetailsSheet } from '@/components/earnings/EngagementDetailsSheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';
interface Eligibility {
  eligible: boolean;
  reason?: string;
  follower_count?: number;
  weekly_views?: number;
  current_followers?: number;
  current_views?: number;
}

interface Earning {
  id: string;
  amount_ugx: number;
  earned_date: string;
  engagement_score: number;
  views_count: number;
  likes_count: number;
}

interface Withdrawal {
  id: string;
  amount_ugx: number;
  phone_number: string;
  mobile_network: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TopPost {
  id: string;
  content: string;
  view_count: number;
  likes_count: number;
  replies_count: number;
  created_at: string;
  engagement_score: number;
  total_views: number;
  total_likes: number;
  total_replies: number;
  total_engagement_score: number;
  days_active: number;
  estimated_total_earnings: number;
}

export default function CreatorEarnings() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSheetOpen, setWithdrawSheetOpen] = useState(false);
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isWeekendNow, setIsWeekendNow] = useState(false);
  const [isPoolActive, setIsPoolActive] = useState(false);
  const [poolCountdown, setPoolCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedPost, setSelectedPost] = useState<TopPost | null>(null);
  const [detailsType, setDetailsType] = useState<'views' | 'likes' | 'replies' | 'total'>('total');
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();

  // Check user's country, missed earnings, privacy setting, admin status, and saved payment info
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile-earnings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('country, missed_earnings_total, hide_on_leaderboard, is_admin, withdrawal_phone, withdrawal_network')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Load saved payment info when profile loads
  useEffect(() => {
    if (userProfile?.withdrawal_phone && !phoneNumber) {
      setPhoneNumber(userProfile.withdrawal_phone);
    }
    if (userProfile?.withdrawal_network && !network) {
      setNetwork(userProfile.withdrawal_network);
    }
  }, [userProfile]);

  const isUgandan = userProfile?.country?.toLowerCase() === 'uganda' || userProfile?.country === 'UG';
  const missedEarningsTotal = userProfile?.missed_earnings_total || 0;
  const hideOnLeaderboard = userProfile?.hide_on_leaderboard || false;
  const isAdmin = userProfile?.is_admin || false;

  // Toggle privacy setting
  const handlePrivacyToggle = async (enabled: boolean) => {
    if (!isPremium) {
      toast.error('This feature is for Premium users only');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ hide_on_leaderboard: enabled })
        .eq('id', user?.id);
      
      if (error) throw error;
      toast.success(enabled ? 'Your identity is now hidden on the leaderboard' : 'Your identity is now visible on the leaderboard');
      refetchProfile();
    } catch (error: any) {
      toast.error('Failed to update privacy setting');
    }
  };

  // Calculate countdown to pool end (8pm Uganda time) and weekend
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = day === 0 || day === 6;
      setIsWeekendNow(isWeekend);

      // Calculate Uganda time (UTC+3)
      const ugandaOffset = 3 * 60; // Uganda is UTC+3
      const localOffset = now.getTimezoneOffset();
      const ugandaNow = new Date(now.getTime() + (ugandaOffset + localOffset) * 60 * 1000);
      const ugandaHour = ugandaNow.getHours();

      // Pool is active between 8am (8) and 8pm (20) Uganda time
      const poolActive = ugandaHour >= 8 && ugandaHour < 20;
      setIsPoolActive(poolActive);

      // Calculate countdown to 8pm Uganda time (pool end/credit time)
      let poolEndTarget: Date;
      if (ugandaHour < 8) {
        // Before 8am - countdown to 8am (pool start)
        poolEndTarget = new Date(ugandaNow);
        poolEndTarget.setHours(8, 0, 0, 0);
      } else if (ugandaHour < 20) {
        // During pool (8am-8pm) - countdown to 8pm
        poolEndTarget = new Date(ugandaNow);
        poolEndTarget.setHours(20, 0, 0, 0);
      } else {
        // After 8pm - countdown to 8am tomorrow
        poolEndTarget = new Date(ugandaNow);
        poolEndTarget.setDate(poolEndTarget.getDate() + 1);
        poolEndTarget.setHours(8, 0, 0, 0);
      }

      // Convert back to local time for diff calculation
      const poolEndLocal = new Date(poolEndTarget.getTime() - (ugandaOffset + localOffset) * 60 * 1000);
      const poolDiff = poolEndLocal.getTime() - now.getTime();

      if (poolDiff > 0) {
        const pHours = Math.floor(poolDiff / (1000 * 60 * 60));
        const pMinutes = Math.floor((poolDiff % (1000 * 60 * 60)) / (1000 * 60));
        const pSeconds = Math.floor((poolDiff % (1000 * 60)) / 1000);
        setPoolCountdown({ days: 0, hours: pHours, minutes: pMinutes, seconds: pSeconds });
      } else {
        setPoolCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }

      // Weekend countdown for withdrawals
      let targetDate: Date;
      if (isWeekend) {
        if (day === 6) {
          targetDate = new Date(now);
          targetDate.setDate(now.getDate() + 2);
          targetDate.setHours(0, 0, 0, 0);
        } else {
          targetDate = new Date(now);
          targetDate.setDate(now.getDate() + 1);
          targetDate.setHours(0, 0, 0, 0);
        }
      } else {
        const daysUntilSaturday = (6 - day + 7) % 7 || 7;
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysUntilSaturday);
        targetDate.setHours(0, 0, 0, 0);
      }

      const diff = targetDate.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check eligibility
  const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ['creator-eligibility', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_creator_eligibility', {
        p_user_id: user?.id
      });
      if (error) throw error;
      return data as unknown as Eligibility;
    },
    enabled: !!user?.id
  });

  // Get balance
  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['creator-balance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('available_balance_ugx')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data?.available_balance_ugx || 0;
    },
    enabled: !!user?.id
  });

  const queryClient = useQueryClient();

  // Refetch leaderboard function
  const refetchLeaderboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['daily-engagement-leaderboard'] });
  }, [queryClient]);

  // Real-time subscription for leaderboard updates
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_views' }, refetchLeaderboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_acknowledgments' }, refetchLeaderboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_replies' }, refetchLeaderboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchLeaderboard]);

  // Get today's leaderboard - REAL-TIME from all users' actual post engagement
  const { data: dailyLeaderboard } = useQuery({
    queryKey: ['daily-engagement-leaderboard', new Date().toDateString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_engagement_leaderboard');
      if (error) throw error;
      return data as Array<{
        user_id: string;
        display_name: string;
        handle: string;
        avatar_url: string | null;
        hide_on_leaderboard: boolean;
        views_count: number;
        likes_count: number;
        replies_count: number;
        engagement_score: number;
        potential_earnings: number;
      }>;
    },
    staleTime: 5000 // Consider fresh for 5 seconds to prevent excessive refetches
  });

  // Get current user's real-time earnings from the leaderboard
  const currentUserLeaderboardEntry = dailyLeaderboard?.find(p => p.user_id === user?.id);

  // Get earnings history (all days including today)
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['creator-earnings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', user?.id)
        .order('earned_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Earning[];
    },
    enabled: !!user?.id
  });

  // Get withdrawals
  const { data: withdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['creator-withdrawals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_withdrawals')
        .select('*')
        .eq('user_id', user?.id)
        .order('requested_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: !!user?.id
  });

  // Get top performing posts - DAILY engagement only to prevent cheating
  const { data: topPosts, isLoading: topPostsLoading } = useQuery({
    queryKey: ['creator-top-posts', user?.id, new Date().toDateString()], // Refresh daily
    queryFn: async () => {
      // Get today's date range (UTC)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      // Get user's posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, view_count')
        .eq('author_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      const dailyPool = 5000; // UGX daily pool

      // Get BOTH daily and all-time engagement for each post
      const postsWithEngagement = await Promise.all(
        posts.map(async (post) => {
          const [
            todayViewsResult, todayLikesResult, todayRepliesResult,
            totalLikesResult, totalRepliesResult
          ] = await Promise.all([
            // Today's views only
            supabase
              .from('post_views')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id)
              .gte('viewed_at', startOfDay)
              .lt('viewed_at', endOfDay),
            // Today's likes only
            supabase
              .from('post_acknowledgments')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id)
              .gte('created_at', startOfDay)
              .lt('created_at', endOfDay),
            // Today's replies only
            supabase
              .from('post_replies')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id)
              .gte('created_at', startOfDay)
              .lt('created_at', endOfDay),
            // ALL-TIME likes
            supabase
              .from('post_acknowledgments')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id),
            // ALL-TIME replies
            supabase
              .from('post_replies')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id)
          ]);

          // Today's stats (for daily earnings)
          const daily_views = todayViewsResult.count || 0;
          const daily_likes = todayLikesResult.count || 0;
          const daily_replies = todayRepliesResult.count || 0;
          const daily_engagement_score = (daily_views * 1) + (daily_likes * 3) + (daily_replies * 5);

          // All-time stats (for total earnings estimate)
          const total_views = post.view_count || 0;
          const total_likes = totalLikesResult.count || 0;
          const total_replies = totalRepliesResult.count || 0;
          const total_engagement_score = (total_views * 1) + (total_likes * 3) + (total_replies * 5);

          // Calculate days since post was created
          const createdDate = new Date(post.created_at);
          const daysActive = Math.max(1, Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

          // Estimate total earnings (assuming consistent daily share)
          // This is an estimate: (avg daily score / assumed pool share) * days active
          const avgDailyScore = total_engagement_score / daysActive;
          const estimatedDailyEarning = Math.round((avgDailyScore / Math.max(avgDailyScore * 10, 100)) * dailyPool * 0.1); // Conservative estimate
          const estimated_total_earnings = estimatedDailyEarning * daysActive;

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            // Today's stats
            view_count: daily_views,
            likes_count: daily_likes,
            replies_count: daily_replies,
            engagement_score: daily_engagement_score,
            // All-time stats
            total_views,
            total_likes,
            total_replies,
            total_engagement_score,
            days_active: daysActive,
            estimated_total_earnings
          } as TopPost;
        })
      );

      // Sort by total engagement score (best performing posts on top)
      return postsWithEngagement
        .filter(post => post.total_engagement_score > 0)
        .sort((a, b) => b.total_engagement_score - a.total_engagement_score);
    },
    enabled: !!user?.id
  });

  const handleWithdraw = async () => {
    if (!phoneNumber || !network) {
      toast.error('Please enter phone number and select network');
      return;
    }

    const amount = parseInt(withdrawAmount) || 0;
    if (amount <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (!isAdmin && amount < 5000) {
      toast.error('Minimum withdrawal amount is 5,000 UGX');
      return;
    }

    if (amount > (balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setWithdrawing(true);
    try {
      // Save payment info for future use
      await supabase
        .from('profiles')
        .update({ 
          withdrawal_phone: phoneNumber, 
          withdrawal_network: network 
        })
        .eq('id', user?.id);

      const { data, error } = await supabase.rpc('request_creator_withdrawal', {
        p_amount_ugx: amount,
        p_phone_number: phoneNumber,
        p_mobile_network: network
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; message?: string; error?: string; net_amount?: number; fee?: number };
      if (result.success) {
        toast.success(`Withdrawal request submitted! Net: ${result.net_amount?.toLocaleString()} UGX (Fee: ${result.fee?.toLocaleString()} UGX)`);
        setWithdrawSheetOpen(false);
        setWithdrawAmount('');
        refetchBalance();
        refetchWithdrawals();
      } else {
        toast.error(result.error || result.message || 'Failed to request withdrawal');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to request withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <Ban className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatCountdownUnit = (value: number) => value.toString().padStart(2, '0');

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view creator earnings</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative">
      <PageHeader title="Creator Earnings" subtitle="Daily 5,000 UGX Giveaway" />

      {/* Country Restriction Overlay for non-Ugandan users */}
      {!isUgandan && userProfile && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="mx-4 max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Ban className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Region Restricted</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  Creator Earnings is currently only available for users in Uganda. 
                  This program rewards Ugandan content creators with daily UGX payouts.
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  🌍 We're working to expand to more regions. Stay tuned for updates!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Eligibility Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Eligibility Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eligibilityLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : eligibility?.eligible ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">You're eligible for the creator program!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>Followers: {eligibility.follower_count}</div>
                  <div>Weekly Views: {eligibility.weekly_views}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <Ban className="h-5 w-5" />
                  <span className="font-medium">Not Eligible</span>
                </div>
                <p className="text-sm text-muted-foreground">{eligibility?.reason}</p>
                {eligibility?.current_followers !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Current followers: {eligibility.current_followers}/10
                  </p>
                )}
                {eligibility?.current_views !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Current weekly views: {eligibility.current_views}/500
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pool Status & Timer */}
        <Card className={`border-2 ${isPoolActive ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className={`h-5 w-5 ${isPoolActive ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${isPoolActive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPoolActive ? 'Pool Active' : 'Pool Ended'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Daily 8am - 8pm (Uganda Time)
                  </p>
                  {!isPoolActive && (
                    <p className="text-xs text-red-500/80 mt-1">
                      Earnings credited at 8pm • Next pool opens 8am
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono">
                  {String(poolCountdown.hours).padStart(2, '0')}:{String(poolCountdown.minutes).padStart(2, '0')}:{String(poolCountdown.seconds).padStart(2, '0')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPoolActive ? 'Until credit time' : 'Until pool opens'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Live Potential Earnings - Shows real-time earnings from leaderboard */}
        <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Your Today's Earnings
              <span className="text-xs font-normal text-muted-foreground ml-auto">Live</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-primary">
                  {currentUserLeaderboardEntry?.potential_earnings?.toLocaleString() || '0'}
                </p>
                <span className="text-lg text-muted-foreground mb-1">UGX</span>
              </div>
              
              {currentUserLeaderboardEntry ? (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-background/50 rounded-lg p-2">
                    <Eye className="h-4 w-4 mx-auto text-blue-500" />
                    <p className="text-sm font-medium">{currentUserLeaderboardEntry.views_count}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2">
                    <Heart className="h-4 w-4 mx-auto text-red-500" />
                    <p className="text-sm font-medium">{currentUserLeaderboardEntry.likes_count}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2">
                    <MessageCircle className="h-4 w-4 mx-auto text-purple-500" />
                    <p className="text-sm font-medium">{currentUserLeaderboardEntry.replies_count}</p>
                    <p className="text-xs text-muted-foreground">Replies</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2">
                    <BarChart3 className="h-4 w-4 mx-auto text-green-500" />
                    <p className="text-sm font-medium">{currentUserLeaderboardEntry.engagement_score}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No engagement on your posts yet today</p>
                  <p className="text-xs">Get views, likes, or replies to join the leaderboard!</p>
                </div>
              )}
              
              <div className={`p-2 rounded-lg ${eligibility?.eligible ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                <p className={`text-xs flex items-center gap-1 ${eligibility?.eligible ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                  <Clock className="h-3 w-3" />
                  {eligibility?.eligible 
                    ? 'This amount will be credited to your balance at 8pm if you remain eligible'
                    : 'Not credited - become eligible to receive this at 8pm'}
                </p>
              </div>
              
              <p className="text-xs text-muted-foreground">
                💡 Pool: 5,000 UGX shared proportionally. More engagement = bigger share.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Missed Earnings for Non-Eligible Users */}
        {!eligibility?.eligible && missedEarningsTotal > 0 && (
          <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Ban className="h-8 w-8 text-red-500/70" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Missed Earnings</p>
                  <p className="text-2xl font-bold text-red-500">{missedEarningsTotal.toLocaleString()} UGX</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You could have earned this if you were eligible. Meet the requirements to stop missing out!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Leaderboard - Live Rankings */}
        <Accordion type="single" collapsible defaultValue="leaderboard">
          <AccordionItem value="leaderboard" className="border rounded-lg bg-card">
            <AccordionTrigger className={`px-4 py-3 hover:no-underline ${!isPoolActive ? 'opacity-75' : ''}`}>
              <div className="flex items-center gap-2 flex-1">
                <Trophy className={`h-4 w-4 ${isPoolActive ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <span className="text-base font-semibold">Today's Leaderboard</span>
                <span className={`text-xs font-normal ml-auto mr-2 ${isPoolActive ? 'text-green-600' : 'text-red-500'}`}>
                  {isPoolActive ? 'Live Rankings' : 'Ended • Credited'}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
            {/* Privacy Toggle for current user */}
            <div className="mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Hide My Identity</p>
                    <p className="text-xs text-muted-foreground">Appear anonymous on the leaderboard</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isPremium && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs text-yellow-600"
                      onClick={() => navigate('/premium')}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Button>
                  )}
                  <Switch
                    checked={hideOnLeaderboard}
                    onCheckedChange={handlePrivacyToggle}
                    disabled={!isPremium}
                  />
                </div>
              </div>
            </div>

            {!dailyLeaderboard || dailyLeaderboard.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No participants yet today</p>
                <p className="text-xs">Be the first to get engagement!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dailyLeaderboard.map((participant, index) => {
                  const isCurrentUser = participant.user_id === user?.id;
                  const rank = index + 1;
                  const medalColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-600' : 'text-muted-foreground';
                  const isHidden = participant.hide_on_leaderboard && !isCurrentUser;
                  
                  return (
                    <div 
                      key={participant.user_id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${isCurrentUser ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}
                    >
                      {/* Rank */}
                      <div className={`w-6 h-6 flex items-center justify-center font-bold text-sm ${medalColor}`}>
                        {rank <= 3 ? (
                          <Trophy className="h-4 w-4" />
                        ) : (
                          `#${rank}`
                        )}
                      </div>
                      
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {isHidden ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ) : participant.avatar_url ? (
                          <img src={participant.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                            {participant.display_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      
                      {/* Name & Handle */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                          {isHidden ? (
                            <span className="text-muted-foreground italic flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Hidden User
                            </span>
                          ) : (
                            <>
                              {participant.display_name?.length > 12 
                                ? participant.display_name.slice(0, 12) + '...' 
                                : participant.display_name}
                              {isCurrentUser && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (You{participant.hide_on_leaderboard ? ' - Hidden' : ''})
                                </span>
                              )}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          👁 {participant.views_count} • ❤️ {participant.likes_count} • 💬 {participant.replies_count}
                        </p>
                      </div>
                      
                      {/* Earnings */}
                      <div className="text-right">
                        <p className="font-bold text-sm text-primary">{participant.potential_earnings.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">UGX</p>
                      </div>
                    </div>
                  );
                })}
                
                {/* Pool Info */}
                <div className="pt-2 border-t border-border mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Daily Pool: 5,000 UGX</span>
                    <span>Participants: {dailyLeaderboard.length}</span>
                  </div>
                </div>
              </div>
            )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Potential Earnings Banner for Non-Eligible Users */}
        {!eligibility?.eligible && topPosts && topPosts.length > 0 && (
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Gift className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">You Could Have Earned</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                    ~{topPosts.reduce((sum, p) => sum + (p.engagement_score > 0 ? Math.round((p.engagement_score / Math.max(topPosts.reduce((s, pt) => s + pt.engagement_score, 0), 100)) * 5000) : 0), 0).toLocaleString()} UGX
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on today's engagement. Become eligible to start earning!
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  📊 Your posts are generating engagement but you're not eligible yet. 
                  Get <strong>10+ followers</strong> and <strong>500+ weekly views</strong> to unlock earnings.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Balance Card with Withdraw Button - For Eligible Users and Admins */}
        <Card className={(eligibility?.eligible || isAdmin) ? "bg-gradient-to-br from-primary/10 to-primary/5" : "bg-muted/30"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {(eligibility?.eligible || isAdmin) ? 'Available Balance' : 'Potential Balance (Not Credited)'}
                </p>
                <p className={`text-3xl font-bold ${(eligibility?.eligible || isAdmin) ? '' : 'text-muted-foreground'}`}>
                  {(eligibility?.eligible || isAdmin) ? (balance || 0).toLocaleString() : '---'} UGX
                </p>
              </div>
              <Wallet className={`h-10 w-10 ${(eligibility?.eligible || isAdmin) ? 'text-primary' : 'text-muted-foreground'} opacity-50`} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {eligibility?.eligible || isAdmin
                ? 'Minimum withdrawal: 5,000 UGX • Weekends only • 10% fee'
                : 'Earnings will be credited once you become eligible'}
            </p>

            {/* Withdraw Button - Admins can withdraw anytime, others only on weekends */}
            {(eligibility?.eligible || isAdmin) && (
              <div className="mt-4">
                {(isWeekendNow || isAdmin) ? (
                  <Sheet open={withdrawSheetOpen} onOpenChange={setWithdrawSheetOpen}>
                    <SheetTrigger asChild>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50" 
                        size="lg"
                        disabled={isAdmin ? (balance || 0) <= 0 : (balance || 0) < 5000}
                      >
                        <Wallet className="h-5 w-5 mr-2" />
                        Withdraw Now
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <SheetHeader className="flex-shrink-0 px-6 pt-2">
                        <SheetTitle className="flex items-center gap-2">
                          <Phone className="h-5 w-5" />
                          Withdraw to Mobile Money
                        </SheetTitle>
                      </SheetHeader>
                      <div className="flex-1 overflow-y-auto px-6 pb-safe">
                        <div className="space-y-4 py-4 pb-8">
                          <div className="bg-green-500/10 border-green-500/20 border rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                              <CheckCircle className="h-4 w-4" />
                              <span>Withdrawals are open!</span>
                            </div>
                            {isWeekendNow && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Window closes in: {formatCountdownUnit(countdown.hours)}:{formatCountdownUnit(countdown.minutes)}:{formatCountdownUnit(countdown.seconds)}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Amount to Withdraw (UGX)</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              placeholder={isAdmin ? "Enter amount" : "Min: 5,000 UGX"}
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Available: {(balance || 0).toLocaleString()} UGX</span>
                              <button 
                                type="button"
                                className="text-primary hover:underline"
                                onClick={() => setWithdrawAmount(String(balance || 0))}
                              >
                                Withdraw All
                              </button>
                            </div>
                            {withdrawAmount && parseInt(withdrawAmount) > 0 && (
                              <div className="bg-muted/50 rounded-lg p-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Amount:</span>
                                  <span>{parseInt(withdrawAmount).toLocaleString()} UGX</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Fee (10%):</span>
                                  <span>-{Math.ceil(parseInt(withdrawAmount) * 0.1).toLocaleString()} UGX</span>
                                </div>
                                <div className="flex justify-between font-medium text-green-600 border-t border-border pt-1 mt-1">
                                  <span>You'll receive:</span>
                                  <span>{(parseInt(withdrawAmount) - Math.ceil(parseInt(withdrawAmount) * 0.1)).toLocaleString()} UGX</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Mobile Network</Label>
                            <Select value={network} onValueChange={setNetwork}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select network" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                                <SelectItem value="Airtel">Airtel Money</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                              type="tel"
                              inputMode="tel"
                              placeholder="07XXXXXXXX"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                          </div>

                          <Button 
                            className="w-full" 
                            onClick={handleWithdraw}
                            disabled={
                              withdrawing || 
                              !withdrawAmount || 
                              parseInt(withdrawAmount) <= 0 ||
                              parseInt(withdrawAmount) > (balance || 0) ||
                              (!isAdmin && parseInt(withdrawAmount) < 5000)
                            }
                          >
                            {withdrawing ? 'Processing...' : `Withdraw ${withdrawAmount ? parseInt(withdrawAmount).toLocaleString() : 0} UGX`}
                          </Button>

                          <p className="text-xs text-muted-foreground text-center pb-4">
                            {isAdmin ? 'No minimum • ' : 'Minimum: 5,000 UGX • '}10% platform fee will be deducted
                          </p>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      size="lg" 
                      disabled 
                      variant="secondary"
                    >
                      <Timer className="h-5 w-5 mr-2" />
                      Withdraw (Opens Weekend)
                    </Button>
                    
                    {/* Countdown Display */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground text-center mb-2">
                        Opens in
                      </p>
                      <div className="flex justify-center gap-2">
                        <div className="bg-background rounded-lg px-3 py-2 min-w-[60px] text-center">
                          <p className="text-xl font-bold">{formatCountdownUnit(countdown.days)}</p>
                          <p className="text-xs text-muted-foreground">Days</p>
                        </div>
                        <div className="bg-background rounded-lg px-3 py-2 min-w-[60px] text-center">
                          <p className="text-xl font-bold">{formatCountdownUnit(countdown.hours)}</p>
                          <p className="text-xs text-muted-foreground">Hours</p>
                        </div>
                        <div className="bg-background rounded-lg px-3 py-2 min-w-[60px] text-center">
                          <p className="text-xl font-bold">{formatCountdownUnit(countdown.minutes)}</p>
                          <p className="text-xs text-muted-foreground">Mins</p>
                        </div>
                        <div className="bg-background rounded-lg px-3 py-2 min-w-[60px] text-center">
                          <p className="text-xl font-bold">{formatCountdownUnit(countdown.seconds)}</p>
                          <p className="text-xs text-muted-foreground">Secs</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Available Saturday & Sunday only
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post Performance & Total Earnings */}
        <Accordion type="single" collapsible>
          <AccordionItem value="posts" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-base font-semibold">Post Earnings Analysis</span>
                {topPosts && topPosts.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">{topPosts.length} posts</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
            {topPostsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : topPosts && topPosts.length > 0 ? (
              <div className="space-y-3">
                {/* Info Box */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-muted-foreground">
                    📊 <strong>Ranked by total earnings</strong> — Posts with highest lifetime engagement are on top. Daily payouts are still based on TODAY's engagement only.
                  </p>
                </div>

                {topPosts.slice(0, 10).map((post, index) => {
                  const maxScore = topPosts[0]?.total_engagement_score || 1;
                  const scorePercent = (post.total_engagement_score / maxScore) * 100;
                  
                  return (
                    <div key={post.id} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-yellow-950' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-amber-600 text-amber-50' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index === 0 ? <Trophy className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">
                            {post.content.slice(0, 80)}{post.content.length > 80 ? '...' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {post.days_active} day{post.days_active !== 1 ? 's' : ''} active
                          </p>
                        </div>
                      </div>

                      {/* Total Stats (All-time) - Clickable */}
                      <div 
                        className="bg-background/50 rounded-lg p-2 cursor-pointer hover:bg-background/80 transition-colors"
                        onClick={() => {
                          setSelectedPost(post);
                          setDetailsType('total');
                          setDetailsSheetOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">Total (All-time)</p>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <button 
                            className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPost(post);
                              setDetailsType('views');
                              setDetailsSheetOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3" /> {post.total_views.toLocaleString()}
                          </button>
                          <button 
                            className="flex items-center gap-1 hover:text-red-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPost(post);
                              setDetailsType('likes');
                              setDetailsSheetOpen(true);
                            }}
                          >
                            <Heart className="h-3 w-3" /> {post.total_likes.toLocaleString()}
                          </button>
                          <button 
                            className="flex items-center gap-1 hover:text-green-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPost(post);
                              setDetailsType('replies');
                              setDetailsSheetOpen(true);
                            }}
                          >
                            <MessageCircle className="h-3 w-3" /> {post.total_replies.toLocaleString()}
                          </button>
                        </div>
                      </div>

                      {/* Today's Stats - Clickable */}
                      {post.engagement_score > 0 && (
                        <div 
                          className="bg-green-500/10 rounded-lg p-2 cursor-pointer hover:bg-green-500/20 transition-colors"
                          onClick={() => {
                            setSelectedPost(post);
                            setDetailsType('total');
                            setDetailsSheetOpen(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-green-600">Today's Activity</p>
                            <ChevronRight className="h-3 w-3 text-green-600" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-green-700 mt-1">
                            <button 
                              className="flex items-center gap-1 hover:text-green-800 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPost(post);
                                setDetailsType('views');
                                setDetailsSheetOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3" /> +{post.view_count}
                            </button>
                            <button 
                              className="flex items-center gap-1 hover:text-green-800 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPost(post);
                                setDetailsType('likes');
                                setDetailsSheetOpen(true);
                              }}
                            >
                              <Heart className="h-3 w-3" /> +{post.likes_count}
                            </button>
                            <button 
                              className="flex items-center gap-1 hover:text-green-800 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPost(post);
                                setDetailsType('replies');
                                setDetailsSheetOpen(true);
                              }}
                            >
                              <MessageCircle className="h-3 w-3" /> +{post.replies_count}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="flex items-center gap-2">
                        <Progress value={scorePercent} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-primary min-w-[70px] text-right">
                          {post.total_engagement_score.toLocaleString()} pts
                        </span>
                      </div>

                      {/* Estimated Total Earnings */}
                      <div 
                        className="flex items-center justify-between pt-2 border-t border-border/50 cursor-pointer hover:bg-muted/30 -mx-3 px-3 pb-1 rounded-b-lg transition-colors"
                        onClick={() => {
                          setSelectedPost(post);
                          setDetailsType('total');
                          setDetailsSheetOpen(true);
                        }}
                      >
                        <span className="text-xs text-muted-foreground">
                          Est. Total Earned
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-base font-bold text-green-600">
                            ~{post.estimated_total_earnings.toLocaleString()} UGX
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Info Legend */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium mb-2">How Earnings Work</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>📅 <strong>Daily payouts:</strong> Based only on TODAY's engagement (no cheating)</p>
                    <p>📊 <strong>Total estimated:</strong> Cumulative earnings since post was created</p>
                    <p>⚡ Score = Views×1 + Likes×3 + Replies×5</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No posts with engagement yet. Create content to see earnings analysis!
              </p>
            )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Recent Earnings */}
        <Accordion type="single" collapsible>
          <AccordionItem value="earnings" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-base font-semibold">Recent Earnings</span>
                {earnings && earnings.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">{earnings.length} days</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
            {earningsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : earnings && earnings.length > 0 ? (
              <div className="space-y-2">
                {earnings.map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-600">+{earning.amount_ugx.toLocaleString()} UGX</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(earning.earned_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {earning.views_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {earning.likes_count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No earnings yet. Keep creating great content!
              </p>
            )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Withdrawal History */}
        <Accordion type="single" collapsible>
          <AccordionItem value="withdrawals" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="text-base font-semibold">Withdrawal History</span>
                {withdrawals && withdrawals.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">{withdrawals.length} requests</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
            {withdrawalsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : withdrawals && withdrawals.length > 0 ? (
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{withdrawal.amount_ugx.toLocaleString()} UGX</p>
                      <p className="text-xs text-muted-foreground">
                        {withdrawal.mobile_network} • {withdrawal.phone_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(withdrawal.requested_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 capitalize">
                      {getStatusIcon(withdrawal.status)}
                      <span className="text-sm">{withdrawal.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No withdrawals yet
              </p>
            )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Program Info & Terms Combined */}
        <Accordion type="single" collapsible>
          <AccordionItem value="info" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-base font-semibold">How It Works & Terms</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>🇺🇬 Available for <strong>Uganda creators</strong> only</p>
                <p>💰 <strong>5,000 UGX</strong> daily pool distributed among active creators</p>
                <p>⏰ Pool operates <strong>8 AM - 8 PM Uganda Time</strong> (UTC+3)</p>
                <p>📊 Earnings based on <strong>today's engagement only</strong> (views×1 + likes×3 + replies×5)</p>
                <p>🔄 Engagement resets daily — no retroactive credits for past days!</p>
                <p>💵 Withdraw custom amounts to <strong>MTN or Airtel Money</strong></p>
                <p>📱 Payment info saved for quick future withdrawals</p>
                <p className="text-xs pt-2">
                  Questions? Ask <strong>AfuAI</strong> for full program details
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Terms & Conditions
                </p>
                <div className="text-xs text-muted-foreground space-y-2 p-3 bg-muted/30 rounded-lg">
                  <p><strong>1. Eligibility:</strong> You must have at least 10 followers and 500+ weekly views (50 for admins) across your posts to qualify for earnings. Eligibility is checked at credit time (8 PM).</p>
                  <p><strong>2. Pool Hours:</strong> The earning pool is active from 8 AM to 8 PM Uganda Time (UTC+3). Engagement outside these hours does not count toward daily earnings.</p>
                  <p><strong>3. Daily Earnings Only:</strong> Earnings are calculated based on TODAY's engagement only during pool hours. Past engagement cannot be retroactively credited. If you become eligible after pool closes, today's earnings are lost.</p>
                  <p><strong>4. Scoring Formula:</strong> Engagement score = Views×1 + Likes×3 + Replies×5. Your share of the 5,000 UGX pool is proportional to your engagement score relative to all other creators.</p>
                  <p><strong>5. No Cheating:</strong> Fake engagement, bot interactions, self-likes, engagement farming, or any fraudulent activity will result in permanent ban. All engagement is verified.</p>
                  <p><strong>6. Withdrawal Rules:</strong> Minimum withdrawal is 5,000 UGX. You can withdraw any amount up to your balance. Withdrawals available on weekends only (Saturday & Sunday) via MTN or Airtel Mobile Money.</p>
                  <p><strong>7. Platform Fee:</strong> A 10% platform fee is deducted from all withdrawals. This applies to all users including admins.</p>
                  <p><strong>8. Payment Info:</strong> Your phone number and mobile network are saved after your first withdrawal for faster future transactions.</p>
                  <p><strong>9. Approval Process:</strong> All withdrawal requests are reviewed by our team within 24-48 hours. We reserve the right to reject or delay withdrawals for suspicious accounts.</p>
                  <p><strong>10. No Guarantees:</strong> Earnings depend on your proportional share of the daily pool. More creators = smaller individual earnings. There is no guaranteed minimum earning amount.</p>
                  <p><strong>11. Missed Earnings:</strong> If you are ineligible at 8 PM credit time, your potential earnings for that day are permanently lost and added to your "Missed Earnings" total.</p>
                  <p><strong>12. Changes:</strong> AfuChat reserves the right to modify, suspend, or terminate the Creator Earnings program, eligibility criteria, pool amounts, and fee structure at any time without prior notice.</p>
                  <p><strong>13. Tax Responsibility:</strong> You are solely responsible for any taxes applicable to your earnings. AfuChat does not provide tax advice or withhold taxes.</p>
                  <p><strong>14. Geographic Restriction:</strong> This program is currently available only to creators in Uganda with valid Ugandan mobile money numbers.</p>
                  <p><strong>15. Privacy:</strong> Premium users can hide their identity on the leaderboard while still earning. Non-premium users appear publicly.</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Engagement Details Sheet */}
      <EngagementDetailsSheet
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        type={detailsType}
        post={selectedPost}
        isEligible={eligibility?.eligible || false}
      />
    </div>
  );
}