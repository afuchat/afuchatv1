import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  User, Bell, Shield, Palette, Database, LogOut, UserX, Key, Activity, 
  ChevronRight, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableSheet, SwipeableSheetContent } from '@/components/ui/swipeable-sheet';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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
      { value: 'security' as SettingsTab, label: 'Security & Privacy', description: 'Privacy controls', icon: Shield, color: 'bg-primary' },
      { value: '2fa' as SettingsTab, label: 'Two-Factor Auth', description: 'Extra security layer', icon: Key, color: 'bg-primary/80' },
      { value: 'blocked' as SettingsTab, label: 'Blocked Users', description: 'Manage blocked accounts', icon: UserX, color: 'bg-destructive' },
    ]
  },
  {
    group: 'Activity & Data',
    items: [
      { value: 'notifications' as SettingsTab, label: 'Notifications', description: 'Push, email & quiet hours', icon: Bell, color: 'bg-primary' },
      { value: 'activity' as SettingsTab, label: 'Activity Log', description: 'Recent activity & earnings', icon: Activity, color: 'bg-primary/80' },
      { value: 'data' as SettingsTab, label: 'Data & Privacy', description: 'Export & account deletion', icon: Database, color: 'bg-primary' },
    ]
  }
];

const allItems = settingsSections.flatMap(s => s.items);

const tabComponents: Record<SettingsTab, { title: string; Component: React.FC }> = {
  account: { title: 'Account Settings', Component: AccountSettings },
  security: { title: 'Security & Privacy', Component: SecuritySettings },
  '2fa': { title: 'Two-Factor Auth', Component: TwoFactorAuthSettings },
  blocked: { title: 'Blocked Users', Component: BlockedUsersSettings },
  notifications: { title: 'Notifications', Component: NotificationsSettings },
  activity: { title: 'Activity Log', Component: ActivityLog },
  data: { title: 'Data & Privacy', Component: DataPrivacySettings },
  appearance: { title: 'Appearance', Component: AppearanceSettings },
};

export const SettingsSheet = () => {
  const { isOpen, closeSettings, activeTab, setActiveTab } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setShowDetail(true);
  };

  const handleBack = () => {
    setShowDetail(false);
  };

  const handleClose = () => {
    setShowDetail(false);
    closeSettings();
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        localStorage.clear();
        handleClose();
        window.location.href = '/';
        return;
      }
      toast.success('Logged out successfully');
      handleClose();
      navigate('/');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to log out');
      localStorage.clear();
      handleClose();
      window.location.href = '/';
    }
  };

  const activeItem = activeTab ? allItems.find(i => i.value === activeTab) : null;
  const activeContent = activeTab ? tabComponents[activeTab] : null;

  return (
    <SwipeableSheet
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="Settings"
    >
      <SwipeableSheetContent className="px-0">
        <AnimatePresence mode="wait">
          {!showDetail ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Settings</h2>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Log Out
                </Button>
              </div>

              {settingsSections.map((section) => (
                <div key={section.group} className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                    {section.group}
                  </p>
                  <div className="rounded-2xl bg-muted/30 overflow-hidden">
                    {section.items.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.value}
                          onClick={() => handleSelectTab(item.value)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted",
                            idx < section.items.length - 1 && "border-b border-border/40"
                          )}
                        >
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", item.color)}>
                            <Icon className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{item.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center gap-2.5 px-4 pb-4 border-b border-border/50">
                <Button variant="ghost" size="icon-sm" onClick={handleBack}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {activeItem && (
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", activeItem.color)}>
                    <activeItem.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <h2 className="text-lg font-bold">{activeContent?.title}</h2>
              </div>
              <div className="px-4 py-4">
                {activeContent && <activeContent.Component />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SwipeableSheetContent>
    </SwipeableSheet>
  );
};
