import { ReactNode, Suspense, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home, Search, Bell, MessageSquare, Gift, Wallet, ShoppingBag,
  Sparkles, Music, Grid3x3, Crown, Shield, User, Settings,
  Calendar, TrendingUp, DollarSign, Star, Plus
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { imgAvatar } from '@/lib/cdn';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import NewPostModal from '@/components/ui/NewPostModal';
import { prefetch } from '@/lib/prefetch';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  authRequired?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Explore', icon: Search, path: '/search' },
  { label: 'Notifications', icon: Bell, path: '/notifications', authRequired: true },
  { label: 'Messages', icon: MessageSquare, path: '/chats', authRequired: true },
  { label: 'Moments', icon: TrendingUp, path: '/moments', authRequired: true },
];

const SECONDARY_NAV: NavItem[] = [
  { label: 'Gifts', icon: Gift, path: '/gifts' },
  { label: 'Wallet', icon: Wallet, path: '/wallet', authRequired: true },
  { label: 'Marketplace', icon: ShoppingBag, path: '/marketplace' },
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Music', icon: Music, path: '/shorts' },
  { label: 'Mini Apps', icon: Grid3x3, path: '/mini-programs' },
  { label: 'AfuAI', icon: Sparkles, path: '/afuai' },
];

const TERTIARY_NAV: NavItem[] = [
  { label: 'Creator Hub', icon: DollarSign, path: '/creator-earnings', authRequired: true },
  { label: 'Affiliate', icon: Star, path: '/affiliate-dashboard', authRequired: true },
  { label: 'Premium', icon: Crown, path: '/premium' },
];

const BOTTOM_TABS = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Explore', icon: Search, path: '/search' },
  { label: 'Gifts', icon: Gift, path: '/gifts' },
  { label: 'Alerts', icon: Bell, path: '/notifications' },
];

const CHAT_PATHS = ['/chats', '/chat/'];

function isActivePath(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/' || pathname === '/home' || pathname === '/feed';
  if (path === '/chats') return pathname.startsWith('/chats') || pathname.startsWith('/chat/');
  return pathname === path || pathname.startsWith(path + '/');
}

function NavLink({
  item,
  collapsed,
  badge,
  onClick,
}: {
  item: NavItem;
  collapsed?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  const location = useLocation();
  const active = isActivePath(location.pathname, item.path);
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      onMouseEnter={() => prefetch(item.path)}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <div className="relative flex-shrink-0">
        <Icon className={cn('h-5 w-5 transition-transform group-hover:scale-110', active && 'scale-110')} />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className="text-[15px] truncate">{item.label}</span>
      )}
      {active && !collapsed && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute left-0 inset-y-1 w-[3px] bg-primary rounded-r-full"
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        />
      )}
    </Link>
  );
}

function NavDivider() {
  return <div className="my-1.5 border-t border-border/40" />;
}

function PageSkeleton() {
  return (
    <div className="w-full p-4 space-y-4 animate-pulse">
      <div className="h-6 bg-muted rounded-xl w-2/5" />
      <div className="rounded-2xl overflow-hidden">
        <div className="h-14 bg-muted" />
        <div className="h-48 bg-muted/60 mt-1" />
        <div className="h-8 bg-muted/40 mt-1" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <div className="h-14 bg-muted" />
        <div className="h-40 bg-muted/60 mt-1" />
        <div className="h-8 bg-muted/40 mt-1" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <div className="h-14 bg-muted" />
        <div className="h-8 bg-muted/40 mt-1" />
      </div>
    </div>
  );
}

type LayoutProfile = {
  display_name: string;
  handle: string;
  avatar_url: string | null;
  is_admin: boolean | null;
  current_grade: string | null;
  platinum_until: string | null;
};

