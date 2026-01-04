import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
  showSuccess?: boolean;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  progress,
  showSuccess = false,
}: PullToRefreshIndicatorProps) => {
  // Show pull indicator when pulling, or show banner when refreshing/success
  const isPulling = pullDistance > 0 && !isRefreshing;
  const showBanner = isRefreshing || showSuccess;
  
  return (
    <>
      {/* Pull indicator (shows while pulling) */}
      <AnimatePresence>
        {isPulling && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none pt-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              height: Math.max(pullDistance, 40),
            }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              opacity: { duration: 0.15 }
            }}
          >
            <motion.div
              className={`flex items-center justify-center h-11 w-11 rounded-full shadow-lg backdrop-blur-md border transition-colors duration-300 ${
                progress >= 1 
                  ? 'bg-primary/20 border-primary/40' 
                  : 'bg-background/80 border-border/50'
              }`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{
                scale: Math.max(0.7, Math.min(1, 0.7 + progress * 0.3)),
                opacity: 1,
                rotate: progress * 180,
              }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
            >
              <RefreshCw
                className={`h-5 w-5 transition-colors duration-200 ${
                  progress >= 1 ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={2.5}
              />
            </motion.div>
            
            {pullDistance > 30 && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`ml-3 text-xs font-medium transition-colors duration-200 ${
                  progress >= 1 ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh banner (shows during refresh - non-intrusive) */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            className="fixed top-[110px] left-1/2 z-50 pointer-events-none"
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 30,
            }}
          >
            <motion.div
              className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-colors duration-300 ${
                showSuccess 
                  ? 'bg-green-500/15 border-green-500/30' 
                  : 'bg-background/90 border-border/50'
              }`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Updated
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="refreshing"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    >
                      <RefreshCw className="h-4 w-4 text-primary" strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-xs font-medium text-foreground">
                      Refreshing...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
