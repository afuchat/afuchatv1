import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  User, Bell, Shield, Palette, Database, LogOut, UserX, Key, Activity, 
  Sparkles, ChevronRight, ArrowLeft, Settings as SettingsIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Settings components
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { DataPrivacySettings } from '@/components/settings/DataPrivacySettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BlockedUsersSettings } from '@/components/settings/BlockedUsersSettings';
import { TwoFactorAuthSettings } from '@/components/settings/TwoFactorAuthSettings';
import { ActivityLog } from '@/components/settings/ActivityLog';

type SettingsTab = 'account' | 'security' | 'notifications' | 'data' | 'appearance' | 'blocked' | '2fa' | 'activity';

const settingsSections = [
  {
    group: 'Account',
    items: [
      { value: 'account' as SettingsTab, label: 'Account', description: 'Profile, language & display', icon: User, color: 'bg-primary' },
      { value: 'appearance' as SettingsTab, label: 'Appearance', description: 'Theme & layout', icon: Palette, color: 'bg-primary/80' },
    ]
  },
  {
    group: 'Privacy & Security',
    items: [
      { value: 'security' as SettingsTab, label: 'Security & Privacy', description: 'Privacy controls & linked accounts', icon: Shield, color: 'bg-primary' },
      { value: '2fa' as SettingsTab, label: 'Two-Factor Auth', description: 'Extra security layer', icon: Key, color: 'bg-primary/80' },
      { value: 'blocked' as SettingsTab, label: 'Blocked Users', description: 'Manage blocked accounts', icon: UserX, color: 'bg-destructive' },
    ]
  },
  {
    group: 'Activity & Data',
    items: [
      { value: 'notifications' as SettingsTab, label: 'Notifications', description: 'Push, email & quiet hours', icon: Bell, color: 'bg-primary' },
      { value: 'activity' as SettingsTab, label: 'Activity Log', description: 'Recent activity & Nexa earnings', icon: Activity, color: 'bg-primary/80' },
      { value: 'data' as SettingsTab, label: 'Data & Privacy', description: 'Export data & account deletion', icon: Database, color: 'bg-primary' },
    ]
  }
];

const allItems = settingsSections.flatMap(s => s.items);

const tabContent: Record<SettingsTab, { title: string; subtitle: string; Component: React.FC }> = {
  account: { title: 'Account Settings', subtitle: 'Manage your account and profile information', Component: AccountSettings },
  security: { title: 'Security & Privacy', subtitle: 'Manage your account security and privacy settings', Component: SecuritySettings },
  '2fa': { title: 'Two-Factor Authentication', subtitle: 'Add an extra layer of security to your account', Component: TwoFactorAuthSettings },
  blocked: { title: 'Blocked Users', subtitle: 'Manage users you\'ve blocked', Component: BlockedUsersSettings },
  notifications: { title: 'Notifications', subtitle: 'Control how you receive notifications', Component: NotificationsSettings },
  activity: { title: 'Activity Log', subtitle: 'View your recent activity and Nexa earnings', Component: ActivityLog },
  data: { title: 'Data & Privacy', subtitle: 'Manage your data and privacy preferences', Component: DataPrivacySettings },
  appearance: { title: 'Appearance', subtitle: 'Customize how the app looks', Component: AppearanceSettings },
};

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(isMobile ? initialTab : (initialTab || 'account'));

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleBack = () => {
    setActiveTab(null);
    setSearchParams({});
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to log out');
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const activeItem = activeTab ? allItems.find(i => i.value === activeTab) : null;
  const activeContent = activeTab ? tabContent[activeTab] : null;

  // Mobile: show menu or detail
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <AnimatePresence mode="wait">
          {!activeTab ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <PageHeader 
                title="Settings"
                rightContent={
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => navigate('/whats-new')}>
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                }
              />
              <div className="px-4 pb-32">
                {settingsSections.map((section) => (
                  <div key={section.group} className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                      {section.group}
                    </p>
                    <div className="rounded-2xl bg-card overflow-hidden shadow-soft">
                      {section.items.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.value}
                            onClick={() => handleTabChange(item.value)}
                            className={cn(
                              "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted",
                              idx < section.items.length - 1 && "border-b border-border/50"
                            )}
                          >
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", item.color)}>
                              <Icon className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Logout */}
                <div className="mt-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full rounded-2xl bg-card shadow-soft px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-muted/50 active:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center flex-shrink-0">
                      <LogOut className="h-4 w-4 text-destructive-foreground" />
                    </div>
                    <p className="font-semibold text-sm text-destructive">Log Out</p>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="fixed top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-b border-border">
                <div className="px-4 py-3 flex items-center gap-3">
                  <Button variant="ghost" size="icon-sm" onClick={handleBack}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2.5">
                    {activeItem && (
                      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", activeItem.color)}>
                        <activeItem.icon className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <h1 className="text-lg font-bold">{activeContent?.title}</h1>
                  </div>
                </div>
              </div>
              <div className="pt-14 px-4 py-6 pb-32">
                {activeContent && <activeContent.Component />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop: two-panel layout
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Settings"
        rightContent={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/whats-new')}>
              <Sparkles className="h-4 w-4 mr-1" />
              New
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-20 space-y-5">
              {settingsSections.map((section) => (
                <div key={section.group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                    {section.group}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => handleTabChange(item.value)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150",
                            isActive 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted/60 text-foreground"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                            isActive ? item.color : "bg-muted"
                          )}>
                            <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                          </div>
                          <div className="min-w-0">
                            <p className={cn("text-sm font-semibold", isActive && "text-primary")}>{item.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeContent && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-1">
                    {activeItem && (
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", activeItem.color)}>
                        <activeItem.icon className="h-4.5 w-4.5 text-white" />
                      </div>
                    )}
                    <h2 className="text-2xl font-bold tracking-tight">{activeContent.title}</h2>
                  </div>
                  <p className="text-muted-foreground ml-12">{activeContent.subtitle}</p>
                </div>
                <activeContent.Component />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
