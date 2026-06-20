import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface ProfileViewer {
  id: string;
  viewer_id: string;
  viewed_at: string;
  viewer: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_organization_verified: boolean;
  };
}

interface ProfileViewsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileViewsSheet = ({ isOpen, onClose }: ProfileViewsSheetProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoadingMap, setFollowLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && user) {
      fetchViewers();
    }
  }, [isOpen, user]);

  const fetchViewers = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch profile views from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data, error } = await supabase
      .from('profile_views')
      .select(`
        id,
        viewer_id,
        viewed_at,
        viewer:profiles!profile_views_viewer_id_fkey (
          id,
          display_name,
          handle,
          avatar_url,
          is_verified,
          is_organization_verified
        )
      `)
      .eq('profile_id', user.id)
      .gte('viewed_at', thirtyDaysAgo.toISOString())
      .order('viewed_at', { ascending: false });

    if (error) {
      console.error('Error fetching profile views:', error);
    } else if (data) {
      setViewers(data as unknown as ProfileViewer[]);
      
      // Check follow status for each viewer
      const viewerIds = data.map(v => v.viewer_id);
      if (viewerIds.length > 0) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', viewerIds);
        
        const followMap: Record<string, boolean> = {};
        follows?.forEach(f => {
          followMap[f.following_id] = true;
        });
        setFollowingMap(followMap);
      }
    }
    
    setLoading(false);
  };

  const handleFollow = async (viewerId: string) => {
    if (!user) return;
    
    setFollowLoadingMap(prev => ({ ...prev, [viewerId]: true }));
    
    if (followingMap[viewerId]) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', viewerId);
      
      setFollowingMap(prev => ({ ...prev, [viewerId]: false }));
    } else {
      // Follow
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: viewerId });
      
      setFollowingMap(prev => ({ ...prev, [viewerId]: true }));
    }
    
    setFollowLoadingMap(prev => ({ ...prev, [viewerId]: false }));
  };

  const handleViewProfile = (handle: string) => {
    onClose();
    navigate(`/@${handle}`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <SheetTitle>{t('profile.profileViews', 'Profile views')}</SheetTitle>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </SheetHeader>

        <div className="mt-4 overflow-y-auto h-[calc(100%-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <CustomLoader size="md" />
            </div>
          ) : viewers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t('profile.noProfileViews', 'No profile views yet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {viewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => handleViewProfile(viewer.viewer.handle)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={viewer.viewer.avatar_url || undefined} />
                      <AvatarFallback>
                        {viewer.viewer.display_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold truncate">
                          {viewer.viewer.display_name}
                        </span>
                        <VerifiedBadge 
                          isVerified={viewer.viewer.is_verified}
                          isOrgVerified={viewer.viewer.is_organization_verified}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={followingMap[viewer.viewer_id] ? "outline" : "default"}
                    onClick={() => handleFollow(viewer.viewer_id)}
                    disabled={followLoadingMap[viewer.viewer_id]}
                    className="min-w-[100px]"
                  >
                    {followingMap[viewer.viewer_id] 
                      ? t('profile.following', 'Following')
                      : t('profile.follow', 'Follow')
                    }
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-center text-sm text-muted-foreground mt-6 px-4">
            {t('profile.profileViewsInfo', 'People who turned on their viewer history setting and viewed your profile in the past 30 days will be shown here. They can also see that you viewed their profile. You can turn this off any time.')}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};