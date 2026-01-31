import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatSettingsSheet } from './ChatSettingsSheet';
import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  Moon, 
  Sun, 
  HelpCircle, 
  LogOut,
  Bell,
  Shield,
  Globe,
  Star,
  ChevronRight,
  Archive,
  Palette,
  Image,
  Type,
  Download,
  Volume2,
  Video,
  Folder,
  Tag,
  Lock,
  Eye,
  Clock,
  Trash2,
  Pin
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ChatMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatMenuDrawer = ({ isOpen, onClose }: ChatMenuDrawerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<{
    display_name: string;
    handle: string;
    avatar_url: string | null;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>('appearance');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('display_name, handle, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        // Force clear local session as fallback
        localStorage.clear();
        onClose();
        window.location.href = '/';
        return;
      }
      toast.success('Logged out successfully');
      onClose();
      navigate('/');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error?.message || 'Failed to log out');
      // Force logout as fallback
      localStorage.clear();
      onClose();
      window.location.href = '/';
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSettingsOpen = (tab: string) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
    onClose();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const menuSections = [
    {
      title: 'Chats',
      items: [
        { icon: MessageSquare, label: 'All Chats', action: () => handleNavigation('/chats'), color: 'text-blue-500' },
        { icon: Archive, label: 'Archived', action: () => handleNavigation('/chats'), color: 'text-gray-500' },
        { icon: Star, label: 'Favorites', action: () => handleNavigation('/chats'), color: 'text-yellow-500' },
        { icon: Pin, label: 'Pinned', action: () => handleNavigation('/chats'), color: 'text-purple-500' },
        { icon: Users, label: 'New Group', action: () => handleNavigation('/chats'), color: 'text-green-500' },
        { icon: Folder, label: 'Chat Folders', action: () => handleNavigation('/chats'), color: 'text-orange-500' },
        { icon: Tag, label: 'Labels', action: () => handleNavigation('/chats'), color: 'text-pink-500' },
      ]
    },
    {
      title: 'Chat Appearance',
      items: [
        { icon: Image, label: 'Bubble Style', action: () => handleSettingsOpen('appearance'), color: 'text-teal-500' },
        { icon: Type, label: 'Font Size', action: () => handleSettingsOpen('appearance'), color: 'text-amber-500' },
      ]
    },
    {
      title: 'Chat Customization',
      items: [
        { icon: Volume2, label: 'Chat Sounds', action: () => handleSettingsOpen('media'), color: 'text-red-500' },
        { icon: Download, label: 'Auto-Download', action: () => handleSettingsOpen('media'), color: 'text-emerald-500' },
        { icon: Video, label: 'Media Quality', action: () => handleSettingsOpen('media'), color: 'text-violet-500' },
        { icon: Clock, label: 'Message Timer', action: () => handleSettingsOpen('media'), color: 'text-rose-500' },
      ]
    },
    {
      title: 'Privacy & Storage',
      items: [
        { icon: Lock, label: 'Chat Lock', action: () => handleSettingsOpen('privacy'), color: 'text-foreground' },
        { icon: Eye, label: 'Read Receipts', action: () => handleSettingsOpen('privacy'), color: 'text-foreground' },
        { icon: Shield, label: 'Privacy Settings', action: () => handleNavigation('/settings?tab=security'), color: 'text-foreground' },
        { icon: Trash2, label: 'Clear Chat Data', action: () => handleSettingsOpen('privacy'), color: 'text-destructive' },
      ]
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Notification Settings', action: () => handleNavigation('/settings?tab=notifications'), color: 'text-foreground' },
        { icon: Globe, label: 'Data & Storage', action: () => handleNavigation('/settings?tab=data'), color: 'text-foreground' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', action: () => handleNavigation('/support'), color: 'text-foreground' },
        { icon: Settings, label: 'Chat Settings', action: () => handleSettingsOpen('appearance'), color: 'text-foreground' },
      ]
    }
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-80 p-0 overflow-y-auto bg-background/95 backdrop-blur-xl border-r border-border/50">
        <SheetHeader className="p-6 pb-4 space-y-4">
          {/* Profile Section */}
          <div 
            onClick={() => handleNavigation(`/${user?.id}`)}
            className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors -mx-3"
          >
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {profile?.display_name?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{profile?.display_name || 'User'}</h3>
              <p className="text-sm text-muted-foreground truncate">@{profile?.handle || 'user'}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 -mx-3">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-foreground" />
              )}
              <span className="font-medium">Dark Mode</span>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-6">
          {menuSections.map((section, idx) => (
            <div key={section.title}>
              {idx > 0 && <Separator className="my-4" />}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {section.title}
                </p>
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/10 active:scale-[0.98] transition-all group animate-fade-in"
                  >
                    <div className={`p-1.5 rounded-md ${item.color} bg-current/10 group-hover:scale-110 transition-transform`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Separator className="my-4" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive active:scale-[0.98] transition-all group"
          >
            <div className="p-1.5 rounded-md bg-destructive/10 group-hover:scale-110 transition-transform">
              <LogOut className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">Log Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>

    <ChatSettingsSheet 
      isOpen={settingsOpen} 
      onClose={() => setSettingsOpen(false)} 
      defaultTab={settingsTab}
    />
    </>
  );
};
