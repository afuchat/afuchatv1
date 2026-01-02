import { useEffect, useState, useCallback, useMemo } from 'react';
import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppState {
  isReady: boolean;
  isTelegram: boolean;
  user: TelegramUser | null;
  colorScheme: 'light' | 'dark';
  themeParams: typeof WebApp.themeParams;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  platform: string;
  version: string;
  initData: string;
  initDataUnsafe: typeof WebApp.initDataUnsafe;
}

export interface HapticFeedbackApi {
  impactOccurred: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface BackButtonApi {
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

export interface MainButtonApi {
  show: () => void;
  hide: () => void;
  setText: (text: string) => void;
  setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  enable: () => void;
  disable: () => void;
}

export function useTelegramWebApp() {
  const [state, setState] = useState<TelegramWebAppState>(() => ({
    isReady: false,
    isTelegram: false,
    user: null,
    colorScheme: 'dark',
    themeParams: {} as typeof WebApp.themeParams,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    isExpanded: false,
    platform: 'unknown',
    version: '0.0',
    initData: '',
    initDataUnsafe: {} as typeof WebApp.initDataUnsafe,
  }));

  // Initialize Telegram WebApp
  useEffect(() => {
    const initTelegram = () => {
      try {
        // Check if running inside Telegram
        const isTelegram = Boolean(WebApp.initData && WebApp.initData.length > 0);
        
        if (isTelegram) {
          // Mark as ready
          WebApp.ready();
          
          // Expand to full height
          WebApp.expand();
          
          // Enable closing confirmation if needed
          WebApp.enableClosingConfirmation();
          
          // Get user data
          const user = WebApp.initDataUnsafe.user || null;
          
          setState({
            isReady: true,
            isTelegram: true,
            user: user ? {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username,
              language_code: user.language_code,
              is_premium: user.is_premium,
              photo_url: user.photo_url,
            } : null,
            colorScheme: WebApp.colorScheme || 'dark',
            themeParams: WebApp.themeParams,
            viewportHeight: WebApp.viewportHeight,
            viewportStableHeight: WebApp.viewportStableHeight,
            isExpanded: WebApp.isExpanded,
            platform: WebApp.platform,
            version: WebApp.version,
            initData: WebApp.initData,
            initDataUnsafe: WebApp.initDataUnsafe,
          });
          
          console.log('[Telegram] Mini App initialized:', {
            platform: WebApp.platform,
            version: WebApp.version,
            colorScheme: WebApp.colorScheme,
            user: user?.username || user?.first_name,
          });
        } else {
          setState(prev => ({ ...prev, isReady: true, isTelegram: false }));
        }
      } catch (error) {
        console.log('[Telegram] Not running in Telegram context');
        setState(prev => ({ ...prev, isReady: true, isTelegram: false }));
      }
    };

    initTelegram();
  }, []);

  // Listen for theme changes
  useEffect(() => {
    if (!state.isTelegram) return;

    const handleThemeChange = () => {
      setState(prev => ({
        ...prev,
        colorScheme: WebApp.colorScheme || 'dark',
        themeParams: WebApp.themeParams,
      }));
    };

    WebApp.onEvent('themeChanged', handleThemeChange);
    return () => {
      WebApp.offEvent('themeChanged', handleThemeChange);
    };
  }, [state.isTelegram]);

  // Listen for viewport changes
  useEffect(() => {
    if (!state.isTelegram) return;

    const handleViewportChange = () => {
      setState(prev => ({
        ...prev,
        viewportHeight: WebApp.viewportHeight,
        viewportStableHeight: WebApp.viewportStableHeight,
        isExpanded: WebApp.isExpanded,
      }));
    };

    WebApp.onEvent('viewportChanged', handleViewportChange);
    return () => {
      WebApp.offEvent('viewportChanged', handleViewportChange);
    };
  }, [state.isTelegram]);

  // Haptic feedback
  const hapticFeedback: HapticFeedbackApi = useMemo(() => ({
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      if (state.isTelegram) {
        WebApp.HapticFeedback.impactOccurred(style);
      }
    },
    notificationOccurred: (type: 'error' | 'success' | 'warning') => {
      if (state.isTelegram) {
        WebApp.HapticFeedback.notificationOccurred(type);
      }
    },
    selectionChanged: () => {
      if (state.isTelegram) {
        WebApp.HapticFeedback.selectionChanged();
      }
    },
  }), [state.isTelegram]);

  // Back button control
  const backButton: BackButtonApi = useMemo(() => ({
    show: () => {
      if (state.isTelegram) {
        WebApp.BackButton.show();
      }
    },
    hide: () => {
      if (state.isTelegram) {
        WebApp.BackButton.hide();
      }
    },
    onClick: (callback: () => void) => {
      if (state.isTelegram) {
        WebApp.BackButton.onClick(callback);
      }
    },
    offClick: (callback: () => void) => {
      if (state.isTelegram) {
        WebApp.BackButton.offClick(callback);
      }
    },
  }), [state.isTelegram]);

  // Main button control
  const mainButton: MainButtonApi = useMemo(() => ({
    show: () => {
      if (state.isTelegram) {
        WebApp.MainButton.show();
      }
    },
    hide: () => {
      if (state.isTelegram) {
        WebApp.MainButton.hide();
      }
    },
    setText: (text: string) => {
      if (state.isTelegram) {
        WebApp.MainButton.setText(text);
      }
    },
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => {
      if (state.isTelegram) {
        WebApp.MainButton.setParams(params);
      }
    },
    onClick: (callback: () => void) => {
      if (state.isTelegram) {
        WebApp.MainButton.onClick(callback);
      }
    },
    offClick: (callback: () => void) => {
      if (state.isTelegram) {
        WebApp.MainButton.offClick(callback);
      }
    },
    showProgress: (leaveActive?: boolean) => {
      if (state.isTelegram) {
        WebApp.MainButton.showProgress(leaveActive);
      }
    },
    hideProgress: () => {
      if (state.isTelegram) {
        WebApp.MainButton.hideProgress();
      }
    },
    enable: () => {
      if (state.isTelegram) {
        WebApp.MainButton.enable();
      }
    },
    disable: () => {
      if (state.isTelegram) {
        WebApp.MainButton.disable();
      }
    },
  }), [state.isTelegram]);

  // Utility functions
  const close = useCallback(() => {
    if (state.isTelegram) {
      WebApp.close();
    }
  }, [state.isTelegram]);

  const expand = useCallback(() => {
    if (state.isTelegram) {
      WebApp.expand();
    }
  }, [state.isTelegram]);

  const openLink = useCallback((url: string, options?: { try_instant_view?: boolean }) => {
    if (state.isTelegram) {
      WebApp.openLink(url, options as { try_instant_view: boolean });
    } else {
      window.open(url, '_blank');
    }
  }, [state.isTelegram]);

  const openTelegramLink = useCallback((url: string) => {
    if (state.isTelegram) {
      WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [state.isTelegram]);

  const showPopup = useCallback((params: {
    title?: string;
    message: string;
    buttons?: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }>;
  }): Promise<string> => {
    return new Promise((resolve) => {
      if (state.isTelegram) {
        // Convert to Telegram's expected format
        const popupParams = {
          title: params.title,
          message: params.message,
          buttons: params.buttons?.map(btn => {
            if (btn.type === 'ok' || btn.type === 'close' || btn.type === 'cancel') {
              return { id: btn.id, type: btn.type };
            }
            return { id: btn.id, type: btn.type || 'default' as const, text: btn.text || '' };
          }),
        };
        WebApp.showPopup(popupParams as Parameters<typeof WebApp.showPopup>[0], (buttonId) => {
          resolve(buttonId || '');
        });
      } else {
        // Fallback for non-Telegram
        const result = window.confirm(params.message);
        resolve(result ? 'ok' : 'cancel');
      }
    });
  }, [state.isTelegram]);

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      if (state.isTelegram) {
        WebApp.showAlert(message, () => resolve());
      } else {
        window.alert(message);
        resolve();
      }
    });
  }, [state.isTelegram]);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (state.isTelegram) {
        WebApp.showConfirm(message, (confirmed) => resolve(confirmed));
      } else {
        resolve(window.confirm(message));
      }
    });
  }, [state.isTelegram]);

  const setHeaderColor = useCallback((color: 'bg_color' | 'secondary_bg_color' | `#${string}`) => {
    if (state.isTelegram) {
      WebApp.setHeaderColor(color);
    }
  }, [state.isTelegram]);

  const setBackgroundColor = useCallback((color: 'bg_color' | 'secondary_bg_color' | `#${string}`) => {
    if (state.isTelegram) {
      WebApp.setBackgroundColor(color);
    }
  }, [state.isTelegram]);

  const enableClosingConfirmation = useCallback(() => {
    if (state.isTelegram) {
      WebApp.enableClosingConfirmation();
    }
  }, [state.isTelegram]);

  const disableClosingConfirmation = useCallback(() => {
    if (state.isTelegram) {
      WebApp.disableClosingConfirmation();
    }
  }, [state.isTelegram]);

  const readTextFromClipboard = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (state.isTelegram) {
        WebApp.readTextFromClipboard((text) => resolve(text));
      } else {
        navigator.clipboard.readText().then(resolve).catch(() => resolve(null));
      }
    });
  }, [state.isTelegram]);

  const requestWriteAccess = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (state.isTelegram) {
        WebApp.requestWriteAccess((granted) => resolve(granted));
      } else {
        resolve(false);
      }
    });
  }, [state.isTelegram]);

  const requestContact = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (state.isTelegram) {
        WebApp.requestContact((sent) => resolve(sent));
      } else {
        resolve(false);
      }
    });
  }, [state.isTelegram]);

  const switchInlineQuery = useCallback((query: string, choose_chat_types?: Array<'users' | 'bots' | 'groups' | 'channels'>) => {
    if (state.isTelegram) {
      WebApp.switchInlineQuery(query, choose_chat_types);
    }
  }, [state.isTelegram]);

  return {
    ...state,
    hapticFeedback,
    backButton,
    mainButton,
    close,
    expand,
    openLink,
    openTelegramLink,
    showPopup,
    showAlert,
    showConfirm,
    setHeaderColor,
    setBackgroundColor,
    enableClosingConfirmation,
    disableClosingConfirmation,
    readTextFromClipboard,
    requestWriteAccess,
    requestContact,
    switchInlineQuery,
  };
}
