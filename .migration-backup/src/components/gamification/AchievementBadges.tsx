import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Flame, Users, UserCheck, Sparkles, Target, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Achievement {
  id: string;
  achievement_type: string;
  earned_at: string;
  metadata: any;
}

interface AchievementProgress {
  current: number;
  required: number;
  percentage: number;
}

interface AchievementDefinition {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  requirement: string;
  getProgress?: (userData: UserData) => AchievementProgress;
}

interface UserData {
  profile_completion_rewarded: boolean;
  login_streak: number;
  referral_count: number;
  post_count: number;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
}

const ACHIEVEMENT_CONFIG: Record<string, AchievementDefinition> = {
  'profile_completed': {
    icon: <UserCheck className="h-5 w-5" />,
    label: 'Profile Master',
    description: 'Complete your profile with name, handle, and bio',
    requirement: 'Complete all profile fields',
    color: 'bg-blue-500',
    getProgress: (userData) => {
      const fields = [userData.display_name, userData.handle, userData.bio];
      const completed = fields.filter(f => f && f.trim().length > 0).length;
      return {
        current: completed,
        required: 3,
        percentage: (completed / 3) * 100,
      };
    },
  },
  '7_day_streak': {
    icon: <Flame className="h-5 w-5" />,
    label: '7-Day Streak',
    description: 'Log in for 7 consecutive days',
    requirement: '7 day login streak',
    color: 'bg-orange-500',
    getProgress: (userData) => ({
      current: Math.min(userData.login_streak, 7),
      required: 7,
      percentage: (Math.min(userData.login_streak, 7) / 7) * 100,
    }),
  },
  '30_day_streak': {
    icon: <Flame className="h-5 w-5" />,
    label: '30-Day Legend',
    description: 'Log in for 30 consecutive days',
    requirement: '30 day login streak',
    color: 'bg-red-500',
    getProgress: (userData) => ({
      current: Math.min(userData.login_streak, 30),
      required: 30,
      percentage: (Math.min(userData.login_streak, 30) / 30) * 100,
    }),
  },
  '5_referrals': {
    icon: <Users className="h-5 w-5" />,
    label: 'Social Butterfly',
    description: 'Invite 5 friends to join',
    requirement: 'Invite 5 friends',
    color: 'bg-purple-500',
    getProgress: (userData) => ({
      current: Math.min(userData.referral_count, 5),
      required: 5,
      percentage: (Math.min(userData.referral_count, 5) / 5) * 100,
    }),
  },
  'first_post': {
    icon: <Sparkles className="h-5 w-5" />,
    label: 'First Steps',
    description: 'Create your first post',
    requirement: 'Create 1 post',
    color: 'bg-green-500',
    getProgress: (userData) => ({
      current: Math.min(userData.post_count, 1),
      required: 1,
      percentage: userData.post_count > 0 ? 100 : 0,
    }),
  },
};

interface AchievementBadgesProps {
  userId: string;
}

export const AchievementBadges = ({ userId }: AchievementBadgesProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch earned achievements
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false });

        if (achievementsError) throw achievementsError;

        // Fetch user data for progress tracking
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('profile_completion_rewarded, login_streak, display_name, handle, bio')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        // Fetch referral count
        const { count: referralCount } = await supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId)
          .eq('rewarded', true);

        // Fetch post count
        const { count: postCount } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', userId);

        setAchievements(achievementsData || []);
        setUserData({
          ...profileData,
          referral_count: referralCount || 0,
          post_count: postCount || 0,
        });
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const earnedAchievementTypes = new Set(
    achievements.map((a) => a.achievement_type)
  );

  // Get all achievement types in order
  const allAchievementTypes = Object.keys(ACHIEVEMENT_CONFIG);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">
              {achievements.length} / {allAchievementTypes.length}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Achievements Unlocked
            </p>
          </div>
          <Trophy className="h-12 w-12 text-primary" />
        </div>
      </Card>

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allAchievementTypes.map((achievementType) => {
          const config = ACHIEVEMENT_CONFIG[achievementType];
          const isEarned = earnedAchievementTypes.has(achievementType);
          const earnedData = achievements.find(
            (a) => a.achievement_type === achievementType
          );
          
          const progress = userData && config.getProgress 
            ? config.getProgress(userData)
            : { current: 0, required: 1, percentage: 0 };

          return (
            <Card
              key={achievementType}
              className={`p-4 transition-all ${
                isEarned
                  ? 'bg-card hover:shadow-lg border-primary/20'
                  : 'bg-muted/30 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`${
                    isEarned ? config.color : 'bg-muted'
                  } p-3 rounded-full text-white flex-shrink-0 relative`}
                >
                  {isEarned ? (
                    config.icon
                  ) : (
                    <>
                      <Lock className="h-5 w-5 absolute inset-0 m-auto" />
                      <div className="opacity-30">{config.icon}</div>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    {config.label}
                    {isEarned && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary"
                      >
                        Earned
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config.description}
                  </p>

                  {/* Progress for locked achievements */}
                  {!isEarned && progress && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          {progress.current} / {progress.required}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(progress.percentage)}%
                        </span>
                      </div>
                      <Progress value={progress.percentage} className="h-2" />
                    </div>
                  )}

                  {/* Earned date for unlocked achievements */}
                  {isEarned && earnedData && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {new Date(earnedData.earned_at).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Encouragement message */}
      {achievements.length === 0 && (
        <Card className="p-6 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Start your journey! Complete achievements to unlock badges.
          </p>
        </Card>
      )}
    </div>
  );
};
