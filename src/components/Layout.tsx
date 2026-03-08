import { ReactNode, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountMode } from '@/contexts/AccountModeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Home, MessageSquare, Search, Bell, User, Settings, Shield, BarChart3, Grid3x3, Gamepad2, ShoppingBag, Wallet, Send, Gift, Image as ImageIcon, Hash, TrendingUp, Building2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import NotificationIcon from '@/components/nav/NotificationIcon';
import { AccountModeSwitcher } from '@/components/AccountModeSwitcher';
import { MainTabsNavigation } from '@/components/nav/MainTabsNavigation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DesktopHybridLayout } from '@/components/DesktopHybridLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';

// Check if current path is a main tab route
const MAIN_TAB_ROUTES = ['/', '/home', '/feed', '/search', '/shorts', '/notifications', '/chats'];
const isMainTabRoute = (pathname: string): boolean => {
  return MAIN_TAB_ROUTES.includes(pathname);
};

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

const Layout = ({ children, hideNav = false }: LayoutProps) => {
  const { user } = useAuth();
  const { mode, canUseBusiness } = useAccountMode();
  const { openSettings } = useSettings();
  
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollY = useRef(0);
  const [chatScrollHide, setChatScrollHide] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const { isDeveloper } = useDeveloperStatus();
  
  // Detect if running in iframe (embedded mini program)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  // NOTE: We no longer hide navigation just because we're in an iframe.
  // (Lovable preview + in-app webviews are iframes; hiding nav breaks the app.)
  
  // Initialize push notifications listener
  usePushNotifications();

  // Cache key for user data
  const userCacheKey = user?.id ? `layout_user_data_${user.id}` : null;

  // Define functions before useEffect hooks
  const checkAdminStatus = async () => {
    if (!user) return;
    
    // Check memory cache first
    if (userCacheKey) {
      const cached = sessionStorage.getItem(userCacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 60000) { // 1 minute cache
            setIsAdmin(data.isAdmin);
            setIsBusinessMode(data.isBusinessMode);
            setIsAffiliate(data.isAffiliate);
            return;
          }
        } catch {}
      }
    }
    
    // Check admin status from secure user_roles table, not profiles
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    const adminStatus = !!roleData;
    setIsAdmin(adminStatus);
    
    // Get business mode and affiliate status from profiles (non-sensitive)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_business_mode, is_affiliate')
      .eq('id', user.id)
      .single();

    const businessMode = profileData?.is_business_mode || false;
    const affiliateStatus = profileData?.is_affiliate || false;
    
    setIsBusinessMode(businessMode);
    setIsAffiliate(affiliateStatus);
    
    // Cache the results
    if (userCacheKey) {
      sessionStorage.setItem(userCacheKey, JSON.stringify({
        isAdmin: adminStatus,
        isBusinessMode: businessMode,
        isAffiliate: affiliateStatus,
        timestamp: Date.now()
      }));
    }
  };

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (user) {
      checkAdminStatus();
      
      // Fetch unread notifications count
      const fetchUnreadCount = async () => {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        if (count !== null) setUnreadNotifications(count);
      };
      fetchUnreadCount();

      // Fetch unread chats count
      const fetchUnreadChatsCount = async () => {
        // Get all chats user is a member of
        const { data: memberChats } = await supabase
          .from('chat_members')
          .select('chat_id')
          .eq('user_id', user.id);
        
        if (!memberChats || memberChats.length === 0) {
          setUnreadChats(0);
          return;
        }

        const chatIds = memberChats.map(c => c.chat_id);
        
        // Get messages with their read status from message_status table
        const { data: messagesWithStatus } = await supabase
          .from('messages')
          .select(`
            chat_id,
            id,
            message_status!left(read_at, user_id)
          `)
          .in('chat_id', chatIds)
          .neq('sender_id', user.id);
        
        // Count unique chats with unread messages (no read_at for current user)
        const unreadChatIds = new Set<string>();
        messagesWithStatus?.forEach(msg => {
          const userReadStatus = msg.message_status?.find((s: any) => s.user_id === user.id);
          if (!userReadStatus || !userReadStatus.read_at) {
            unreadChatIds.add(msg.chat_id);
          }
        });
        setUnreadChats(unreadChatIds.size);
      };
      fetchUnreadChatsCount();

      // Real-time subscription for notifications
      const notifChannel = supabase
        .channel('nav-notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchUnreadCount();
        })
        .subscribe();

      // Real-time subscription for messages (unread chats)
      const msgChannel = supabase
        .channel('nav-messages')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
        }, () => {
          fetchUnreadChatsCount();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'message_status',
        }, () => {
          fetchUnreadChatsCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(msgChannel);
      };
    }
  }, [user]);

  useEffect(() => {
    // Only run scroll handlers on mobile
    if (!isMobile) return;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setIsNavHidden(true);
      } else {
        setIsNavHidden(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    const handleChatScroll = (e: CustomEvent) => {
      setChatScrollHide(e.detail.hide);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('chat-scroll-state' as any, handleChatScroll as any);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('chat-scroll-state' as any, handleChatScroll as any);
    };
  }, [isMobile]);

  // Show desktop-friendly layout instead of blocking
  const isDesktop = !isMobile;

  const navItems = [
    { path: '/', icon: Home, label: t('common.home') },
    { path: '/search', icon: Search, label: t('search.title') },
    { path: '/notifications', icon: Bell, label: t('common.notifications'), badge: true },
    { path: '/chats', icon: MessageSquare, label: t('common.messages') },
  ];

  // Additional features section
  const featureItems = [
    { path: '/shop', icon: ShoppingBag, label: 'Shop' },
    { path: '/wallet', icon: Wallet, label: 'Wallet', requiresAuth: true },
    { path: '/transfer', icon: Send, label: 'Transfer', requiresAuth: true },
    { path: '/gifts', icon: Gift, label: 'Gifts' },
    { path: '/moments', icon: ImageIcon, label: 'Moments' },
  ];

  if (user) {
    navItems.push({ path: `/${user.id}`, icon: User, label: t('common.profile'), badge: false });
  }

  if (isAffiliate && !isDeveloper) {
    navItems.push({ path: '/affiliate-dashboard', icon: TrendingUp, label: 'Affiliate', badge: false });
  }

  if (isAdmin) {
    navItems.push({ path: '/admin', icon: Shield, label: t('admin.title'), badge: false });
  }

  if (isBusinessMode && mode === 'business') {
    navItems.push({ path: '/business/dashboard', icon: BarChart3, label: t('business.title'), badge: false });
  }

  navItems.push({ path: '/settings', icon: Settings, label: t('common.settings'), badge: false });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  // Hide bottom navigation in chat rooms or when hideNav is true.
  const isChatRoom = location.pathname.startsWith('/chat/');
  const shouldHideNav = isChatRoom || hideNav;
  const shouldHideUI = hideNav;
  
  // Use MainTabsNavigation for main tab routes (sliding tab behavior)
  const onMainTab = isMainTabRoute(location.pathname);
  
  // Desktop: use DesktopHybridLayout for all pages
  if (isDesktop) {
    return (
      <DesktopHybridLayout>
        {children}
      </DesktopHybridLayout>
    );
  }

  if (onMainTab && !shouldHideNav) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-background select-none touch-pan-y">
        <MainTabsNavigation chatScrollHide={chatScrollHide}>
          {children}
        </MainTabsNavigation>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-[100dvh] bg-background select-none touch-pan-y",
        isDesktop && "desktop-scrollbar"
      )}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      {/* Main Content */}
      <main className={cn(
        "min-h-[100dvh]",
        !shouldHideUI && "pb-20"
      )}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation - Solid bar with liquid glass on active tabs */}
      {!shouldHideNav && (
        <div className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          (isNavHidden || chatScrollHide) ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
        )}>
          <nav className="bg-background border-t border-border/50">
            <div className="flex justify-between items-center h-16 px-6 max-w-lg mx-auto">
              {/* Home */}
              <Link
                to="/home"
                onClick={(e) => {
                  if (location.pathname === '/home' || location.pathname === '/') {
                    e.preventDefault();
                    sessionStorage.removeItem('feedShuffleSeed');
                    window.dispatchEvent(new Event('refresh-feed-order'));
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 group",
                  (isActive('/') || isActive('/home')) && "nav-glass-active"
                )}
              >
                <Home 
                  className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    (isActive('/') || isActive('/home')) 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-primary/80"
                  )} 
                  strokeWidth={(isActive('/') || isActive('/home')) ? 2.5 : 2}
                  fill={(isActive('/') || isActive('/home')) ? 'currentColor' : 'none'}
                />
              </Link>
              
              {/* Search */}
              <Link
                to="/search"
                className={cn(
                  "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 group",
                  isActive('/search') && "nav-glass-active"
                )}
              >
                <Search 
                  className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    isActive('/search') 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-primary/80"
                  )} 
                  strokeWidth={isActive('/search') ? 2.5 : 2} 
                />
              </Link>
              
              
              {/* Notifications - Auth required */}
              {user ? (
                <Link
                  to="/notifications"
                  className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 relative group",
                    isActive('/notifications') && "nav-glass-active"
                  )}
                >
                  <div className="relative">
                    <Bell 
                      className={cn(
                        "h-6 w-6 transition-colors duration-200",
                        isActive('/notifications') 
                          ? "text-primary" 
                          : "text-muted-foreground group-hover:text-primary/80"
                      )} 
                      strokeWidth={isActive('/notifications') ? 2.5 : 2}
                      fill={isActive('/notifications') ? 'currentColor' : 'none'}
                    />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full shadow-lg">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <Link
                  to="/auth/signin"
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 group"
                >
                  <Bell className="h-6 w-6 text-muted-foreground group-hover:text-primary/80 transition-colors duration-200" strokeWidth={2} />
                </Link>
              )}
              
              {/* Chats - Auth required */}
              {user ? (
                <Link
                  to="/chats"
                  className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 relative group",
                    isActive('/chats') && "nav-glass-active"
                  )}
                >
                  <div className="relative">
                    <MessageCircle 
                      className={cn(
                        "h-6 w-6 transition-colors duration-200",
                        isActive('/chats') 
                          ? "text-primary" 
                          : "text-muted-foreground group-hover:text-primary/80"
                      )} 
                      strokeWidth={isActive('/chats') ? 2.5 : 2}
                      fill={isActive('/chats') ? 'currentColor' : 'none'}
                    />
                    {unreadChats > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full shadow-lg">
                        {unreadChats > 99 ? '99+' : unreadChats}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <Link
                  to="/auth/signin"
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 group"
                >
                  <MessageCircle className="h-6 w-6 text-muted-foreground group-hover:text-primary/80 transition-colors duration-200" strokeWidth={2} />
                </Link>
              )}
            </div>
          </nav>
          {/* Safe area padding for devices with home indicator */}
          <div className="bg-background h-[env(safe-area-inset-bottom)]" />
        </div>
      )}
    </div>
  );
};

export default Layout;
