import { ReactNode, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountMode } from '@/contexts/AccountModeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Home, MessageSquare, Search, Bell, User, Settings, Shield, BarChart3, Wallet, Send, Gift, Image as ImageIcon, TrendingUp, MessageCircle, ShoppingBag } from 'lucide-react';
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
import { useIsTelegram } from '@/hooks/useIsTelegram';
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

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Push notifications listener
  usePushNotifications();

  const userCacheKey = user?.id ? `layout_user_data_${user.id}` : null;

  const checkAdminStatus = async () => {
    if (!user) return;

    if (userCacheKey) {
      const cached = sessionStorage.getItem(userCacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 60000) {
            setIsAdmin(data.isAdmin);
            setIsBusinessMode(data.isBusinessMode);
            setIsAffiliate(data.isAffiliate);
            return;
          }
        } catch {}
      }
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const adminStatus = !!roleData;
    setIsAdmin(adminStatus);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_business_mode, is_affiliate')
      .eq('id', user.id)
      .single();

    const businessMode = profileData?.is_business_mode || false;
    const affiliateStatus = profileData?.is_affiliate || false;

    setIsBusinessMode(businessMode);
    setIsAffiliate(affiliateStatus);

    if (userCacheKey) {
      sessionStorage.setItem(userCacheKey, JSON.stringify({
        isAdmin: adminStatus,
        isBusinessMode: businessMode,
        isAffiliate: affiliateStatus,
        timestamp: Date.now()
      }));
    }
  };

  useEffect(() => {
    if (user) {
      checkAdminStatus();

      const fetchUnreadCount = async () => {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        if (count !== null) setUnreadNotifications(count);
      };
      fetchUnreadCount();

      const fetchUnreadChatsCount = async () => {
        const { data: memberChats } = await supabase
          .from('chat_members')
          .select('chat_id')
          .eq('user_id', user.id);

        if (!memberChats || memberChats.length === 0) {
          setUnreadChats(0);
          return;
        }

        const chatIds = memberChats.map(c => c.chat_id);

        const { data: messagesWithStatus } = await supabase
          .from('messages')
          .select(`
            chat_id,
            id,
            message_status!left(read_at, user_id)
          `)
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
      };
      fetchUnreadChatsCount();

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

  const isTelegram = useIsTelegram();

  // --- Scroll to hide nav effect (works in Telegram) ---
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

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

  const isDesktop = !isMobile;

  const navItems = [
    { path: '/', icon: Home, label: t('common.home') },
    { path: '/search', icon: Search, label: t('search.title') },
    { path: '/notifications', icon: Bell, label: t('common.notifications'), badge: true },
    { path: '/chats', icon: MessageSquare, label: t('common.messages') },
  ];

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

  const isChatRoom = location.pathname.startsWith('/chat/');
  const shouldHideNav = isChatRoom || hideNav;
  const shouldHideUI = hideNav;
  const onMainTab = isMainTabRoute(location.pathname);

  if (isDesktop) {
    return <DesktopHybridLayout>{children}</DesktopHybridLayout>;
  }

  if (onMainTab && !shouldHideNav) {
    return (
      <div className={cn(
        "overflow-hidden bg-background select-none touch-pan-y",
        isTelegram ? "h-full" : "h-[100dvh]"
      )}>
        <MainTabsNavigation chatScrollHide={chatScrollHide}>
          {children}
        </MainTabsNavigation>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-background select-none touch-pan-y",
        isTelegram ? "h-full overflow-y-auto" : "min-h-screen",
        isDesktop && "desktop-scrollbar"
      )}
      style={isTelegram ? { WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } : undefined}
    >
      <main className={cn(
        shouldHideUI ? "" : "pb-20",
        !isTelegram && "min-h-screen"
      )}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      {!shouldHideNav && (
        <div
          className={cn(
            "lg:hidden fixed left-0 right-0 z-50 transition-all duration-300 ease-out",
            (isNavHidden || chatScrollHide) ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
          )}
          style={{ bottom: 'var(--tg-safe-bottom, 0px)' }}
        >
          <nav className={cn("bg-background", !isTelegram && "border-t border-border/40")}>
            <div className="flex justify-between items-center h-16 px-6 max-w-lg mx-auto">
              {/* Bottom nav buttons remain unchanged */}
              {/* ... your Link buttons code here ... */}
            </div>
          </nav>
        </div>
      )}

      {!shouldHideNav && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-background z-40"
          style={{ height: 'var(--tg-safe-bottom, env(safe-area-inset-bottom, 0px))' }}
        />
      )}
    </div>
  );
};

export default Layout;
