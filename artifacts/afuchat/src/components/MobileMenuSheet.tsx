import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountMode } from '@/contexts/AccountModeContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Grid3x3,
  ShoppingBag,
  Building2,
  Wallet,
  Send,
  Gift,
  Shield,
  BarChart3,
  Image as ImageIcon,
  Hash,
  Bell,
  TrendingUp,
  Settings,
  Bot,
  FileText,
  Lock,
  HelpCircle,
  Briefcase,
  Store
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  requiresBusiness?: boolean;
  requiresAffiliate?: boolean;
}

interface MobileMenuSheetProps {
  trigger?: React.ReactNode;
}

export function MobileMenuSheet({ trigger }: MobileMenuSheetProps) {
  const { user } = useAuth();
  const { mode } = useAccountMode();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [hasAffiliateRequest, setHasAffiliateRequest] = useState(false);
  const { isDeveloper } = useDeveloperStatus();

  useEffect(() => {
    if (user) {
      checkUserStatus();
    }
    
    // Refresh status when user returns to the app
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        checkUserStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const checkUserStatus = async () => {
    if (!user) return;
    
    // Check admin status via secure user_roles table using has_role RPC
    const { data: hasAdminRole } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    setIsAdmin(hasAdminRole === true);
    
    // Get other profile fields (non-sensitive)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_business_mode, is_affiliate')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setIsBusinessMode(profileData.is_business_mode || false);
      setIsAffiliate(profileData.is_affiliate || false);
      
      // Check if user has pending affiliate request
      if (!profileData.is_affiliate) {
        const { data: requestData } = await supabase
          .from('affiliate_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();
        
        setHasAffiliateRequest(!!requestData);
      }
    }
  };

  const menuItems: MenuItem[] = [
    { icon: Bot, label: 'AfuAI', path: '/afuai', requiresAuth: true },
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: Wallet, label: 'Wallet', path: '/wallet', requiresAuth: true },
    { icon: Send, label: 'Transfer', path: '/transfer', requiresAuth: true },
    { icon: Gift, label: 'Gifts', path: '/gifts' },
    { icon: ImageIcon, label: 'Moments', path: '/moments' },
    ...(isAdmin ? [{ icon: Grid3x3, label: 'Mini Programs', path: '/mini-programs' }] : []),
    { icon: Bell, label: 'Notifications', path: '/notifications', requiresAuth: true },
    { icon: Settings, label: 'Settings', path: '/settings', requiresAuth: true },
    { icon: FileText, label: 'Terms v2.0.0', path: '/terms' },
    { icon: Lock, label: 'Privacy v2.0.0', path: '/privacy' },
    { icon: HelpCircle, label: 'Support', path: '/support' },
  ];

  // Business mode navigation - show regardless of mode for easy access
  if (isBusinessMode) {
    menuItems.splice(10, 0, { 
      icon: Store, 
      label: 'Business Hub', 
      path: '/business/dashboard', 
      requiresBusiness: true 
    });
  }

  // Affiliate navigation - conditional based on status (hide for developers)
  if (!isDeveloper) {
    if (isAffiliate) {
      // User is approved affiliate - show dashboard
      menuItems.splice(10, 0, { 
        icon: TrendingUp, 
        label: 'Affiliate Dashboard', 
        path: '/affiliate-dashboard', 
        requiresAffiliate: true 
      });
    } else if (!isAffiliate && !hasAffiliateRequest && !isBusinessMode) {
      // User hasn't requested yet and is not business - show request option
      menuItems.splice(10, 0, { 
        icon: Briefcase, 
        label: 'Become Affiliate', 
        path: '/affiliate-request', 
        requiresAuth: true 
      });
    }
    // If hasAffiliateRequest is true, don't show anything (request is pending)
  }

  // Admin navigation
  if (isAdmin) {
    menuItems.splice(10, 0, { 
      icon: Shield, 
      label: 'Admin Panel', 
      path: '/admin', 
      requiresAdmin: true 
    });
  }

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };
  
  // Refresh status when menu opens
  useEffect(() => {
    if (open && user) {
      checkUserStatus();
    }
  }, [open, user]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <button 
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors text-muted-foreground hover:text-primary"
            aria-label="More options"
          >
            <Grid3x3 className="h-6 w-6" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[85vh] rounded-t-3xl pb-8"
      >
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-bold">Quick Access</SheetTitle>
          {hasAffiliateRequest && !isAffiliate && !isDeveloper && (
            <div className="mt-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground">
                ⏳ Affiliate request pending review
              </p>
            </div>
          )}
        </SheetHeader>
        
        <div className="overflow-y-auto max-h-[calc(85vh-8rem)] px-2">
          <div className="grid grid-cols-4 gap-4">
          {menuItems.map((item) => {
            // Check if item should be shown based on requirements
            if (item.requiresAuth && !user) return null;
            if (item.requiresAdmin && !isAdmin) return null;
            if (item.requiresBusiness && !isBusinessMode) return null;
            if (item.requiresAffiliate && !isAffiliate) return null;

            return (
              <button
                key={item.path}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors active:scale-95"
                onClick={() => handleNavigate(item.path)}
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-medium text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
