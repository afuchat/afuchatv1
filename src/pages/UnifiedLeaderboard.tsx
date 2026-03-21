import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, Gift, Trophy, Medal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const UnifiedLeaderboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'xp' | 'gifts'>('xp');

  // Fetch XP Leaderboard
  const { data: xpLeaderboard = [], isLoading: xpLoading } = useQuery({
    queryKey: ['xp-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, xp, current_grade')
        .order('xp', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch Gift Leaderboard (aggregated)
  const { data: giftLeaderboard = [], isLoading: giftLoading } = useQuery({
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

      const giftCounts = data.reduce((acc: any, tx: any) => {
        const rid = tx.receiver_id;
        if (!acc[rid]) {
          acc[rid] = {
            ...tx.profiles,
            total_xp: 0,
            gift_count: 0,
          };
        }
        acc[rid].total_xp += tx.xp_cost;
        acc[rid].gift_count += 1;
        return acc;
      }, {});

      return Object.values(giftCounts)
        .sort((a: any, b: any) => b.total_xp - a.total_xp)
        .slice(0, 100);
    },
  });

  const leaderboard = activeTab === 'xp' ? xpLeaderboard : giftLeaderboard;
  const isLoading = activeTab === 'xp' ? xpLoading : giftLoading;
  const isGiftTab = activeTab === 'gifts';

  const formatValue = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getRankLabel = (index: number) => {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `${index + 1}th`;
  };

  const getSubtitle = (user: any) =>
    isGiftTab ? `${user.gift_count} gifts received` : (user.current_grade || 'Rookie');

  const getValue = (user: any) => (isGiftTab ? user.total_xp : user.xp);

  // Flat Top 3 Cards
  const TopThree = () => {
    if (!leaderboard.length) return null;
    const top3 = leaderboard.slice(0, 3);

    return (
      <div className="grid grid-cols-3 gap-4 px-4 pb-8">
        {top3.map((user, idx) => {
          const rank = idx + 1;
          const isFirst = rank === 1;
          return (
            <div
              key={user.id}
              onClick={() => navigate(`/@${user.handle}`)}
              className={cn(
                "group relative bg-card rounded-3xl p-6 flex flex-col items-center text-center border transition-all hover:shadow-xl cursor-pointer",
                isFirst && "border-emerald-400/60 shadow-emerald-400/10"
              )}
            >
              {/* Rank Badge */}
              <div
                className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-md",
                  rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
                  rank === 2 && "bg-gradient-to-br from-gray-400 to-zinc-500 text-white",
                  rank === 3 && "bg-gradient-to-br from-amber-600 to-orange-700 text-white"
                )}
              >
                {rank === 1 ? <Trophy className="h-4 w-4" /> : rank}
              </div>

              <Avatar className="h-20 w-20 ring-4 ring-background shadow-md mt-6">
                <AvatarImage src={user.avatar_url} className="object-cover" />
                <AvatarFallback className="text-xl font-semibold bg-muted">
                  {user.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="mt-6 space-y-1">
                <p className="font-semibold text-lg tracking-tight text-foreground line-clamp-1">
                  {user.display_name}
                </p>
                <p className="text-xs text-muted-foreground">{getSubtitle(user)}</p>
              </div>

              <div className="mt-auto pt-6">
                <p className={cn(
                  "text-3xl font-bold tracking-tighter",
                  isGiftTab ? "text-pink-500" : "text-emerald-600"
                )}>
                  {formatValue(getValue(user))}
                </p>
                <p className="text-[10px] text-muted-foreground tracking-widest font-medium">NEXA</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Clean Flat List
  const LeaderboardList = () => (
    <div className="mx-4 bg-card rounded-3xl overflow-hidden border shadow-sm">
      <div className="divide-y divide-border/60">
        {leaderboard.slice(3).map((user, idx) => {
          const rank = idx + 4;
          return (
            <div
              key={user.id}
              onClick={() => navigate(`/@${user.handle}`)}
              className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="w-8 text-right">
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {rank}
                </span>
              </div>

              <Avatar className="h-11 w-11 ring-1 ring-border/60">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.display_name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{user.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{getSubtitle(user)}</p>
              </div>

              <div className="text-right">
                <p className={cn(
                  "font-semibold text-lg tabular-nums",
                  isGiftTab ? "text-pink-500" : "text-emerald-600"
                )}>
                  {formatValue(getValue(user))}
                </p>
                <p className="text-[10px] text-muted-foreground">NEXA</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Clean Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md">
        <div className="container max-w-4xl mx-auto px-4 flex h-16 items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-emerald-600" />
            <h1 className="font-bold text-2xl tracking-tighter">Leaderboard</h1>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-4 pt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'xp' | 'gifts')}>
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/60 rounded-2xl p-1">
            <TabsTrigger
              value="xp"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Nexa Leaders
            </TabsTrigger>
            <TabsTrigger
              value="gifts"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <Gift className="h-4 w-4" />
              Gift Givers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xp" className="mt-8">
            {xpLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leaders...</div>
            ) : (
              <>
                <TopThree />
                <div className="px-4 mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Medal className="h-3 w-3" />
                  FULL RANKINGS
                </div>
                <LeaderboardList />
              </>
            )}
          </TabsContent>

          <TabsContent value="gifts" className="mt-8">
            {giftLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leaders...</div>
            ) : (
              <>
                <TopThree />
                <div className="px-4 mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Medal className="h-3 w-3" />
                  FULL RANKINGS
                </div>
                <LeaderboardList />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UnifiedLeaderboard;
