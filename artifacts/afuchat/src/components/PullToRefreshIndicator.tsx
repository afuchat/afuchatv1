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
  const isVisible = pullDistance > 10 || isRefreshing || showSuccess;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-16 left-1/2 z-50 pointer-events-none"
          initial={{ opacity: 0, y: -30, x: '-50%' }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            x: '-50%',
          }}
          exit={{ opacity: 0, y: -30, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <motion.div
            className={`flex items-center justify-center h-10 w-10 rounded-full shadow-lg backdrop-blur-md border transition-all duration-200 ${
              showSuccess 
                ? 'bg-green-500/20 border-green-500/40' 
                : progress >= 1 || isRefreshing
                  ? 'bg-primary/20 border-primary/40' 
                  : 'bg-background/90 border-border/50'
            }`}
            animate={{
              scale: isRefreshing ? 1 : Math.max(0.8, Math.min(1, 0.8 + progress * 0.2)),
            }}
          >
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Check className="h-5 w-5 text-green-500" strokeWidth={3} />
                </motion.div>
              ) : isRefreshing ? (
                <motion.div
                  key="spinning"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                >
                  <RefreshCw className="h-5 w-5 text-primary" strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.div
                  key="pulling"
                  animate={{ rotate: progress * 180 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <RefreshCw 
                    className={`h-5 w-5 transition-colors duration-150 ${
                      progress >= 1 ? 'text-primary' : 'text-muted-foreground'
                    }`} 
                    strokeWidth={2.5} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
