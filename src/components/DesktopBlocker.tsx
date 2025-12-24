import { Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

export const DesktopBlocker = () => {
  return (
    <div className="fixed inset-0 bg-background z-[9999] flex items-center justify-center p-6">
      <motion.div 
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Smartphone className="h-12 w-12 text-primary" />
        </motion.div>
        
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Mobile Only App
        </h1>
        
        <p className="text-muted-foreground mb-6">
          AfuChat is designed exclusively for mobile devices. Please open this app on your smartphone or tablet to continue.
        </p>
        
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">
            Scan the QR code on your phone or visit <span className="font-medium text-foreground">afuchat.com</span> on your mobile browser
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DesktopBlocker;
