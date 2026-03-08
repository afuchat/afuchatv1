import { useState, useEffect, useRef } from 'react';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, rightContent, icon }: PageHeaderProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isTelegram = useIsTelegram();
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

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

  useEffect(() => {
    if (!isMobile) return;

    const handleWindowScroll = () => {
      const currentScrollY = window.scrollY;
      setIsHidden(currentScrollY > lastScrollY.current && currentScrollY > 80);
      lastScrollY.current = currentScrollY;
    };

    const handleNavScroll = (e: CustomEvent) => {
      setIsHidden(e.detail.hidden);
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('nav-scroll-state' as any, handleNavScroll as any);
    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('nav-scroll-state' as any, handleNavScroll as any);
    };
  }, [isMobile]);

  return (
    <div className={cn(
      "sticky z-10 bg-background/95 backdrop-blur border-b border-border transition-all duration-300 ease-out",
      isMobile && isHidden ? "-top-16" : "top-0"
    )}>
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && user ? (
              <ProfileDrawer
                trigger={
                  <button className="flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                }
              />
            ) : !isMobile ? null : icon ? (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            ) : null}
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
