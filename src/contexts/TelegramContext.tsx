import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegramWebApp, type TelegramUser, type HapticFeedbackApi, type BackButtonApi, type MainButtonApi } from '@/hooks/useTelegramWebApp';
import { useTheme } from './ThemeContext';
import { applyTelegramTheme } from '@/lib/telegramTheme';

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

  // Sync Telegram theme with app theme — apply native Telegram colors
  useEffect(() => {
    if (telegram.isTelegram && telegram.isReady) {
      // Set the app light/dark mode to match Telegram
      setTheme(telegram.colorScheme);
      
      // Apply Telegram's exact colors to CSS variables
      applyTelegramTheme(telegram.themeParams as any, telegram.colorScheme);
      
      // Add telegram-specific class for styling
      document.documentElement.classList.add('telegram-mini-app');
      document.documentElement.dataset.tgPlatform = telegram.platform;
      
      // Set Telegram header & background to match
      telegram.setHeaderColor('bg_color');
      telegram.setBackgroundColor('bg_color');
      
      // Disable overscroll/pull-to-refresh behavior in Telegram
      document.body.style.overscrollBehavior = 'contain';
      
      // Disable vertical swipes so we own scrolling
      try {
        const webApp = window.Telegram?.WebApp;
        if (webApp?.disableVerticalSwipes) {
          webApp.disableVerticalSwipes();
        }
      } catch {}
      
      console.log('[Telegram] Theme synced:', telegram.colorScheme);
    }
    
    return () => {
      document.documentElement.classList.remove('telegram-mini-app');
      delete document.documentElement.dataset.tgPlatform;
      document.body.style.overscrollBehavior = '';
    };
  }, [telegram.isTelegram, telegram.isReady, telegram.colorScheme, telegram.themeParams, setTheme]);

  // Update viewport height and safe area CSS variables for proper sizing
  useEffect(() => {
    if (!telegram.isTelegram) return;
    
    const root = document.documentElement;
    root.style.setProperty('--tg-viewport-height', `${telegram.viewportHeight}px`);
    root.style.setProperty('--tg-viewport-stable-height', `${telegram.viewportStableHeight}px`);
    
    const updateSafeAreas = () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp) return;
      
      // Device safe area (notch, status bar, home indicator)
      const sa = webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
      root.style.setProperty('--tg-safe-area-top', `${sa.top}px`);
      root.style.setProperty('--tg-safe-area-bottom', `${sa.bottom}px`);
      root.style.setProperty('--tg-safe-area-left', `${sa.left}px`);
      root.style.setProperty('--tg-safe-area-right', `${sa.right}px`);
      
      // Content safe area (Telegram header/bottom bar)
      const csa = webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
      root.style.setProperty('--tg-content-safe-area-top', `${csa.top}px`);
      root.style.setProperty('--tg-content-safe-area-bottom', `${csa.bottom}px`);
      root.style.setProperty('--tg-content-safe-area-left', `${csa.left}px`);
      root.style.setProperty('--tg-content-safe-area-right', `${csa.right}px`);
      
      // Combined safe area (device + content) for easy use
      root.style.setProperty('--tg-safe-top', `${sa.top + csa.top}px`);
      root.style.setProperty('--tg-safe-bottom', `${sa.bottom + csa.bottom}px`);
      root.style.setProperty('--tg-safe-left', `${sa.left + csa.left}px`);
      root.style.setProperty('--tg-safe-right', `${sa.right + csa.right}px`);
    };
    
    updateSafeAreas();
    
    // Listen for safe area changes (Bot API 7.7+)
    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      webApp.onEvent('safeAreaChanged', updateSafeAreas);
      webApp.onEvent('contentSafeAreaChanged', updateSafeAreas);
    }
    
    return () => {
      if (webApp) {
        webApp.offEvent('safeAreaChanged', updateSafeAreas);
        webApp.offEvent('contentSafeAreaChanged', updateSafeAreas);
      }
    };
  }, [telegram.isTelegram, telegram.viewportHeight, telegram.viewportStableHeight]);

  // Manage Telegram Back Button based on route
  useEffect(() => {
    if (!telegram.isTelegram || !telegram.isReady) return;
    
    const isRootPage = ['/', '/home', '/auth/welcome'].includes(location.pathname);
    
    const handleBackClick = () => {
      telegram.hapticFeedback.impactOccurred('light');
      
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/home');
      }
    };
    
    if (isRootPage) {
      telegram.backButton.hide();
    } else {
      telegram.backButton.show();
      telegram.backButton.onClick(handleBackClick);
    }
    
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
