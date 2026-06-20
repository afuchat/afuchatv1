import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface MiniProgramHeaderProps {
  rightContent?: React.ReactNode;
}

export const MiniProgramHeader = ({ rightContent }: MiniProgramHeaderProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-header', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isMobile,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur">
      <div className="container max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {isMobile && (
            <ProfileDrawer
              trigger={
                <button className="flex-shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
          )}
          {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
        </div>
      </div>
    </div>
  );
};