export default function Layout({ children, hideNav = false }: LayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  usePushNotifications();

  const { data: profile } = useQuery({
    queryKey: ['layout-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, handle, avatar_url, is_admin, current_grade, platinum_until')
        .eq('id', user.id)
        .single();
      return data as unknown as LayoutProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: unreadNotifs = 0 } = useQuery({
    queryKey: ['unread-notifs', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await (supabase as any)
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const { data: unreadChats = 0 } = useQuery({
    queryKey: ['unread-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('chats')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('last_message_at', 'is', null);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const isAdmin = profile?.is_admin ?? false;
  const isPremium = profile?.platinum_until
    ? new Date(profile.platinum_until) > new Date()
    : false;

  const getBadge = (path: string): number | undefined => {
    if (path === '/notifications') return unreadNotifs || undefined;
    if (path === '/chats') return unreadChats || undefined;
    return undefined;
  };

  if (hideNav) return <>{children}</>;

  const isProfilePath = location.pathname.startsWith('/@');

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Desktop Sidebar ────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-border/50 bg-background/95 backdrop-blur-sm z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5">
          <Logo size="sm" />
          <span className="font-bold text-[18px] text-foreground tracking-tight">AfuChat</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
          {PRIMARY_NAV.filter(i => !i.authRequired || user).map(item => (
            <NavLink key={item.path} item={item} badge={getBadge(item.path)} />
          ))}

          <NavDivider />

          {SECONDARY_NAV.filter(i => !i.authRequired || user).map(item => (
            <NavLink key={item.path} item={item} />
          ))}

          <NavDivider />

          {TERTIARY_NAV.filter(i => !i.authRequired || user).map(item => (
            <NavLink key={item.path} item={item} />
          ))}

          {isAdmin && (
            <>
              <NavDivider />
              <NavLink item={{ label: 'Admin', icon: Shield, path: '/admin' }} />
            </>
          )}
        </nav>

        {/* Create Post Button */}
        {user && (
          <div className="px-3 pb-3">
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors text-[15px]"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
          </div>
        )}

        <NavDivider />

        {/* User Widget */}
        <div className="px-3 pb-4">
          {user && profile ? (
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors group">
              <Link to={`/@${profile.handle}`}>
                <Avatar className="h-9 w-9 ring-2 ring-border group-hover:ring-primary/30 transition-all">
                  <AvatarImage src={imgAvatar(profile.avatar_url)} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {(profile.display_name || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{profile.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{profile.handle}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => navigate('/settings')}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => navigate('/auth/signin')}
                className="w-full py-2 px-4 text-sm font-medium text-primary border border-primary/30 hover:bg-primary/10 rounded-xl transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/auth/signup')}
                className="w-full py-2 px-4 text-sm font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl transition-colors"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Mobile Header ──────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-background/95 backdrop-blur-sm border-b border-border/50 flex items-center px-4 gap-3">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-bold text-[17px] tracking-tight">AfuChat</span>
        </Link>
        <div className="flex-1" />
        {user ? (
          <>
            <Link
              to="/chats"
              className="relative p-2 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Messages"
            >
              <MessageSquare className="h-5 w-5" />
              {unreadChats > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
              )}
            </Link>
            <Link
              to={`/@${profile?.handle ?? ''}`}
              className="flex-shrink-0"
            >
              <Avatar className="h-8 w-8 ring-2 ring-border">
                <AvatarImage src={imgAvatar(profile?.avatar_url)} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {(profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/auth/signin')}
              className="text-sm font-medium text-primary"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/auth/signup')}
              className="text-sm font-semibold bg-primary text-white px-3 py-1.5 rounded-lg"
            >
              Join
            </button>
          </div>
        )}
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className={cn(
        'flex-1 flex flex-col',
        'md:ml-64',
        'pt-14 pb-16 md:pt-0 md:pb-0',
        'min-h-screen'
      )}>
        <div className="w-full max-w-2xl mx-auto px-0 md:px-4 md:py-4">
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </div>
      </main>

      {/* ─── Mobile Bottom Navigation ───────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-background/95 backdrop-blur-sm border-t border-border/50">
        <div className="flex items-center justify-around h-full px-2">
          {BOTTOM_TABS.map((tab) => {
            const active = isActivePath(location.pathname, tab.path);
            const Icon = tab.icon;
            const badge = getBadge(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                onMouseEnter={() => prefetch(tab.path)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-0 flex-1',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5', active && 'fill-current opacity-90')} />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          {/* Center Create button */}
          <button
            onClick={() => user ? setIsPostModalOpen(true) : navigate('/auth/signin')}
            className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-0 flex-1 text-muted-foreground"
            aria-label="Create post"
          >
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center shadow-md shadow-primary/30 -mt-1">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </button>

          {user ? (
            <Link
              to={`/@${profile?.handle ?? ''}`}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-0 flex-1',
                isProfilePath ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Avatar className="h-5 w-5 ring-1 ring-current">
                <AvatarImage src={imgAvatar(profile?.avatar_url)} />
                <AvatarFallback className="text-[8px] font-semibold bg-primary/10 text-primary">
                  {(profile?.display_name || 'U').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          ) : (
            <Link
              to="/auth/signin"
              className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-0 flex-1 text-muted-foreground"
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Post Modal */}
      {isPostModalOpen && (
        <NewPostModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
        />
      )}
    </div>
  );
}
