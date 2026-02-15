import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  LogOut,
  UserX,
  Key,
  Activity,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';

// Settings components
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { DataPrivacySettings } from '@/components/settings/DataPrivacySettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BlockedUsersSettings } from '@/components/settings/BlockedUsersSettings';
import { TwoFactorAuthSettings } from '@/components/settings/TwoFactorAuthSettings';
import { ActivityLog } from '@/components/settings/ActivityLog';

type SettingsTab =
  | 'account'
  | 'security'
  | 'notifications'
  | 'data'
  | 'appearance'
  | 'blocked'
  | '2fa'
  | 'activity';

const SectionHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="space-y-1 mb-6">
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
      {title}
    </h2>
    <p className="text-muted-foreground text-sm md:text-base">
      {description}
    </p>
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    (searchParams.get('tab') as SettingsTab) || 'account'
  );

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error?.message || 'Failed to log out');
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const tabs = [
    { value: 'account', label: 'Account', icon: User },
    { value: 'security', label: 'Security', icon: Shield },
    { value: '2fa', label: '2FA', icon: Key },
    { value: 'blocked', label: 'Blocked', icon: UserX },
    { value: 'notifications', label: 'Notifications', icon: Bell },
    { value: 'activity', label: 'Activity', icon: Activity },
    { value: 'data', label: 'Data & Privacy', icon: Database },
    { value: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Settings"
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/whats-new')}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              New
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            handleTabChange(value as SettingsTab)
          }
          className="w-full"
        >
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="md:w-64 w-full">
              <TabsList className="flex md:flex-col flex-col gap-2 bg-muted/40 p-2 rounded-xl w-full">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg justify-start"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Content */}
            <div className="flex-1">
              <TabsContent value="account">
                <SectionHeader
                  title="Account Settings"
                  description="Manage your account and profile information"
                />
                <AccountSettings />
              </TabsContent>

              <TabsContent value="security">
                <SectionHeader
                  title="Security & Privacy"
                  description="Manage your account security and privacy settings"
                />
                <SecuritySettings />
              </TabsContent>

              <TabsContent value="2fa">
                <SectionHeader
                  title="Two-Factor Authentication"
                  description="Add an extra layer of security to your account"
                />
                <TwoFactorAuthSettings />
              </TabsContent>

              <TabsContent value="blocked">
                <SectionHeader
                  title="Blocked Users"
                  description="Manage users you've blocked"
                />
                <BlockedUsersSettings />
              </TabsContent>

              <TabsContent value="notifications">
                <SectionHeader
                  title="Notifications"
                  description="Control how you receive notifications"
                />
                <NotificationsSettings />
              </TabsContent>

              <TabsContent value="activity">
                <SectionHeader
                  title="Activity Log"
                  description="View your recent activity and Nexa earnings"
                />
                <ActivityLog />
              </TabsContent>

              <TabsContent value="data">
                <SectionHeader
                  title="Data & Privacy"
                  description="Manage your data and privacy preferences"
                />
                <DataPrivacySettings />
              </TabsContent>

              <TabsContent value="appearance">
                <SectionHeader
                  title="Appearance"
                  description="Customize how the app looks"
                />
                <AppearanceSettings />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
