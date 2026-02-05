import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountMode } from '@/contexts/AccountModeContext';
import { 
  Home, MessageSquare, Search, Bell, User, Settings, Shield, 
  BarChart3, Grid3x3, ShoppingBag, Wallet, Send, Gift, 
  Image as ImageIcon, Hash, TrendingUp, Menu, Plus, DollarSign,
  ChevronLeft
} from 'lucide-react';
import aiChatIcon from '@/assets/ai-chat-icon.ico';
import Logo from '@/components/Logo';
import { AccountModeSwitcher } from '@/components/AccountModeSwitcher';
import NewPostModal from '@/components/ui/NewPostModal';
import { DesktopRightSidebar } from '@/components/desktop/DesktopRightSidebar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';

interface DesktopHybridLayoutProps {
  children: ReactNode;
}

export const DesktopHybridLayout = ({ children }: DesktopHybridLayoutProps) => {
  const { user } = useAuth();
  const { mode } = useAccountMode();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const { isDeveloper } = useDeveloperStatus();

  // Hide right sidebar on certain pages
  const hideRightSidebar = ['/chats', '/chat/', '/settings', '/admin', '/wallet', '/afuai'].some(
    path => location.pathname.startsWith(path)
  );

  useEffect(() => {
    if (user) {
      checkUserStatus();
      fetchNotificationCount();
      
      const channel = supabase
        .channel('desktop-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchNotificationCount()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotificationCount = async () => {
    if (!user) return;
    
    const { count, error } = await supabase
      .from('notifications' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error && count !== null) {
      setUnreadNotifications(count);
    }
  };

  const checkUserStatus = async () => {
    if (!user) return;
    
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

    if (profileData) {
      setIsBusinessMode(profileData.is_business_mode || false);
      setIsAffiliate(profileData.is_affiliate || false);
    }
  };

  const navItems = [
    { path: '/', icon: Home, label: t('common.home') },
    { path: '/chats', icon: MessageSquare, label: t('common.messages') },
    { path: '/notifications', icon: Bell, label: t('common.notifications'), badge: unreadNotifications },
    { path: user ? `/${user.id}` : '/auth', icon: User, label: t('common.profile') },
  ];

  const featureItems = [
    { path: '/afuai', icon: null, customIcon: aiChatIcon, label: 'AfuAI', requiresAuth: true },
    { path: '/creator-earnings', icon: DollarSign, label: 'Creator Earnings', requiresAuth: true },
    { path: '/shop', icon: ShoppingBag, label: 'Shop' },
    { path: '/wallet', icon: Wallet, label: 'Wallet', requiresAuth: true },
    { path: '/transfer', icon: Send, label: 'Transfer', requiresAuth: true },
    { path: '/gifts', icon: Gift, label: 'Gifts' },
    { path: '/moments', icon: ImageIcon, label: 'Moments' },
    { path: '/trending', icon: Hash, label: 'Trending' },
    // Mini Programs hidden - admin only access via direct URL
  ];

  if (isAffiliate && !isDeveloper) {
    navItems.push({ path: '/affiliate-dashboard', icon: TrendingUp, label: 'Affiliate' });
  }

  if (isAdmin) {
    navItems.push({ path: '/admin', icon: Shield, label: t('admin.title') });
  }

  if (isBusinessMode && mode === 'business') {
    navItems.push({ path: '/business/dashboard', icon: BarChart3, label: t('business.title') });
  }

  navItems.push({ path: '/settings', icon: Settings, label: t('common.settings') });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-background select-none">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-xl border-b border-border z-50">
        <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center gap-4">
          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-10 w-10 flex-shrink-0"
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>

          {/* Brand Name */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <span className="text-xl font-bold text-foreground">AfuChat</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50 h-10 rounded-full"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && (
              <Button 
                variant="default" 
                onClick={() => setIsPostModalOpen(true)}
                className="h-10 px-5 rounded-full font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post
              </Button>
            )}
            
            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Button>
            </Link>
            
            {user && (
              <Link to={`/${user.id}`}>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="pt-16 flex max-w-screen-2xl mx-auto min-h-screen">
        {/* Left Sidebar - Fixed position with independent scroll */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-shrink-0 border-r border-border overflow-hidden sticky top-16 h-[calc(100vh-4rem)] self-start"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  {/* Account Mode Switcher */}
                  <AccountModeSwitcher />

                  {/* Main Navigation */}
                  <nav className="space-y-1">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Navigation
                    </p>
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm",
                          isActive(item.path)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted/70 text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {'badge' in item && item.badge && item.badge > 0 && (
                          <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </nav>

                  {/* Discover Section */}
                  <nav className="space-y-1">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Discover
                    </p>
                    {featureItems.map((item) => {
                      if (item.requiresAuth && !user) return null;
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm",
                            isActive(item.path)
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/70 text-foreground"
                          )}
                        >
                          {item.customIcon ? (
                            <img src={item.customIcon} alt={item.label} className="h-5 w-5 flex-shrink-0 object-contain select-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                          ) : item.icon ? (
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                          ) : null}
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content - scrollable with desktop scrollbar */}
        <main className="flex-1 min-w-0 overflow-y-auto desktop-scrollbar">
          <div className={cn(
            "min-h-[calc(100vh-4rem)]",
            !hideRightSidebar && "max-w-3xl"
          )}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="py-4 px-4"
            >
              {children}
            </motion.div>
          </div>
        </main>

        {/* Right Sidebar - Fixed position with independent scroll */}
        {!hideRightSidebar && (
          <div className="hidden xl:block flex-shrink-0 border-l border-border sticky top-16 h-[calc(100vh-4rem)] self-start overflow-hidden">
            <DesktopRightSidebar className="h-full" />
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {user && (
        <NewPostModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
        />
      )}
    </div>
  );
};