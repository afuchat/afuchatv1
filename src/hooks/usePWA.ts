import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  install: () => Promise<boolean>;
}

// Store the prompt globally to persist across component remounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export const usePWA = (): PWAState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const promptCaptured = useRef(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore - iOS specific
      const iosStandalone = window.navigator.standalone === true;
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      // Check URL param that indicates PWA launch
      const isPWALaunch = window.location.search.includes('source=pwa');
      const installed = standalone || iosStandalone || isMinimalUI || isFullscreen || isPWALaunch;
      setIsStandalone(installed);
      setIsInstalled(installed);
    };
    
    checkInstalled();

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const android = /android/.test(userAgent);
    setIsIOS(iOS);
    setIsAndroid(android);

    // If we have a stored prompt, use it
    if (globalDeferredPrompt && !deferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
      console.log('Using stored install prompt');
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setDeferredPrompt(e);
      promptCaptured.current = true;
      console.log('PWA install prompt captured');
    };

    // Add listener if we haven't captured a prompt yet
    if (!promptCaptured.current && !globalDeferredPrompt) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setIsInstalled(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (e.matches) setIsInstalled(true);
    };
    
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [deferredPrompt]);

  const install = useCallback(async (): Promise<boolean> => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    
    if (!promptToUse) {
      console.log('No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      await promptToUse.prompt();
      
      // Wait for user choice
      const { outcome } = await promptToUse.userChoice;
      
      console.log('PWA install outcome:', outcome);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
        return true;
      }
    } catch (error) {
      console.error('PWA install error:', error);
    }
    
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!(deferredPrompt || globalDeferredPrompt) && !isInstalled,
    isInstalled,
    isIOS,
    isAndroid,
    isStandalone,
    install,
  };
};
