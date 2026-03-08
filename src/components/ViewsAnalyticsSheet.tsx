import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Eye, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { VerifiedBadge } from './VerifiedBadge';
import { BusinessBadge } from './BusinessBadge';

interface ViewerData {
  viewer_id: string;
  viewed_at: string;
  profiles: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_organization_verified: boolean;
    is_business_mode: boolean;
  };
}

interface ViewsAnalyticsSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  totalViews: number;
  isPostOwner: boolean;
}

export const ViewsAnalyticsSheet = ({ 
  postId, 
  isOpen, 
  onClose, 
  totalViews,
  isPostOwner 
}: ViewsAnalyticsSheetProps) => {
  const [viewers, setViewers] = useState<ViewerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewsByHour, setViewsByHour] = useState<{ hour: string; count: number }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && isPostOwner) {
      fetchViewers();
      fetchViewStats();
    }
  }, [isOpen, postId, isPostOwner]);

  const fetchViewers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_views')
        .select(`
          viewer_id,
          viewed_at,
          profiles:viewer_id (
            display_name,
            handle,
            avatar_url,
            is_verified,
            is_organization_verified,
            is_business_mode
          )
        `)
        .eq('post_id', postId)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setViewers(data as ViewerData[]);
    } catch (error) {
      console.error('Error fetching viewers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewStats = async () => {
    try {
      // Get views grouped by hour for the last 24 hours
      const { data, error } = await supabase
        .from('post_views')
        .select('viewed_at')
        .eq('post_id', postId)
        .gte('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Group by hour
      const hourMap = new Map<string, number>();
      data?.forEach(view => {
        const hour = new Date(view.viewed_at).getHours();
        const key = `${hour}:00`;
        hourMap.set(key, (hourMap.get(key) || 0) + 1);
      });

      const stats = Array.from(hourMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      setViewsByHour(stats);
    } catch (error) {
      console.error('Error fetching view stats:', error);
    }
  };

  const handleViewerClick = (viewerId: string) => {
    navigate(`/${viewerId}`);
    onClose();
  };

  if (!isPostOwner) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Views
            </SheetTitle>
          </SheetHeader>
          <div className="mt-8 text-center">
            <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">View Analytics</h3>
            <p className="text-muted-foreground">
              Detailed view analytics are only available to the post author.
            </p>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-foreground">{totalViews}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Views</div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[75vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6 overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Post Analytics
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-muted rounded-lg text-center">
              <Eye className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{totalViews}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Views</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{viewers.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Unique Viewers</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{viewsByHour.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Active Hours</div>
            </div>
          </div>

          {/* Views Timeline */}
          {viewsByHour.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Views Timeline (Last 24h)
              </h3>
              <div className="space-y-2">
                {viewsByHour.map(({ hour, count }) => (
                  <div key={hour} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">{hour}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${(count / Math.max(...viewsByHour.map(v => v.count))) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewers List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recent Viewers
            </h3>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No viewers yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {viewers.map((viewer) => (
                  <div
                    key={viewer.viewer_id}
                    onClick={() => handleViewerClick(viewer.viewer_id)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={viewer.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {viewer.profiles.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-sm truncate">
                          {viewer.profiles.display_name}
                        </p>
                        <VerifiedBadge 
                          isVerified={viewer.profiles.is_verified}
                          isOrgVerified={viewer.profiles.is_organization_verified}
                          size="sm"
                        />
                        {viewer.profiles.is_business_mode && (
                          <BusinessBadge size="sm" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{viewer.profiles.handle}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
