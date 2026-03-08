import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const UnifiedLeaderboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('xp');

  // Fetch XP Leaderboard
  const { data: xpLeaderboard, isLoading: xpLoading } = useQuery({
    queryKey: ['xp-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, xp, current_grade')
        .order('xp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  // Fetch Gift Leaderboard
  const { data: giftLeaderboard, isLoading: giftLoading } = useQuery({
    queryKey: ['gift-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_transactions')
        .select(`
          receiver_id,
          xp_cost,
          profiles:receiver_id (
            id,
            display_name,
            handle,
            avatar_url
          )
        `);

      if (error) throw error;

      // Aggregate gifts by receiver
      const giftCounts = data.reduce((acc: any, transaction: any) => {
        const receiverId = transaction.receiver_id;
        if (!acc[receiverId]) {
          acc[receiverId] = {
            ...transaction.profiles,
            total_xp: 0,
            gift_count: 0
          };
        }
        acc[receiverId].total_xp += transaction.xp_cost;
        acc[receiverId].gift_count += 1;
        return acc;
      }, {});

      return Object.values(giftCounts).sort((a: any, b: any) => b.total_xp - a.total_xp).slice(0, 100);
    }
  });

  const formatValue = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)} B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} K`;
    }
    return value.toLocaleString();
  };

  const getRankLabel = (index: number) => {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `${index + 1}th`;
  };

  const PodiumUser = ({ 
    user, 
    rank, 
    isGift,
    size = 'normal'
  }: { 
    user: any; 
    rank: 1 | 2 | 3; 
    isGift: boolean;
    size?: 'large' | 'normal';
  }) => {
    const getValue = (user: any) => isGift ? user.total_xp : user.xp;
    const avatarSize = size === 'large' ? 'h-24 w-24' : 'h-20 w-20';
    const ringStyle = rank === 1 
      ? 'ring-4 ring-white shadow-lg shadow-white/20' 
      : 'ring-[3px] ring-white/80';
    
    return (
      <div className="flex flex-col items-center">
        <Avatar className={cn(avatarSize, ringStyle, "shadow-xl")}>
          <AvatarImage src={user?.avatar_url} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 text-lg font-semibold">
            {user?.display_name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <p className="text-white text-sm font-semibold mt-3 truncate max-w-[100px] text-center drop-shadow-md">
          {user?.display_name || 'User'}
        </p>
        <div className={cn(
          "rounded-xl px-5 py-2.5 mt-2 min-w-[110px] text-center backdrop-blur-sm",
          rank === 1 
            ? "bg-gradient-to-b from-emerald-600/90 to-emerald-700/90 shadow-lg" 
            : "bg-gradient-to-b from-emerald-700/80 to-emerald-800/80"
        )}>
          <p className="text-white/90 text-xs font-medium">
            {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
          </p>
          <p className="text-white font-bold text-sm mt-0.5">
            {formatValue(getValue(user))} Nexa
          </p>
        </div>
      </div>
    );
  };

  const PodiumSection = ({ users, isGift = false }: { users: any[]; isGift?: boolean }) => {
    if (!users || users.length < 3) return null;

    const first = users[0];
    const second = users[1];
    const third = users[2];

    return (
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative pt-6 pb-10 px-4">
          {/* Podium positions - 1st elevated in center */}
          <div className="flex items-end justify-center gap-2 sm:gap-4">
            {/* 2nd Place - Left, lower */}
            <div className="flex flex-col items-center pb-0">
              <PodiumUser user={second} rank={2} isGift={isGift} />
            </div>

            {/* 1st Place - Center, highest */}
            <div className="flex flex-col items-center -mt-8">
              <PodiumUser user={first} rank={1} isGift={isGift} size="large" />
            </div>

            {/* 3rd Place - Right, lower */}
            <div className="flex flex-col items-center pb-0">
              <PodiumUser user={third} rank={3} isGift={isGift} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LeaderboardList = ({ users, isGift = false }: { users: any[]; isGift?: boolean }) => {
    if (!users) return null;

    const getValue = (user: any) => isGift ? user.total_xp : user.xp;
    const getSubtitle = (user: any) => isGift ? `${user.gift_count} gifts received` : (user.current_grade || 'Rookie');

    return (
      <div className="bg-card rounded-t-3xl shadow-2xl -mt-4 relative z-10 border-t border-border/50">
        <div className="divide-y divide-border/50">
          {users.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/@${user.handle}`)}
            >
              {/* Rank */}
              <span className="text-muted-foreground font-semibold w-10 text-sm">
                {getRankLabel(index)}
              </span>

              {/* Avatar with subtle ring */}
              <Avatar className="h-14 w-14 ring-2 ring-border/60 shadow-md">
                <AvatarImage src={user.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-semibold">
                  {user.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Name & Subtitle */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-base">
                  {user.display_name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {getSubtitle(user)}
                </p>
              </div>

              {/* Value */}
              <div className="text-right">
                <p className={cn(
                  "font-bold text-base",
                  isGift ? "text-pink-500" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {formatValue(getValue(user))} Nexa
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - overlays the gradient */}
      <header className="sticky top-0 z-50 w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-transparent h-20 pointer-events-none" />
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto pb-24 -mt-14">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tabs positioned over the gradient */}
          <div className="relative z-20 px-4 pb-4">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm border border-white/20">
              <TabsTrigger 
                value="xp" 
                className="flex items-center gap-2 text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800"
              >
                <TrendingUp className="h-4 w-4" />
                Nexa Leaders
              </TabsTrigger>
              <TabsTrigger 
                value="gifts" 
                className="flex items-center gap-2 text-white data-[state=active]:bg-white data-[state=active]:text-emerald-800"
              >
                <Gift className="h-4 w-4" />
                Gift Leaders
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="xp" className="mt-0">
            {xpLoading ? (
              <div className="text-center py-8 text-white">Loading...</div>
            ) : (
              <>
                <PodiumSection users={xpLeaderboard || []} isGift={false} />
                <LeaderboardList users={xpLeaderboard || []} isGift={false} />
              </>
            )}
          </TabsContent>

          <TabsContent value="gifts" className="mt-0">
            {giftLoading ? (
              <div className="text-center py-8 text-white">Loading...</div>
            ) : (
              <>
                <PodiumSection users={giftLeaderboard as any[] || []} isGift={true} />
                <LeaderboardList users={giftLeaderboard as any[] || []} isGift={true} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UnifiedLeaderboard;
