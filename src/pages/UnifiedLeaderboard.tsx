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

  // XP Leaderboard
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

  // Gift Leaderboard
  const { data: giftLeaderboard = [], isLoading: giftLoading } = useQuery({
    queryKey: ['gift-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_transactions')
        .select(`
          receiver_id,
          xp_cost,
          profiles:receiver_id (id, display_name, handle, avatar_url)
        `);
      if (error) throw error;

      const giftCounts = data.reduce((acc: any, tx: any) => {
        const rid = tx.receiver_id;
        if (!acc[rid]) acc[rid] = { ...tx.profiles, total_xp: 0, gift_count: 0 };
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

  const getSubtitle = (user: any) =>
    isGiftTab ? `${user.gift_count} gifts received` : (user.current_grade || 'Rookie');

  const getValue = (user: any) => (isGiftTab ? user.total_xp : user.xp);

  // === PREMIUM PODIUM (exactly like the image) ===
  const Podium = () => {
    if (leaderboard.length < 3) return null;

    const first = leaderboard[0];
    const second = leaderboard[1];
    const third = leaderboard[2];

    const trophyColor = (rank: number) =>
      rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-zinc-400' : 'text-amber-700';

    const valueColor = isGiftTab ? 'text-pink-500' : 'text-emerald-600';

    return (
      <div className="relative pt-10 pb-16 px-4">
        <div className="flex items-end justify-center gap-6">
          {/* 2nd Place */}
          <div className="flex flex-col items-center w-[118px]">
            <Trophy className={cn("h-12 w-12 mb-3", trophyColor(2))} />
            <div className="bg-white rounded-3xl shadow-xl border border-border p-6 text-center w-full">
              <Avatar className="h-20 w-20 mx-auto ring-4 ring-white -mt-1">
                <AvatarImage src={second.avatar_url} />
                <AvatarFallback>{second.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <p className="mt-5 font-semibold text-base line-clamp-1">{second.display_name}</p>
              <p className="text-xs text-muted-foreground mt-1">{getSubtitle(second)}</p>
              <p className={cn("mt-6 text-3xl font-bold tracking-tighter", valueColor)}>
                {formatValue(getValue(second))}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-widest">NEXA</p>
            </div>
          </div>

          {/* 1st Place — larger & elevated */}
          <div className="flex flex-col items-center -mt-14 w-[138px]">
            <Trophy className={cn("h-16 w-16 mb-4", trophyColor(1))} />
            <div className="bg-white rounded-3xl shadow-2xl border border-emerald-400 p-8 text-center w-full relative">
              <Avatar className="h-28 w-28 mx-auto ring-8 ring-white shadow-2xl">
                <AvatarImage src={first.avatar_url} />
                <AvatarFallback>{first.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <p className="mt-7 font-bold text-xl tracking-tight">{first.display_name}</p>
              <p className="text-xs text-muted-foreground">{getSubtitle(first)}</p>
              <p className={cn("mt-8 text-5xl font-bold tracking-[-1px]", valueColor)}>
                {formatValue(getValue(first))}
              </p>
              <p className="text-xs text-muted-foreground tracking-widest">NEXA</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center w-[118px]">
            <Trophy className={cn("h-12 w-12 mb-3", trophyColor(3))} />
            <div className="bg-white rounded-3xl shadow-xl border border-border p-6 text-center w-full">
              <Avatar className="h-20 w-20 mx-auto ring-4 ring-white -mt-1">
                <AvatarImage src={third.avatar_url} />
                <AvatarFallback>{third.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <p className="mt-5 font-semibold text-base line-clamp-1">{third.display_name}</p>
              <p className="text-xs text-muted-foreground mt-1">{getSubtitle(third)}</p>
              <p className={cn("mt-6 text-3xl font-bold tracking-tighter", valueColor)}>
                {formatValue(getValue(third))}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-widest">NEXA</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Clean full rankings list
  const LeaderboardList = () => (
    <div className="mx-4 bg-white rounded-3xl overflow-hidden border shadow-sm">
      <div className="divide-y divide-border/60">
        {leaderboard.slice(3).map((user, idx) => {
          const rank = idx + 4;
          return (
            <div
              key={user.id}
              onClick={() => navigate(`/@${user.handle}`)}
              className="flex items-center gap-4 px-6 py-5 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span className="w-8 text-right font-semibold text-muted-foreground tabular-nums text-sm">
                #{rank}
              </span>
              <Avatar className="h-12 w-12 ring-1 ring-border/60">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{getSubtitle(user)}</p>
              </div>
              <div className="text-right">
                <p className={cn("font-bold text-2xl tracking-tighter", isGiftTab ? "text-pink-500" : "text-emerald-600")}>
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md">
        <div className="container max-w-4xl mx-auto px-4 flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-emerald-600" />
            <h1 className="font-bold text-2xl tracking-tighter">Leaderboard</h1>
          </div>
          <div />
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-4 pt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'xp' | 'gifts')}>
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/70 rounded-2xl p-1">
            <TabsTrigger value="xp" className="rounded-xl data-[state=active]:bg-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Nexa Leaders
            </TabsTrigger>
            <TabsTrigger value="gifts" className="rounded-xl data-[state=active]:bg-white flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Gift Givers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xp" className="mt-8">
            {xpLoading ? (
              <div className="py-20 text-center text-muted-foreground">Loading leaders...</div>
            ) : (
              <>
                <Podium />
                <div className="px-4 mb-4 flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground">
                  <Medal className="h-4 w-4" />
                  FULL RANKINGS
                </div>
                <LeaderboardList />
              </>
            )}
          </TabsContent>

          <TabsContent value="gifts" className="mt-8">
            {giftLoading ? (
              <div className="py-20 text-center text-muted-foreground">Loading leaders...</div>
            ) : (
              <>
                <Podium />
                <div className="px-4 mb-4 flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground">
                  <Medal className="h-4 w-4" />
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
