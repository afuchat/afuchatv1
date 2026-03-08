import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, Globe, Mail, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneNumberInput } from './PhoneNumberInput';
import { SettingsSection, SettingsRow } from './SettingsUI';
import { useState, useEffect } from 'react';

export const AccountSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [showBalance, setShowBalance] = useState(true);

  const languages = [
    { code: 'en', name: t('languages.en'), flag: '🇬🇧' },
    { code: 'es', name: t('languages.es'), flag: '🇪🇸' },
    { code: 'fr', name: t('languages.fr'), flag: '🇫🇷' },
    { code: 'ar', name: t('languages.ar'), flag: '🇸🇦' },
    { code: 'sw', name: t('languages.sw'), flag: '🇹🇿' },
  ];

  useEffect(() => {
    const fetchBalanceVisibility = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('show_balance')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setShowBalance(data.show_balance ?? true);
      }
    };
    fetchBalanceVisibility();
  }, [user]);

  const handleLanguageChange = async (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    document.documentElement.dir = languageCode === 'ar' ? 'rtl' : 'ltr';

    if (user) {
      try {
        await supabase.from('profiles').update({ language: languageCode }).eq('id', user.id);
        toast.success(t('common.success'));
      } catch (error) {
        console.error('Error saving language preference:', error);
        toast.error(t('common.error'));
      }
    }
  };

  const handleBalanceVisibilityToggle = async (checked: boolean) => {
    if (!user) return;
    setShowBalance(checked);
    try {
      await supabase.from('profiles').update({ show_balance: checked }).eq('id', user.id);
      toast.success(checked ? 'Balance is now visible' : 'Balance is now hidden');
    } catch (error) {
      console.error('Error updating balance visibility:', error);
      toast.error('Failed to update balance visibility');
      setShowBalance(!checked);
    }
  };

  return (
    <div className="space-y-0">
      <SettingsSection title="Profile">
        <SettingsRow
          icon={User}
          iconColor="bg-primary"
          label="Edit Profile"
          description="Update your name, bio, and avatar"
          onClick={() => user && navigate(`/@${user.id}/edit`)}
          chevron
          isLast
        />
      </SettingsSection>

      <SettingsSection title="Language & Region">
        <SettingsRow
          icon={Globe}
          iconColor="bg-primary/80"
          label="App Language"
          description="Choose your preferred language"
          isLast
        >
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Display">
        <SettingsRow
          icon={showBalance ? Eye : EyeOff}
          iconColor="bg-primary"
          label="Show Balance on Profile"
          description="Display your Nexa balance and progress bar to visitors"
          toggle
          checked={showBalance}
          onCheckedChange={handleBalanceVisibilityToggle}
          isLast
        />
      </SettingsSection>

      <SettingsSection title="Email">
        <SettingsRow
          icon={Mail}
          iconColor="bg-primary/80"
          label="Email Address"
          description={user?.email || 'No email set'}
          isLast
        />
      </SettingsSection>

      <PhoneNumberInput />
    </div>
  );
};
