import { useState, useEffect, useCallback } from 'react';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  User,
  Crown,
  MessageSquare,
  ChevronDown,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Shield,
  Bot,
  Gift,
  Wallet,
  Grid3x3,
  Store,
  TrendingUp,
  Briefcase,
  MoreVertical,
  Check,
  UserPlus,
  LogOut,
  Unlink,
  Banknote,
  BookOpen,
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { AddAccountSheet } from './AddAccountSheet';
import { toast } from 'sonner';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';

interface LinkedAccount {
  id: string;
  linked_user_id: string;
  profile: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  } | null;
}

interface ProfileDrawerProps {
  trigger: React.ReactNode;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  requiresBusiness?: boolean;
  requiresAffiliate?: boolean;
}

export function ProfileDrawer({ trigger }: ProfileDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { isPremium } = usePremiumStatus();
  const { isDeveloper } = useDeveloperStatus();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountsDrawerOpen, setAccountsDrawerOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [profile, setProfile] = useState<{
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean | null;
    is_organization_verified: boolean | null;
    is_business_mode: boolean;
    is_affiliate: boolean | null;
  } | null>(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAffiliateRequest, setHasAffiliateRequest] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);

  const fetchLinkedAccounts = useCallback(async () => {
    if (!user) return;
    
    // Query both directions - where user is primary OR where user is linked
    const { data: asPrimary } = await supabase
      .from('linked_accounts')
      .select('id, linked_user_id')
      .eq('primary_user_id', user.id);
    
    const { data: asLinked } = await supabase
      .from('linked_accounts')
      .select('id, primary_user_id')
      .eq('linked_user_id', user.id);

    // Combine both - get the "other" user ID from each link
    const allLinkedUserIds = new Set<string>();
    asPrimary?.forEach(d => allLinkedUserIds.add(d.linked_user_id));
    asLinked?.forEach(d => allLinkedUserIds.add(d.primary_user_id));

    if (allLinkedUserIds.size > 0) {
      const linkedUserIdsArray = Array.from(allLinkedUserIds);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .in('id', linkedUserIdsArray);

      const accountsWithProfiles = linkedUserIdsArray.map(linkedUserId => ({
        id: linkedUserId,
        linked_user_id: linkedUserId,
        profile: profiles?.find(p => p.id === linkedUserId) || null
      }));

      setLinkedAccounts(accountsWithProfiles);
    } else {
      setLinkedAccounts([]);
    }
  }, [user]);

  useEffect(() => {
    if (user && open) {
      fetchProfile();
      fetchFollowCounts();
      checkUserStatus();
      fetchLinkedAccounts();
    }
  }, [user, open, fetchLinkedAccounts]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, handle, avatar_url, is_verified, is_organization_verified, is_business_mode, is_affiliate')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
  };

  const fetchFollowCounts = async () => {
    if (!user) return;
    const { count: followers } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', user.id);
    const { count: following } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', user.id);
    setFollowCounts({ followers: followers || 0, following: following || 0 });
  };

  const checkUserStatus = async () => {
    if (!user) return;
    
    const { data: hasAdminRole } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    setIsAdmin(hasAdminRole === true);

    if (profile && !profile.is_affiliate) {
      const { data: requestData } = await supabase
        .from('affiliate_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      setHasAffiliateRequest(!!requestData);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleSwitchAccount = async (linkedUserId: string) => {
    try {
      // Get stored session for this linked account
      const storedSessions = JSON.parse(localStorage.getItem('afuchat_linked_sessions') || '{}');
      const linkedSession = storedSessions[linkedUserId];
      
      if (!linkedSession?.refresh_token) {
        toast.error('Session expired. Please re-link this account.');
        return;
      }

      // Store current session before switching (for switching back)
      if (user) {
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
          storedSessions[user.id] = {
            access_token: currentSession.session.access_token,
            refresh_token: currentSession.session.refresh_token,
          };
          localStorage.setItem('afuchat_linked_sessions', JSON.stringify(storedSessions));
        }
      }

      // Switch to the linked account using stored refresh token
      const { error } = await supabase.auth.setSession({
        access_token: linkedSession.access_token,
        refresh_token: linkedSession.refresh_token,
      });

      if (error) {
        console.error('Switch error:', error);
        toast.error('Failed to switch account. Please re-link.');
        return;
      }

      toast.success('Switched account!');
      setAccountsDrawerOpen(false);
      setOpen(false);
      // Refresh the page to update all contexts
      window.location.href = '/home';
    } catch (error) {
      console.error('Switch account error:', error);
      toast.error('Failed to switch account');
    }
  };

  const handleUnlinkAccount = async (linkedUserId: string) => {
    try {
      // Delete both directions of the link
      await supabase
        .from('linked_accounts')
        .delete()
        .or(`and(primary_user_id.eq.${user?.id},linked_user_id.eq.${linkedUserId}),and(primary_user_id.eq.${linkedUserId},linked_user_id.eq.${user?.id})`);
      
      // Remove stored session for this account
      const storedSessions = JSON.parse(localStorage.getItem('afuchat_linked_sessions') || '{}');
      delete storedSessions[linkedUserId];
      localStorage.setItem('afuchat_linked_sessions', JSON.stringify(storedSessions));
      
      toast.success('Account unlinked successfully');
      fetchLinkedAccounts();
    } catch (error) {
      console.error('Unlink error:', error);
      toast.error('Failed to unlink account');
    }
  };

  const hasLinkedAccount = linkedAccounts.length > 0;

  const mainMenuItems: MenuItem[] = [
    { icon: User, label: 'Profile', path: user ? `/${profile?.handle || user.id}` : '/auth', requiresAuth: true },
    { icon: Crown, label: 'Premium', path: '/premium' },
    { icon: Bot, label: 'AfuAI', path: '/afuai', badge: 'Beta', requiresAuth: true },
    { icon: MessageSquare, label: 'Chats', path: '/chats', requiresAuth: true },
    
    { icon: Gift, label: 'Gifts', path: '/gifts' },
    { icon: Wallet, label: 'Wallet', path: '/wallet', requiresAuth: true },
    { icon: Banknote, label: 'Creator Earnings', path: '/creator-earnings', badge: '🇺🇬', requiresAuth: true },
    { icon: Store, label: 'Shop', path: '/shop' },
    ...(isAdmin ? [{ icon: Grid3x3, label: 'Mini Programs', path: '/mini-programs' }] : []),
  ];

  // Build dynamic items
  const dynamicItems: MenuItem[] = [];
  
  if (profile?.is_business_mode) {
    dynamicItems.push({ 
      icon: Store, 
      label: 'Business Hub', 
      path: '/business/dashboard', 
      requiresBusiness: true 
    });
  }
  
  if (!isDeveloper) {
    if (profile?.is_affiliate) {
      dynamicItems.push({ 
        icon: TrendingUp, 
        label: 'Affiliate Dashboard', 
        path: '/affiliate-dashboard', 
        requiresAffiliate: true 
      });
    } else if (!profile?.is_affiliate && !hasAffiliateRequest && !profile?.is_business_mode) {
      dynamicItems.push({ 
        icon: Briefcase, 
        label: 'Become Affiliate', 
        path: '/affiliate-request', 
        requiresAuth: true 
      });
    }
  }
  
  if (isAdmin) {
    dynamicItems.push({ 
      icon: Shield, 
      label: 'Admin Panel', 
      path: '/admin', 
      requiresAdmin: true 
    });
  }

  const settingsItems: MenuItem[] = [
    { icon: Settings, label: 'Settings and privacy', path: '/settings', requiresAuth: true },
    { icon: HelpCircle, label: 'Help Center', path: '/support' },
  ];

  const renderMenuItem = (item: MenuItem) => {
    if (item.requiresAuth && !user) return null;
    if (item.requiresAdmin && !isAdmin) return null;
    if (item.requiresBusiness && !profile?.is_business_mode) return null;
    if (item.requiresAffiliate && !profile?.is_affiliate) return null;

    return (
      <button
        key={item.path}
        onClick={() => handleNavigate(item.path)}
        className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted/50 transition-colors rounded-lg"
      >
        <item.icon className="h-6 w-6" />
        <span className="text-lg font-medium flex-1 text-left">{item.label}</span>
        {item.badge && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[85vw] max-w-[320px] p-0 overflow-hidden rounded-none border-r-0"
        hideCloseButton
      >
        <div 
          className="overflow-y-auto h-full px-4 py-6 overscroll-contain pt-[max(1.5rem,var(--tg-safe-top,0px))] pb-[max(1.5rem,var(--tg-safe-bottom,0px))]"
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Profile Header */}
          {user && profile && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-3">
                {/* Main avatar */}
                <button 
                  onClick={() => handleNavigate(`/@${profile.handle}`)}
                  className="flex-shrink-0"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {/* Right side: linked accounts + more button */}
                <div className="flex items-center gap-1">
                  {/* Linked accounts avatars */}
                  {linkedAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSwitchAccount(account.linked_user_id)}
                      className="relative flex-shrink-0"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={account.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {account.profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  ))}

                  {/* Add account button (only if no linked accounts and premium) */}
                  {isPremium && linkedAccounts.length === 0 && (
                    <button
                      onClick={() => setAccountsDrawerOpen(true)}
                      className="h-7 w-7 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center hover:bg-muted/50 transition-colors"
                    >
                      <UserPlus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}

                  {/* Account switcher button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountsDrawerOpen(true);
                    }}
                    className="p-1.5 hover:bg-muted/50 rounded-full transition-colors"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => handleNavigate(`/@${profile.handle}`)}
                className="text-left"
              >
                <div className="flex items-center gap-1">
                  <h2 className="text-xl font-bold">{profile.display_name}</h2>
                  <VerifiedBadge
                    isVerified={profile.is_verified ?? undefined}
                    isOrgVerified={profile.is_organization_verified ?? undefined}
                    size="md"
                  />
                </div>
                <p className="text-muted-foreground">@{profile.handle}</p>
              </button>

              <div className="flex items-center gap-4 mt-3">
                <button 
                  onClick={() => handleNavigate(`/@${profile.handle}/following`)}
                  className="hover:underline"
                >
                  <span className="font-bold">{followCounts.following}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </button>
                <button 
                  onClick={() => handleNavigate(`/@${profile.handle}/followers`)}
                  className="hover:underline"
                >
                  <span className="font-bold">{followCounts.followers}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </button>
              </div>
            </div>
          )}

          <Separator className="my-2" />

          {/* Main Menu Items */}
          <div className="py-2 space-y-1">
            {mainMenuItems.map(renderMenuItem)}
            {dynamicItems.map(renderMenuItem)}
          </div>

          <Separator className="my-2" />

          {/* Settings & Support Collapsible */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors rounded-lg">
              <span className="text-lg font-medium">Settings & Support</span>
              <ChevronDown className={`h-5 w-5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-4">
              {settingsItems.map(renderMenuItem)}
            </CollapsibleContent>
          </Collapsible>

          {/* Theme Toggle - hidden in Telegram as it uses its own theme */}
          {!useIsTelegram() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted/50 transition-colors rounded-lg mt-2"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-6 w-6" />
              ) : (
                <Moon className="h-6 w-6" />
              )}
              <span className="text-lg font-medium">
                {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          )}


          {/* Sign In for guests */}
          {!user && (
            <>
              <Separator className="my-4" />
              <button
                onClick={() => handleNavigate('/auth')}
                className="flex items-center gap-4 w-full px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg justify-center"
              >
                <span className="text-lg font-medium">Sign In</span>
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Accounts Bottom Sheet */}
    <Drawer open={accountsDrawerOpen} onOpenChange={setAccountsDrawerOpen}>
      <DrawerContent className="max-h-[80vh] z-[150]" overlayClassName="z-[150]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl font-bold">Accounts</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2">
          {/* Current Account */}
          {profile && (
            <button
              className="flex items-center gap-3 w-full p-3 hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => setAccountsDrawerOpen(false)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-semibold">{profile.display_name}</p>
                <p className="text-sm text-muted-foreground">@{profile.handle}</p>
              </div>
              <Check className="h-5 w-5 text-primary" />
            </button>
          )}

          <Separator className="my-4" />

          {/* Premium Gate for Multi-Account */}
          {!isPremium ? (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg border border-border">
                <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-semibold text-lg mb-1">Premium Feature</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add multiple accounts and switch between them instantly with Premium.
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setAccountsDrawerOpen(false);
                    setOpen(false);
                    navigate('/premium');
                  }}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Linked accounts list */}
              {linkedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 w-full p-3 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <button
                    className="flex items-center gap-3 flex-1"
                    onClick={() => handleSwitchAccount(account.linked_user_id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={account.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {account.profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{account.profile?.display_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">@{account.profile?.handle || 'unknown'}</p>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkAccount(account.linked_user_id);
                    }}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {linkedAccounts.length > 0 && <Separator className="my-2" />}

              {/* Add existing account - disabled if already has linked account */}
              <Button
                variant="outline"
                className="w-full justify-center py-6 text-base"
                disabled={hasLinkedAccount}
                onClick={() => {
                  setAddAccountOpen(true);
                }}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Add an existing account
              </Button>

              {hasLinkedAccount && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You can only link one account at a time
                </p>
              )}
            </>
          )}

          {/* Logout */}
          {user && (
            <Button
              variant="ghost"
              className="w-full justify-center py-6 text-base text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await supabase.auth.signOut();
                setAccountsDrawerOpen(false);
                setOpen(false);
                navigate('/');
              }}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Log out @{profile?.handle}
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>

    {/* Add Account Sheet */}
    <AddAccountSheet 
      open={addAccountOpen} 
      onOpenChange={setAddAccountOpen}
      onSuccess={() => {
        fetchLinkedAccounts();
        setAddAccountOpen(false);
      }}
    />
    </>
  );
}