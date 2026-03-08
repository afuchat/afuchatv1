import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Search, Bell, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTelegram } from '@/hooks/useIsTelegram';

// Lazy load tab content
import { lazy, Suspense } from 'react';
import { CustomLoader } from '@/components/ui/CustomLoader';

const HomePage = lazy(() => import('@/pages/Home'));
const SearchPage = lazy(() => import('@/pages/Search'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const DesktopChats = lazy(() => import('@/pages/DesktopChats'));

interface MainTabsNavigationProps {
  children?: React.ReactNode;
  isScrollingDown?: boolean;
  chatScrollHide?: boolean;
}

type TabId = 'home' | 'search' | 'notifications' | 'chats';

const TABS: { id: TabId; path: string; icon: any; label: string; requiresAuth: boolean }[] = [
  { id: 'home', path: '/home', icon: Home, label: 'Home', requiresAuth: false },
  { id: 'search', path: '/search', icon: Search, label: 'Search', requiresAuth: false },
  { id: 'notifications', path: '/notifications', icon: Bell, label: 'Alerts', requiresAuth: true },
  { id: 'chats', path: '/chats', icon: MessageCircle, label: 'Chats', requiresAuth: true },
];

const getTabIndexFromPath = (pathname: string): number => {
  if (pathname === '/' || pathname === '/home' || pathname === '/feed') return 0;
  if (pathname === '/search') return 1;
  if (pathname === '/notifications') return 2;
  if (pathname === '/chats') return 3;
  return -1;
};

const isMainTabRoute = (pathname: string): boolean => {
  return getTabIndexFromPath(pathname) !== -1;
};

export const MainTabsNavigation = ({ children, chatScrollHide = false }: MainTabsNavigationProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const isTelegram = useIsTelegram();
  
  const currentTabIndex = getTabIndexFromPath(location.pathname);
  const isOnMainTab = currentTabIndex !== -1;
  
  const [activeTab, setActiveTab] = useState<number>(Math.max(0, currentTabIndex));
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync tab with route changes
  useEffect(() => {
    const newIndex = getTabIndexFromPath(location.pathname);
    if (newIndex !== -1 && newIndex !== activeTab) {
      setActiveTab(newIndex);
    }
  }, [location.pathname]);

  // Scroll-to-hide navigation (disabled in Telegram for always-visible nav)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isMobile || isTelegram) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const hiding = currentScrollY > lastScrollY.current && currentScrollY > 80;
      
      setIsNavHidden(hiding);
      
      // Broadcast nav-hide state so FAB and other components can sync
      window.dispatchEvent(new CustomEvent('nav-scroll-state', { detail: { hidden: hiding } }));
      
      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile, isTelegram]);

  // Fetch notification counts
  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      // Unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (notifCount !== null) setUnreadNotifications(notifCount);

      // Unread chats
      const { data: memberChats } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);
      
      if (memberChats && memberChats.length > 0) {
        const chatIds = memberChats.map(c => c.chat_id);
        const { data: messagesWithStatus } = await supabase
          .from('messages')
          .select(`chat_id, id, message_status!left(read_at, user_id)`)
          .in('chat_id', chatIds)
          .neq('sender_id', user.id);
        
        const unreadChatIds = new Set<string>();
        messagesWithStatus?.forEach(msg => {
          const userReadStatus = msg.message_status?.find((s: any) => s.user_id === user.id);
          if (!userReadStatus || !userReadStatus.read_at) {
            unreadChatIds.add(msg.chat_id);
          }
        });
        setUnreadChats(unreadChatIds.size);
      }
    };

    fetchCounts();

    // Real-time subscriptions
    const channel = supabase
      .channel('tab-nav-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_status' }, fetchCounts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleTabChange = useCallback((index: number) => {
    const tab = TABS[index];
    if (tab.requiresAuth && !user) {
      navigate('/auth/signin');
      return;
    }
    
    setActiveTab(index);
    navigate(tab.path, { replace: true });
  }, [user, navigate]);

  // If not on a main tab route, render children normally
  if (!isOnMainTab) {
    return <>{children}</>;
  }

  const renderTabContent = (index: number) => {
    switch (index) {
      case 0:
        return <HomePage />;
      case 1:
        return <SearchPage />;
      case 2:
        return user ? <Notifications /> : null;
      case 3:
        return user ? <DesktopChats /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden touch-pan-y">
      {/* Tab Content Area - Scrollable */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
          isDesktop && "desktop-scrollbar"
        )}
        style={{
          paddingBottom: 'calc(64px + var(--tg-safe-bottom, env(safe-area-inset-bottom, 0px)))',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <CustomLoader size="lg" />
            </div>
          }
        >
          {renderTabContent(activeTab)}
        </Suspense>
      </div>

      {/* Bottom Tab Bar */}
      <div
        className={cn(
          "fixed left-0 right-0 z-50 transition-all duration-300 ease-out",
          (isNavHidden || chatScrollHide) ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
        )}
        style={{
          bottom: 'var(--tg-safe-bottom, 0px)',
        }}
      >
        <nav className={cn("bg-background", !isTelegram && "border-t border-border/40")}>
          <div className="flex justify-between items-center h-16 px-6 max-w-lg mx-auto">
            {TABS.map((tab, index) => {
              const isActive = activeTab === index;
              const IconComponent = tab.icon;
              const showBadge = (tab.id === 'notifications' && unreadNotifications > 0) || 
                               (tab.id === 'chats' && unreadChats > 0);
              const badgeCount = tab.id === 'notifications' ? unreadNotifications : unreadChats;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(index)}
                  className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 group relative",
                    isActive && "nav-glass-active"
                  )}
                >
                  <div className="relative">
                    <IconComponent 
                      className={cn(
                        "h-6 w-6 transition-colors duration-200",
                        isActive 
                          ? "text-primary" 
                          : "text-muted-foreground group-hover:text-primary/80"
                      )} 
                      strokeWidth={isActive ? 2.5 : 2}
                      fill={isActive ? 'currentColor' : 'none'}
                    />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full shadow-lg">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
      {/* Bottom safe area background fill */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background z-40"
        style={{ height: 'var(--tg-safe-bottom, env(safe-area-inset-bottom, 0px))' }}
      />
    </div>
  );
};
