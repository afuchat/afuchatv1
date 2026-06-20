import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, subDays, subMonths, subYears, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ActiveUsersAnalyticsProps {
  users: any[];
  messages: any[];
  posts: any[];
  postViews: any[];
  likes?: any[];
}

interface ActiveUserStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
}

export function ActiveUsersAnalytics({ users, messages, posts, postViews, likes = [] }: ActiveUsersAnalyticsProps) {
  // Calculate active users based on various activities
  const activeUserStats = useMemo(() => {
    const now = new Date();
    
    // Get all user activities with their user_id and timestamp
    const allActivities: { userId: string; date: Date }[] = [];
    
    // Add message activities
    messages.forEach(m => {
      if (m.sender_id && m.sent_at) {
        allActivities.push({ userId: m.sender_id, date: new Date(m.sent_at) });
      }
    });
    
    // Add post activities
    posts.forEach(p => {
      if (p.author_id && p.created_at) {
        allActivities.push({ userId: p.author_id, date: new Date(p.created_at) });
      }
    });
    
    // Add view activities
    postViews.forEach(v => {
      if (v.viewer_id && v.viewed_at) {
        allActivities.push({ userId: v.viewer_id, date: new Date(v.viewed_at) });
      }
    });
    
    // Add like activities
    likes.forEach(l => {
      if (l.user_id && l.created_at) {
        allActivities.push({ userId: l.user_id, date: new Date(l.created_at) });
      }
    });
    
    // Helper to count unique users in a date range
    const countUniqueUsersInRange = (start: Date, end: Date): number => {
      const uniqueUsers = new Set<string>();
      allActivities.forEach(activity => {
        if (isWithinInterval(activity.date, { start, end })) {
          uniqueUsers.add(activity.userId);
        }
      });
      return uniqueUsers.size;
    };
    
    // Today's active users
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const daily = countUniqueUsersInRange(todayStart, todayEnd);
    
    // Yesterday's active users (for comparison)
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const yesterdayDaily = countUniqueUsersInRange(yesterdayStart, yesterdayEnd);
    
    // This week's active users
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekly = countUniqueUsersInRange(weekStart, weekEnd);
    
    // Last week's active users (for comparison)
    const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    const lastWeekly = countUniqueUsersInRange(lastWeekStart, lastWeekEnd);
    
    // This month's active users
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthly = countUniqueUsersInRange(monthStart, monthEnd);
    
    // Last month's active users (for comparison)
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonthly = countUniqueUsersInRange(lastMonthStart, lastMonthEnd);
    
    // This year's active users
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    const yearly = countUniqueUsersInRange(yearStart, yearEnd);
    
    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    return {
      daily,
      weekly,
      monthly,
      yearly,
      dailyChange: calcChange(daily, yesterdayDaily),
      weeklyChange: calcChange(weekly, lastWeekly),
      monthlyChange: calcChange(monthly, lastMonthly),
    };
  }, [messages, posts, postViews, likes]);
  
  // Daily active users trend (last 30 days)
  const dailyTrendData = useMemo(() => {
    const now = new Date();
    const days = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const uniqueUsers = new Set<string>();
      
      messages.forEach(m => {
        if (m.sender_id && m.sent_at) {
          const msgDate = new Date(m.sent_at);
          if (isWithinInterval(msgDate, { start: dayStart, end: dayEnd })) {
            uniqueUsers.add(m.sender_id);
          }
        }
      });
      
      posts.forEach(p => {
        if (p.author_id && p.created_at) {
          const postDate = new Date(p.created_at);
          if (isWithinInterval(postDate, { start: dayStart, end: dayEnd })) {
            uniqueUsers.add(p.author_id);
          }
        }
      });
      
      postViews.forEach(v => {
        if (v.viewer_id && v.viewed_at) {
          const viewDate = new Date(v.viewed_at);
          if (isWithinInterval(viewDate, { start: dayStart, end: dayEnd })) {
            uniqueUsers.add(v.viewer_id);
          }
        }
      });
      
      likes.forEach(l => {
        if (l.user_id && l.created_at) {
          const likeDate = new Date(l.created_at);
          if (isWithinInterval(likeDate, { start: dayStart, end: dayEnd })) {
            uniqueUsers.add(l.user_id);
          }
        }
      });
      
      days.push({
        date: format(date, 'MMM d'),
        users: uniqueUsers.size,
      });
    }
    
    return days;
  }, [messages, posts, postViews, likes]);
  
  // Weekly trend (last 12 weeks)
  const weeklyTrendData = useMemo(() => {
    const now = new Date();
    const weeks = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekDate = subDays(now, i * 7);
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
      
      const uniqueUsers = new Set<string>();
      
      messages.forEach(m => {
        if (m.sender_id && m.sent_at) {
          const msgDate = new Date(m.sent_at);
          if (isWithinInterval(msgDate, { start: weekStart, end: weekEnd })) {
            uniqueUsers.add(m.sender_id);
          }
        }
      });
      
      posts.forEach(p => {
        if (p.author_id && p.created_at) {
          const postDate = new Date(p.created_at);
          if (isWithinInterval(postDate, { start: weekStart, end: weekEnd })) {
            uniqueUsers.add(p.author_id);
          }
        }
      });
      
      postViews.forEach(v => {
        if (v.viewer_id && v.viewed_at) {
          const viewDate = new Date(v.viewed_at);
          if (isWithinInterval(viewDate, { start: weekStart, end: weekEnd })) {
            uniqueUsers.add(v.viewer_id);
          }
        }
      });
      
      likes.forEach(l => {
        if (l.user_id && l.created_at) {
          const likeDate = new Date(l.created_at);
          if (isWithinInterval(likeDate, { start: weekStart, end: weekEnd })) {
            uniqueUsers.add(l.user_id);
          }
        }
      });
      
      weeks.push({
        week: `W${format(weekStart, 'w')}`,
        users: uniqueUsers.size,
      });
    }
    
    return weeks;
  }, [messages, posts, postViews, likes]);
  
  const renderChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-500 text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{change}%
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-500 text-xs">
          <TrendingDown className="h-3 w-3 mr-1" />
          {change}%
        </div>
      );
    }
    return (
      <div className="flex items-center text-muted-foreground text-xs">
        <Minus className="h-3 w-3 mr-1" />
        0%
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        Active Users Analytics
      </h3>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Active Users (DAU)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-blue-500">
                {activeUserStats.daily.toLocaleString()}
              </span>
              {renderChangeIndicator(activeUserStats.dailyChange)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs yesterday</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Active Users (WAU)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-green-500">
                {activeUserStats.weekly.toLocaleString()}
              </span>
              {renderChangeIndicator(activeUserStats.weeklyChange)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last week</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Active Users (MAU)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-purple-500">
                {activeUserStats.monthly.toLocaleString()}
              </span>
              {renderChangeIndicator(activeUserStats.monthlyChange)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yearly Active Users (YAU)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-amber-500">
                {activeUserStats.yearly.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">this year</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Daily Active Users (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis 
                    dataKey="date" 
                    className="text-[10px]" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis 
                    className="text-[10px]" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Active Users']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(220, 70%, 50%)" 
                    fill="hsl(220, 70%, 50%)" 
                    fillOpacity={0.3}
                    name="Active Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Weekly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Weekly Active Users (Last 12 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis 
                    dataKey="week" 
                    className="text-[10px]" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-[10px]" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Active Users']}
                  />
                  <Bar 
                    dataKey="users" 
                    fill="hsl(120, 70%, 40%)" 
                    radius={[4, 4, 0, 0]}
                    name="Active Users"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* User Engagement Ratio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">User Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">DAU/MAU Ratio</p>
              <p className="text-2xl font-bold text-primary">
                {activeUserStats.monthly > 0 
                  ? Math.round((activeUserStats.daily / activeUserStats.monthly) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Stickiness</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">WAU/MAU Ratio</p>
              <p className="text-2xl font-bold text-primary">
                {activeUserStats.monthly > 0 
                  ? Math.round((activeUserStats.weekly / activeUserStats.monthly) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Weekly Retention</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Registered</p>
              <p className="text-2xl font-bold text-primary">
                {users.length.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">All Users</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Active Rate</p>
              <p className="text-2xl font-bold text-primary">
                {users.length > 0 
                  ? Math.round((activeUserStats.monthly / users.length) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">MAU / Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
