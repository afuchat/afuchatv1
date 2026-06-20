import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Calendar, TrendingUp, Trophy, MessageSquare, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { SettingsSection, SettingsStatCard } from './SettingsUI';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityLogEntry {
  id: string;
  action_type: string;
  xp_earned: number;
  created_at: string;
  metadata: any;
}

export const ActivityLog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalXP: 0, todayXP: 0, weekXP: 0 });

  useEffect(() => { if (user) loadActivityLog(); }, [user]);

  const loadActivityLog = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log').select('*').eq('user_id', user!.id)
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setActivities((data || []) as any);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const totalXP = data?.reduce((s, a) => s + (a.xp_earned || 0), 0) || 0;
      const todayXP = data?.filter(a => new Date(a.created_at ?? '') >= todayStart).reduce((s, a) => s + (a.xp_earned || 0), 0) || 0;
      const weekXP = data?.filter(a => new Date(a.created_at ?? '') >= weekStart).reduce((s, a) => s + (a.xp_earned || 0), 0) || 0;
      setStats({ totalXP, todayXP, weekXP });
    } catch (error) { console.error('Error loading activity log:', error); }
    finally { setLoading(false); }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'daily_login': return Calendar;
      case 'tip_sent': case 'tip_received': return Gift;
      case 'post_created': return MessageSquare;
      case 'referral_reward': return Trophy;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'daily_login': return 'bg-blue-500';
      case 'tip_sent': return 'bg-red-500';
      case 'tip_received': return 'bg-green-500';
      case 'post_created': return 'bg-purple-500';
      case 'referral_reward': return 'bg-amber-500';
      default: return 'bg-muted';
    }
  };

  const getActivityLabel = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SettingsStatCard icon={TrendingUp} iconColor="bg-primary" label="Total Nexa" value={stats.totalXP} />
        <SettingsStatCard icon={Calendar} iconColor="bg-green-500" label="Today" value={stats.todayXP} />
        <SettingsStatCard icon={Activity} iconColor="bg-blue-500" label="This Week" value={stats.weekXP} />
      </div>

      {/* Activity Log */}
      <SettingsSection title="Recent Activity">
        <ScrollArea className="h-[420px]">
          <div className="p-2">
            {activities.length === 0 ? (
              <div className="text-center py-10">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              activities.map((activity, idx) => {
                const Icon = getActivityIcon(activity.action_type);
                const colorClass = getActivityColor(activity.action_type);
                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-center gap-3 px-2 py-3",
                      idx < activities.length - 1 && "border-b border-border/30"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{getActivityLabel(activity.action_type)}</p>
                        <Badge variant={activity.xp_earned > 0 ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5">
                          {activity.xp_earned > 0 ? '+' : ''}{activity.xp_earned}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(activity.created_at), 'MMM d • h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SettingsSection>
    </div>
  );
};
