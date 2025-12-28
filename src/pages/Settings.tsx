import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { User, Bell, Shield, Palette, Database, LogOut, UserX, Key, Activity, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

type SettingsTab = 'account' | 'security' | 'notifications' | 'data' | 'appearance' | 'blocked' | '2fa' | 'activity';

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
        // Force clear local session as fallback
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error?.message || 'Failed to log out');
      // Force logout as fallback
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/whats-new')}>
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as SettingsTab)}>
          <div className="overflow-x-auto mb-8">
            <TabsList className="grid w-full grid-cols-8 min-w-[800px]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="account" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
              <p className="text-muted-foreground text-lg">Manage your account and profile information</p>
            </div>
            <AccountSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Security & Privacy</h2>
              <p className="text-muted-foreground text-lg">Manage your account security and privacy settings</p>
            </div>
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="2fa" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Two-Factor Authentication</h2>
              <p className="text-muted-foreground text-lg">Add an extra layer of security to your account</p>
            </div>
            <TwoFactorAuthSettings />
          </TabsContent>

          <TabsContent value="blocked" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Blocked Users</h2>
              <p className="text-muted-foreground text-lg">Manage users you've blocked</p>
            </div>
            <BlockedUsersSettings />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
              <p className="text-muted-foreground text-lg">Control how you receive notifications with granular preferences</p>
            </div>
            <NotificationsSettings />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
              <p className="text-muted-foreground text-lg">View your recent activity and Nexa earnings</p>
            </div>
            <ActivityLog />
          </TabsContent>

          <TabsContent value="data" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Data & Privacy</h2>
              <p className="text-muted-foreground text-lg">Manage your data and privacy preferences</p>
            </div>
            <DataPrivacySettings />
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <div className="space-y-2 mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Appearance</h2>
              <p className="text-muted-foreground text-lg">Customize how the app looks</p>
            </div>
            <AppearanceSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
