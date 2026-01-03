import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegramWebApp, type TelegramUser, type HapticFeedbackApi, type BackButtonApi, type MainButtonApi } from '@/hooks/useTelegramWebApp';
import { useTheme } from './ThemeContext';

interface TelegramContextType {
  isReady: boolean;
  isTelegram: boolean;
  user: TelegramUser | null;
  colorScheme: 'light' | 'dark';
  platform: string;
  version: string;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  initData: string;
  hapticFeedback: HapticFeedbackApi;
  backButton: BackButtonApi;
  mainButton: MainButtonApi;
  close: () => void;
  expand: () => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }> }) => Promise<string>;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  setHeaderColor: (color: 'bg_color' | 'secondary_bg_color' | `#${string}`) => void;
  setBackgroundColor: (color: 'bg_color' | 'secondary_bg_color' | `#${string}`) => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const telegram = useTelegramWebApp();
  const { setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Sync Telegram theme with app theme
  useEffect(() => {
    if (telegram.isTelegram && telegram.isReady) {
      // Apply Telegram's color scheme to the app
      setTheme(telegram.colorScheme);
      
      // Add telegram-specific class for styling
      document.documentElement.classList.add('telegram-mini-app');
      document.documentElement.dataset.tgPlatform = telegram.platform;
      
      // Disable overscroll/pull-to-refresh behavior in Telegram
      document.body.style.overscrollBehavior = 'contain';
      
      // Set CSS variables from Telegram theme
      const root = document.documentElement;
      const tp = telegram.themeParams;
      
      if (tp.bg_color) root.style.setProperty('--tg-bg-color', tp.bg_color);
      if (tp.text_color) root.style.setProperty('--tg-text-color', tp.text_color);
      if (tp.hint_color) root.style.setProperty('--tg-hint-color', tp.hint_color);
      if (tp.link_color) root.style.setProperty('--tg-link-color', tp.link_color);
      if (tp.button_color) root.style.setProperty('--tg-button-color', tp.button_color);
      if (tp.button_text_color) root.style.setProperty('--tg-button-text-color', tp.button_text_color);
      if (tp.secondary_bg_color) root.style.setProperty('--tg-secondary-bg-color', tp.secondary_bg_color);
      
      console.log('[Telegram] Theme synced:', telegram.colorScheme);
    }
    
    return () => {
      document.documentElement.classList.remove('telegram-mini-app');
      delete document.documentElement.dataset.tgPlatform;
      document.body.style.overscrollBehavior = '';
    };
  }, [telegram.isTelegram, telegram.isReady, telegram.colorScheme, telegram.themeParams, setTheme]);

  // Update viewport height CSS variable for proper sizing
  useEffect(() => {
    if (telegram.isTelegram) {
      document.documentElement.style.setProperty('--tg-viewport-height', `${telegram.viewportHeight}px`);
      document.documentElement.style.setProperty('--tg-viewport-stable-height', `${telegram.viewportStableHeight}px`);
    }
  }, [telegram.isTelegram, telegram.viewportHeight, telegram.viewportStableHeight]);

  // Manage Telegram Back Button based on route
  useEffect(() => {
    if (!telegram.isTelegram || !telegram.isReady) return;
    
    const isHomePage = location.pathname === '/' || location.pathname === '/home';
    
    const handleBackClick = () => {
      // Provide haptic feedback
      telegram.hapticFeedback.impactOccurred('light');
      
      // Navigate back
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    };
    
    if (isHomePage) {
      // Hide back button on home page
      telegram.backButton.hide();
    } else {
      // Show back button on all other pages
      telegram.backButton.show();
      telegram.backButton.onClick(handleBackClick);
    }
    
    // Cleanup
    return () => {
      telegram.backButton.offClick(handleBackClick);
    };
  }, [telegram.isTelegram, telegram.isReady, location.pathname, navigate, telegram.backButton, telegram.hapticFeedback]);

  return (
    <TelegramContext.Provider value={telegram}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
}

// Optional hook that doesn't throw if used outside provider
export function useTelegramOptional() {
  return useContext(TelegramContext);
}
