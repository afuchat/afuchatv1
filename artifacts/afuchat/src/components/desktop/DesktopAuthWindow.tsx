import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';

interface DesktopAuthWindowProps {
  children: ReactNode;
}

/**
 * On desktop: centers auth content in a clean, borderless container.
 * On mobile: renders children full-screen.
 */
const DesktopAuthWindow = ({ children }: DesktopAuthWindowProps) => {
  const isMobile = useIsMobile();

  if (isMobile) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default DesktopAuthWindow;
