/**
 * Simple utility to check if app is running in Telegram Mini App context
 * This can be used without needing the full TelegramProvider context
 */
export function useIsTelegram(): boolean {
  // Check if Telegram class is present on html element
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('telegram-mini-app');
  }
  return false;
}

/**
 * Synchronous check for Telegram environment
 * Useful for conditional logic outside of React components
 */
export function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for Telegram WebApp SDK
    const WebApp = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
    return Boolean(WebApp?.initData && WebApp.initData.length > 0);
  } catch {
    return false;
  }
}
