import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { GradeBadge, type Grade } from '@/components/gamification/GradeBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { Crown } from 'lucide-react';

interface ProfileCardWidgetProps {
  className?: string;
}

export const ProfileCardWidget = ({ className }: ProfileCardWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus(user?.id);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-widget', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  const { data: followStats } = useQuery({
    queryKey: ['follow-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { followers: 0, following: 0 };
      const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', user.id)
      ]);
      return {
        followers: followersRes.count || 0,
        following: followingRes.count || 0
      };
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className={cn('p-4 bg-card/50 backdrop-blur-sm border-border/50', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn('p-4 bg-card/50 backdrop-blur-sm border-border/50 cursor-pointer hover:bg-card/70 transition-colors', className)}
      onClick={() => navigate(`/profile/${profile?.handle}`)}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name} />
          <AvatarFallback>{profile?.display_name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate max-w-[100px]" title={profile?.display_name}>{(profile?.display_name?.length || 0) > 12 ? `${profile?.display_name?.slice(0, 10)}...` : profile?.display_name}</span>
            <VerifiedBadge 
              isVerified={profile?.is_verified} 
              isOrgVerified={profile?.is_organization_verified}
              size="sm" 
            />
            {isPremium && (
              <span className="inline-flex items-center gap-0.5 text-amber-500">
                <Crown className="h-3 w-3" />
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{profile?.handle}</p>
        </div>
        <GradeBadge grade={(profile?.current_grade as Grade) || 'Newcomer'} size="sm" />
      </div>
      
      <div className="flex items-center justify-around mt-4 pt-3 border-t border-border/50">
        <div className="text-center">
          <p className="text-sm font-semibold">{followStats?.followers.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">{followStats?.following.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">{(profile?.xp || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Nexa</p>
        </div>
      </div>
    </Card>
  );
};
