import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, subDays, subMonths, eachDayOfInterval, eachMonthOfInterval, subHours, eachHourOfInterval } from 'date-fns';
import { 
  Users, MessageSquare, FileText, Gift, Coins, UserPlus, Eye, Heart, 
  Image, Gamepad2, AlertTriangle, Wallet, Send, RefreshCw, TrendingUp
} from 'lucide-react';

interface AnalyticsData {
  users: any[];
  posts: any[];
  messages: any[];
  giftTransactions: any[];
  acoinTransactions: any[];
  follows: any[];
  postViews: any[];
  stories?: any[];
  tips?: any[];
  redEnvelopes?: any[];
  referrals?: any[];
  gameScores?: any[];
  userReports?: any[];
  messageReports?: any[];
  likes?: any[];
  replies?: any[];
  subscriptions?: any[];
}

interface AdminAnalyticsChartsProps {
  data: AnalyticsData;
  timeRange: 'today' | 'week' | 'month' | 'year';
}

type TimeRangeType = 'today' | 'week' | 'month' | 'year';

const COLORS = ['hsl(183, 100%, 40%)', 'hsl(280, 70%, 50%)', 'hsl(45, 100%, 50%)', 'hsl(120, 70%, 40%)', 'hsl(0, 70%, 50%)'];

interface FeatureChartProps {
  title: string;
  icon: React.ReactNode;
  data: any[];
  dateField: string;
  color: string;
  chartType?: 'line' | 'bar' | 'area';
}

