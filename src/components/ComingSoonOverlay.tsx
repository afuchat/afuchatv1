import { Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ComingSoonOverlayProps {
  title?: string;
  message?: string;
  onBack?: () => void;
}

export const ComingSoonOverlay = ({ 
  title = "Coming Soon", 
  message = "This feature is currently under development. Stay tuned!",
  onBack
}: ComingSoonOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6">
      <motion.div 
        className="text-center max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
          animate={{ 
            rotate: [0, 5, -5, 0],
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="h-10 w-10 text-primary" />
        </motion.div>
        
        <h1 className="text-2xl font-bold text-foreground mb-3 flex items-center justify-center gap-2">
          <Clock className="h-6 w-6" />
          {title}
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {message}
        </p>
        
        {onBack && (
          <Button onClick={onBack} variant="outline">
            Go Back
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default ComingSoonOverlay;
