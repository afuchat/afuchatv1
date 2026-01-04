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

  const PodiumSection = ({ users, isGift = false }: { users: any[]; isGift?: boolean }) => {
    if (!users || users.length < 3) return null;

    const first = users[0];
    const second = users[1];
    const third = users[2];

    const getValue = (user: any) => isGift ? user.total_xp : user.xp;

    return (
      <div className="relative bg-gradient-to-b from-emerald-900/90 to-emerald-950/95 rounded-t-3xl pt-8 pb-6 px-4 mb-4">
        {/* Podium positions */}
        <div className="flex items-end justify-center gap-3">
          {/* 2nd Place - Left */}
          <div className="flex flex-col items-center">
            <Avatar className="h-16 w-16 ring-2 ring-white/30 mb-2">
              <AvatarImage src={second?.avatar_url} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {second?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-sm font-medium truncate max-w-[100px] text-center">
              {second?.display_name || 'User'}
            </p>
            <div className="bg-emerald-800/80 rounded-lg px-4 py-2 mt-2 min-w-[100px] text-center">
              <p className="text-white/80 text-xs">2nd</p>
              <p className="text-white font-bold text-sm">
                {isGift ? '' : ''}{formatValue(getValue(second))} {isGift ? 'Nexa' : 'Nexa'}
              </p>
            </div>
          </div>

          {/* 1st Place - Center (Elevated) */}
          <div className="flex flex-col items-center -mt-6">
            <Avatar className="h-20 w-20 ring-4 ring-yellow-400/50 mb-2">
              <AvatarImage src={first?.avatar_url} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {first?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-sm font-medium truncate max-w-[100px] text-center">
              {first?.display_name || 'User'}
            </p>
            <div className="bg-emerald-700/90 rounded-lg px-4 py-2 mt-2 min-w-[100px] text-center">
              <p className="text-white/80 text-xs">1st</p>
              <p className="text-white font-bold text-sm">
                {formatValue(getValue(first))} Nexa
              </p>
            </div>
          </div>

          {/* 3rd Place - Right */}
          <div className="flex flex-col items-center">
            <Avatar className="h-16 w-16 ring-2 ring-white/30 mb-2">
              <AvatarImage src={third?.avatar_url} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {third?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-sm font-medium truncate max-w-[100px] text-center">
              {third?.display_name || 'User'}
            </p>
            <div className="bg-emerald-800/80 rounded-lg px-4 py-2 mt-2 min-w-[100px] text-center">
              <p className="text-white/80 text-xs">3rd</p>
              <p className="text-white font-bold text-sm">
                {formatValue(getValue(third))} Nexa
              </p>
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
      <div className="bg-card rounded-2xl shadow-lg mx-2 -mt-2 relative z-10">
        <div className="divide-y divide-border">
          {users.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              onClick={() => navigate(`/${user.handle}`)}
            >
              {/* Rank */}
              <span className="text-muted-foreground font-medium w-8 text-sm">
                {getRankLabel(index)}
              </span>

              {/* Avatar */}
              <Avatar className="h-12 w-12 ring-2 ring-border">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {user.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Name & Subtitle */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
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
                  isGift ? "text-pink-500" : "text-primary"
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
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-transparent">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-4 mb-4" style={{ width: 'calc(100% - 32px)' }}>
            <TabsTrigger value="xp" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Nexa Leaders
            </TabsTrigger>
            <TabsTrigger value="gifts" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Gift Leaders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xp" className="mt-0">
            {xpLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <PodiumSection users={xpLeaderboard || []} isGift={false} />
                <LeaderboardList users={xpLeaderboard || []} isGift={false} />
              </>
            )}
          </TabsContent>

          <TabsContent value="gifts" className="mt-0">
            {giftLoading ? (
              <div className="text-center py-8">Loading...</div>
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
