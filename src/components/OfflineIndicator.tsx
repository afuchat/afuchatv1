import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import usePWA from '@/hooks/usePWA';

export const OfflineIndicator = () => {
  const { isOnline, swUpdateAvailable, updateServiceWorker, isStandalone } = usePWA();
  const [showOfflineAlert, setShowOfflineAlert] = useState(!navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineAlert(true);
      setShowOnlineToast(false);
      // Hide offline alert after 5 seconds
      const offlineTimer = setTimeout(() => setShowOfflineAlert(false), 5000);
      return () => clearTimeout(offlineTimer);
    } else if (showOfflineAlert) {
      // User just came back online
      setShowOfflineAlert(false);
      setShowOnlineToast(true);
      // Hide online toast after 3 seconds
      const timer = setTimeout(() => setShowOnlineToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showOfflineAlert]);

  useEffect(() => {
    if (swUpdateAvailable) {
      setShowUpdateBanner(true);
    }
  }, [swUpdateAvailable]);

  const handleUpdate = () => {
    updateServiceWorker();
    setShowUpdateBanner(false);
  };

  return (
    <>
      {/* Offline Alert */}
      <AnimatePresence>
        {showOfflineAlert && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 shadow-lg"
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <WifiOff className="h-5 w-5" />
              </motion.div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="text-sm font-semibold">You're Offline</span>
                <span className="text-xs opacity-80">
                  {isStandalone 
                    ? "Using cached data - app works offline!" 
                    : "Limited functionality available"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Online Toast */}
      <AnimatePresence>
        {showOnlineToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white shadow-lg"
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3">
              <Wifi className="h-5 w-5" />
              <span className="text-sm font-semibold">Back Online!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Update Banner */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg"
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                <span className="text-sm font-semibold">New version available!</span>
              </div>
              <button
                onClick={handleUpdate}
                className="px-3 py-1 bg-primary-foreground text-primary rounded text-sm font-medium"
              >
                Update
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
