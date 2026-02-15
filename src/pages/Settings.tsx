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
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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

  const tabs = [
    { value: 'account', label: 'Account', icon: User },
    { value: 'security', label: 'Security & Privacy', icon: Shield },
    { value: '2fa', label: 'Two-Factor Authentication', icon: Key },
    { value: 'blocked', label: 'Blocked Users', icon: UserX },
    { value: 'notifications', label: 'Notifications', icon: Bell },
    { value: 'activity', label: 'Activity Log', icon: Activity },
    { value: 'data', label: 'Data & Privacy', icon: Database },
    { value: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings />;
      case 'security':
        return <SecuritySettings />;
      case '2fa':
        return <TwoFactorAuthSettings />;
      case 'blocked':
        return <BlockedUsersSettings />;
      case 'notifications':
        return <NotificationsSettings />;
      case 'activity':
        return <ActivityLog />;
      case 'data':
        return <DataPrivacySettings />;
      case 'appearance':
        return <AppearanceSettings />;
      default:
        return <AccountSettings />;
    }
  };

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

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row">

        {/* Sidebar */}
        <div className="w-full md:w-72 border-r border-border">
          <div className="flex flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;

              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value as SettingsTab)}
                  className={`flex items-center justify-between px-4 py-4 text-left transition-colors border-b border-border ${
                    isActive
                      ? 'font-semibold bg-muted'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{tab.label}</span>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 md:px-8 py-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
