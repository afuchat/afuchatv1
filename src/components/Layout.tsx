import { ReactNode, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountMode } from '@/contexts/AccountModeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Home, MessageSquare, Search, Bell, User, Settings, Shield, BarChart3, Gamepad2, ShoppingBag, Wallet, Send, Gift, Image as ImageIcon, TrendingUp, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { DesktopHybridLayout } from '@/components/DesktopHybridLayout';
import { MainTabsNavigation } from '@/components/nav/MainTabsNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Main tab routes
const MAIN_TAB_ROUTES = ['/', '/home', '/feed', '/search', '/shorts', '/notifications', '/chats'];
const isMainTabRoute = (pathname: string) => MAIN_TAB_ROUTES.includes(pathname);

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

const Layout = ({ children, hideNav = false }: LayoutProps) => {
  const { user } = useAuth();
  const { mode } = useAccountMode();
  const { t } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isDeveloper } = useDeveloperStatus();
  const isTelegram = useIsTelegram();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [chatScrollHide, setChatScrollHide] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const lastScrollY = useRef(0);

  usePushNotifications();

  const userCacheKey = user?.id ? `layout_user_data_${user.id}` : null;

  // Check admin/business/affiliate status
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

    setIsAdmin(!!roleData);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_business_mode, is_affiliate')
      .eq('id', user.id)
      .single();

    setIsBusinessMode(profileData?.is_business_mode || false);
    setIsAffiliate(profileData?.is_affiliate || false);

    if (userCacheKey) {
      sessionStorage.setItem(
        userCacheKey,
        JSON.stringify({
          isAdmin: !!roleData,
          isBusinessMode: profileData?.is_business_mode || false,
          isAffiliate: profileData?.is_affiliate || false,
          timestamp: Date.now(),
        })
      );
    }
  };

  useEffect(() => {
    if (!user) return;

    checkAdminStatus();

    const fetchUnreadNotifications = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (count !== null) setUnreadNotifications(count);
    };

    const fetchUnreadChats = async () => {
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
        const userRead = msg.message_status?.find((s: any) => s.user_id === user.id);
        if (!userRead || !userRead.read_at) unreadChatIds.add(msg.chat_id);
      });

      setUnreadChats(unreadChatIds.size);
    };

    fetchUnreadNotifications();
    fetchUnreadChats();

    const notifChannel = supabase
      .channel('nav-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        fetchUnreadNotifications
      )
      .subscribe();

    const msgChannel = supabase
      .channel('nav-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnreadChats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_status' }, fetchUnreadChats)
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user]);

  // Scroll hide logic for mobile & Telegram Web
  useEffect(() => {
    if (!isMobile) return;

    let scrollContainer: HTMLElement | Window = window;

    if (isTelegram) {
      // Telegram Web App uses inner scroll container
      const tgContainer = document.querySelector<HTMLDivElement>('#telegram-web-container');
      if (tgContainer) scrollContainer = tgContainer;
    }

    const handleScroll = () => {
      const currentScrollY =
        scrollContainer instanceof Window ? window.scrollY : scrollContainer.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setIsNavHidden(true);
      } else {
        setIsNavHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    const handleChatScroll = (e: CustomEvent) => setChatScrollHide(e.detail.hide);

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('chat-scroll-state' as any, handleChatScroll as any);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('chat-scroll-state' as any, handleChatScroll as any);
    };
  }, [isMobile, isTelegram]);

  const isDesktop = !isMobile;
  const onMainTab = isMainTabRoute(location.pathname);
  const isChatRoom = location.pathname.startsWith('/chat/');
  const shouldHideNav = isChatRoom || hideNav;
  const shouldHideUI = hideNav;

  // Desktop layout
  if (isDesktop) return <DesktopHybridLayout>{children}</DesktopHybridLayout>;

  if (onMainTab && !shouldHideNav) {
    return (
      <div className={cn('overflow-hidden bg-background select-none touch-pan-y', isTelegram ? 'h-full' : 'h-[100dvh]')}>
        <MainTabsNavigation chatScrollHide={chatScrollHide}>{children}</MainTabsNavigation>
      </div>
    );
  }

  return (
    <div
      className={cn('bg-background select-none touch-pan-y', isTelegram ? 'h-full overflow-y-auto' : 'min-h-screen', isDesktop && 'desktop-scrollbar')}
      style={isTelegram ? { WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } : undefined}
    >
      <main className={cn(shouldHideUI ? '' : 'pb-20', !isTelegram && 'min-h-screen')}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          {children}
        </motion.div>
      </main>

      {!shouldHideNav && (
        <div
          className={cn(
            'lg:hidden fixed left-0 right-0 z-50 transition-all duration-300 ease-out',
            (isNavHidden || chatScrollHide) ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
          )}
          style={{ bottom: 'var(--tg-safe-bottom, 0px)' }}
        >
          {/* Bottom nav component */}
          {/* Add your Links/icons here, same as before */}
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