function FeatureChart({ title, icon, data, dateField, color, chartType = 'bar' }: FeatureChartProps) {
  const [localTimeRange, setLocalTimeRange] = useState<TimeRangeType>('week');

  const chartData = useMemo(() => {
    const now = new Date();
    let dateRange: Date[];
    let groupByFormat: string;

    if (localTimeRange === 'today') {
      dateRange = eachHourOfInterval({
        start: subHours(now, 24),
        end: now
      });
      groupByFormat = 'HH:00';
    } else if (localTimeRange === 'week') {
      dateRange = eachDayOfInterval({
        start: subDays(now, 7),
        end: now
      });
      groupByFormat = 'EEE';
    } else if (localTimeRange === 'month') {
      dateRange = eachDayOfInterval({
        start: subDays(now, 30),
        end: now
      });
      groupByFormat = 'MMM d';
    } else {
      dateRange = eachMonthOfInterval({
        start: subMonths(now, 12),
        end: now
      });
      groupByFormat = 'MMM';
    }

    return dateRange.map(date => {
      const dateStr = format(date, groupByFormat);
      const count = data.filter(item => {
        if (!item[dateField]) return false;
        const itemDate = new Date(item[dateField]);
        if (localTimeRange === 'today') {
          return format(itemDate, 'HH:00') === dateStr && 
                 itemDate >= subHours(now, 24);
        } else if (localTimeRange === 'year') {
          return format(itemDate, 'MMM') === dateStr &&
                 format(itemDate, 'yyyy') === format(date, 'yyyy');
        }
        return format(itemDate, groupByFormat) === dateStr;
      }).length;
      return { date: dateStr, count };
    });
  }, [data, dateField, localTimeRange]);

  const total = chartData.reduce((acc, item) => acc + item.count, 0);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
    };

    const chartContent = (
      <>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis 
          dataKey="date" 
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
        />
      </>
    );

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {chartContent}
          <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} name="Count" />
        </LineChart>
      );
    } else if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          {chartContent}
          <Area type="monotone" dataKey="count" stroke={color} fill={color} fillOpacity={0.3} name="Count" />
        </AreaChart>
      );
    }
    return (
      <BarChart {...commonProps}>
        {chartContent}
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} name="Count" />
      </BarChart>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Select value={localTimeRange} onValueChange={(v: TimeRangeType) => setLocalTimeRange(v)}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-2xl font-black text-primary">{total.toLocaleString()}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsCharts({ data, timeRange }: AdminAnalyticsChartsProps) {
  // Combined platform activity chart
  const combinedChartData = useMemo(() => {
    const now = new Date();
    let dateRange: Date[];
    let groupByFormat: string;

    if (timeRange === 'today') {
      dateRange = eachHourOfInterval({ start: subHours(now, 24), end: now });
      groupByFormat = 'HH:00';
    } else if (timeRange === 'week') {
      dateRange = eachDayOfInterval({ start: subDays(now, 7), end: now });
      groupByFormat = 'EEE';
    } else if (timeRange === 'month') {
      dateRange = eachDayOfInterval({ start: subDays(now, 30), end: now });
      groupByFormat = 'MMM d';
    } else {
      dateRange = eachMonthOfInterval({ start: subMonths(now, 12), end: now });
      groupByFormat = 'MMM';
    }

    const countByDate = (items: any[], dateField: string, dateStr: string, refDate: Date) => {
      return items.filter(item => {
        if (!item[dateField]) return false;
        const itemDate = new Date(item[dateField]);
        if (timeRange === 'today') {
          return format(itemDate, 'HH:00') === dateStr && itemDate >= subHours(now, 24);
        } else if (timeRange === 'year') {
          return format(itemDate, 'MMM') === dateStr && format(itemDate, 'yyyy') === format(refDate, 'yyyy');
        }
        return format(itemDate, groupByFormat) === dateStr;
      }).length;
    };

    return dateRange.map(date => {
      const dateStr = format(date, groupByFormat);
      return {
        date: dateStr,
        users: countByDate(data.users, 'created_at', dateStr, date),
        posts: countByDate(data.posts, 'created_at', dateStr, date),
        messages: countByDate(data.messages, 'sent_at', dateStr, date),
        gifts: countByDate(data.giftTransactions, 'created_at', dateStr, date),
        follows: countByDate(data.follows, 'created_at', dateStr, date),
      };
    });
  }, [data, timeRange]);

  // Engagement distribution pie chart
  const engagementPieData = useMemo(() => [
    { name: 'Posts', value: data.posts.length, color: 'hsl(183, 100%, 40%)' },
    { name: 'Messages', value: data.messages.length, color: 'hsl(280, 70%, 50%)' },
    { name: 'Gifts', value: data.giftTransactions.length, color: 'hsl(45, 100%, 50%)' },
    { name: 'Follows', value: data.follows.length, color: 'hsl(120, 70%, 40%)' },
    { name: 'Views', value: data.postViews.length, color: 'hsl(220, 70%, 50%)' },
  ], [data]);

  return (
    <div className="space-y-6">
      {/* Platform Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Platform Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="users" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="New Users" />
                <Area type="monotone" dataKey="posts" stackId="2" stroke="hsl(183, 100%, 40%)" fill="hsl(183, 100%, 40%)" fillOpacity={0.6} name="Posts" />
                <Area type="monotone" dataKey="messages" stackId="3" stroke="hsl(280, 70%, 50%)" fill="hsl(280, 70%, 50%)" fillOpacity={0.6} name="Messages" />
                <Area type="monotone" dataKey="gifts" stackId="4" stroke="hsl(45, 100%, 50%)" fill="hsl(45, 100%, 50%)" fillOpacity={0.6} name="Gifts" />
                <Area type="monotone" dataKey="follows" stackId="5" stroke="hsl(120, 70%, 40%)" fill="hsl(120, 70%, 40%)" fillOpacity={0.6} name="Follows" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Distribution Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Engagement Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {engagementPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Feature Usage Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Feature Usage Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Messages', count: data.messages.length, icon: <MessageSquare className="h-4 w-4" /> },
                { name: 'Post Views', count: data.postViews.length, icon: <Eye className="h-4 w-4" /> },
                { name: 'Follows', count: data.follows.length, icon: <UserPlus className="h-4 w-4" /> },
                { name: 'Posts', count: data.posts.length, icon: <FileText className="h-4 w-4" /> },
                { name: 'Gifts', count: data.giftTransactions.length, icon: <Gift className="h-4 w-4" /> },
                { name: 'ACoin Txns', count: data.acoinTransactions.length, icon: <Coins className="h-4 w-4" /> },
              ].sort((a, b) => b.count - a.count).map((item, i) => {
                const maxCount = Math.max(...[data.messages.length, data.postViews.length, data.follows.length, data.posts.length, data.giftTransactions.length, data.acoinTransactions.length]);
                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm font-bold">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Feature Charts */}
      <h3 className="text-xl font-bold mt-8 mb-4">Individual Feature Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureChart
          title="New Users"
          icon={<Users className="h-4 w-4 text-primary" />}
          data={data.users}
          dateField="created_at"
          color="hsl(var(--primary))"
          chartType="area"
        />
        <FeatureChart
          title="Posts Created"
          icon={<FileText className="h-4 w-4 text-cyan-500" />}
          data={data.posts}
          dateField="created_at"
          color="hsl(183, 100%, 40%)"
          chartType="bar"
        />
        <FeatureChart
          title="Messages Sent"
          icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
          data={data.messages}
          dateField="sent_at"
          color="hsl(280, 70%, 50%)"
          chartType="line"
        />
        <FeatureChart
          title="Post Views"
          icon={<Eye className="h-4 w-4 text-blue-500" />}
          data={data.postViews}
          dateField="viewed_at"
          color="hsl(220, 70%, 50%)"
          chartType="area"
        />
        <FeatureChart
          title="New Follows"
          icon={<UserPlus className="h-4 w-4 text-green-500" />}
          data={data.follows}
          dateField="created_at"
          color="hsl(120, 70%, 40%)"
          chartType="bar"
        />
        <FeatureChart
          title="Gifts Sent"
          icon={<Gift className="h-4 w-4 text-yellow-500" />}
          data={data.giftTransactions}
          dateField="created_at"
          color="hsl(45, 100%, 50%)"
          chartType="bar"
        />
        <FeatureChart
          title="ACoin Transactions"
          icon={<Coins className="h-4 w-4 text-amber-500" />}
          data={data.acoinTransactions}
          dateField="created_at"
          color="hsl(35, 100%, 50%)"
          chartType="line"
        />
        {data.stories && (
          <FeatureChart
            title="Stories Created"
            icon={<Image className="h-4 w-4 text-pink-500" />}
            data={data.stories}
            dateField="created_at"
            color="hsl(330, 70%, 50%)"
            chartType="bar"
          />
        )}
        {data.tips && (
          <FeatureChart
            title="Tips Sent"
            icon={<Send className="h-4 w-4 text-emerald-500" />}
            data={data.tips}
            dateField="created_at"
            color="hsl(160, 70%, 40%)"
            chartType="bar"
          />
        )}
        {data.redEnvelopes && (
          <FeatureChart
            title="Red Envelopes"
            icon={<Wallet className="h-4 w-4 text-red-500" />}
            data={data.redEnvelopes}
            dateField="created_at"
            color="hsl(0, 70%, 50%)"
            chartType="bar"
          />
        )}
        {data.referrals && (
          <FeatureChart
            title="Referrals"
            icon={<RefreshCw className="h-4 w-4 text-indigo-500" />}
            data={data.referrals}
            dateField="created_at"
            color="hsl(240, 70%, 50%)"
            chartType="area"
          />
        )}
        {data.gameScores && (
          <FeatureChart
            title="Game Sessions"
            icon={<Gamepad2 className="h-4 w-4 text-violet-500" />}
            data={data.gameScores}
            dateField="created_at"
            color="hsl(270, 70%, 50%)"
            chartType="bar"
          />
        )}
        {data.likes && (
          <FeatureChart
            title="Post Likes"
            icon={<Heart className="h-4 w-4 text-red-500" />}
            data={data.likes}
            dateField="created_at"
            color="hsl(350, 70%, 50%)"
            chartType="area"
          />
        )}
        {data.replies && (
          <FeatureChart
            title="Post Replies"
            icon={<MessageSquare className="h-4 w-4 text-teal-500" />}
            data={data.replies}
            dateField="created_at"
            color="hsl(180, 70%, 40%)"
            chartType="bar"
          />
        )}
        {data.subscriptions && (
          <FeatureChart
            title="Premium Subscriptions"
            icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
            data={data.subscriptions}
            dateField="started_at"
            color="hsl(40, 100%, 50%)"
            chartType="area"
          />
        )}
        {data.userReports && (
          <FeatureChart
            title="User Reports"
            icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
            data={data.userReports}
            dateField="created_at"
            color="hsl(25, 100%, 50%)"
            chartType="bar"
          />
        )}
        {data.messageReports && (
          <FeatureChart
            title="Message Reports"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            data={data.messageReports}
            dateField="created_at"
            color="hsl(0, 100%, 45%)"
            chartType="bar"
          />
        )}
      </div>
    </div>
  );
}
