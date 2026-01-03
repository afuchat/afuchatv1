import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDrawer } from '@/components/ProfileDrawer';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, rightContent, icon }: PageHeaderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ avatar_url: string | null; display_name: string } | null>(null);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      };
      fetchProfile();
    }
  }, [user]);

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user ? (
              <ProfileDrawer
                trigger={
                  <button className="flex-shrink-0">
                    <span className="text-xl font-bold text-foreground">AfuChat</span>
                  </button>
                }
              />
            ) : icon ? (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            ) : <span className="text-xl font-bold text-foreground">AfuChat</span>}
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
        </div>
      </div>
    </div>
  );
};
