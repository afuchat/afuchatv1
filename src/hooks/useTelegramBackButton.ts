import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegramOptional } from '@/contexts/TelegramContext';

/**
 * Hook that manages the Telegram Mini App back button.
 * Shows the back button when not on the home page and handles navigation.
 */
export function useTelegramBackButton() {
  const telegram = useTelegramOptional();
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleBackClick = useCallback(() => {
    // Provide haptic feedback
    telegram?.hapticFeedback.impactOccurred('light');
    
    // Navigate back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate, telegram]);

  useEffect(() => {
    if (!telegram?.isTelegram) return;
    
    // Determine if we should show the back button
    const isHomePage = location.pathname === '/' || location.pathname === '/home';
    
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
      if (telegram?.isTelegram) {
        telegram.backButton.offClick(handleBackClick);
      }
    };
  }, [telegram, location.pathname, handleBackClick]);
  
  return {
    show: () => telegram?.backButton.show(),
    hide: () => telegram?.backButton.hide(),
    isVisible: telegram?.isTelegram && location.pathname !== '/' && location.pathname !== '/home',
  };
}
