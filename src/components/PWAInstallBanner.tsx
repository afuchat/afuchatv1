import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const PWAInstallBanner = () => {
  const { isInstallable, isInstalled, isStandalone, install, isIOS } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const timer = setTimeout(() => {
      if (!isInstalled && !isStandalone) {
        setShowBanner(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstalled, isStandalone]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setShowBanner(false);
        toast.success('AfuChat installed successfully!');
      }
    } else if (isIOS) {
      toast.info(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Install AfuChat on iOS</span>
          <span className="text-sm">Tap <Share className="inline h-4 w-4" /> then "Add to Home Screen"</span>
        </div>,
        { duration: 5000 }
      );
    } else {
      toast.info('Use your browser menu to install AfuChat');
    }
  };

  if (isInstalled || isStandalone || isDismissed || !showBanner) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
      >
        <div className="bg-gradient-to-r from-primary to-accent p-3">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  Install AfuChat
                </p>
                <p className="text-white/80 text-xs truncate">
                  Get the full app experience
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-white text-primary hover:bg-white/90 h-8 px-3"
              >
                <Download className="h-4 w-4 mr-1" />
                Install
              </Button>
              
              <Button
                onClick={handleDismiss}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
