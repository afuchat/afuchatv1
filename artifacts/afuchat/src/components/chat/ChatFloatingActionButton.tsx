import { useState } from 'react';
import { MessageCirclePlus, Users, X, Pencil, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatFabAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface ChatFloatingActionButtonProps {
  onNewChat: () => void;
  onCreateGroup: () => void;
  onCreateChannel?: () => void;
  isVisible?: boolean;
}

const ChatFloatingActionButton = ({ 
  onNewChat, 
  onCreateGroup,
  onCreateChannel,
  isVisible = true 
}: ChatFloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionClick = (action: () => void) => {
    setIsOpen(false);
    setTimeout(action, 100);
  };

  const actions: ChatFabAction[] = [
    {
      icon: <MessageCirclePlus className="h-5 w-5" />,
      label: 'New Chat',
      onClick: () => handleActionClick(onNewChat),
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'New Group',
      onClick: () => handleActionClick(onCreateGroup),
    },
    ...(onCreateChannel ? [{
      icon: <Radio className="h-5 w-5" />,
      label: 'New Channel',
      onClick: () => handleActionClick(onCreateChannel),
    }] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className={cn(
        "fixed bottom-20 right-4 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      )}>
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* Main FAB Button */
            <motion.button
              key="fab-closed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative h-14 w-14 rounded-2xl",
                "bg-gradient-to-br from-primary via-primary to-accent",
                "text-primary-foreground shadow-xl",
                "flex items-center justify-center",
                "before:absolute before:inset-0 before:rounded-2xl",
                "before:bg-gradient-to-t before:from-transparent before:to-white/20",
                "after:absolute after:inset-0 after:rounded-2xl",
                "after:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]",
                "overflow-hidden"
              )}
              onClick={() => setIsOpen(true)}
            >
              <Pencil className="h-6 w-6 relative z-10" />
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shine_3s_ease-in-out_infinite]" />
            </motion.button>
          ) : (
            /* Action Menu */
            <motion.div
              key="fab-open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-end gap-3"
            >
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    y: 0,
                    transition: { 
                      delay: index * 0.08,
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: 20,
                    transition: { duration: 0.15 }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.onClick}
                  className="flex items-center gap-3 group"
                >
                  {/* Label pill */}
                  <span className={cn(
                    "text-sm font-semibold px-4 py-2 rounded-xl",
                    "bg-card/95 backdrop-blur-xl text-foreground",
                    "shadow-lg border border-border/50",
                    "group-hover:bg-card group-hover:border-primary/30",
                    "transition-all duration-200"
                  )}>
                    {action.label}
                  </span>
                  
                  {/* Icon button */}
                  <div className={cn(
                    "h-12 w-12 rounded-xl",
                    "bg-gradient-to-br from-primary to-accent",
                    "text-primary-foreground shadow-lg",
                    "flex items-center justify-center",
                    "group-hover:shadow-xl group-hover:shadow-primary/25",
                    "transition-all duration-200"
                  )}>
                    {action.icon}
                  </div>
                </motion.button>
              ))}
              
              {/* Close button */}
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ 
                  opacity: 1, 
                  rotate: 0,
                  transition: { 
                    delay: actions.length * 0.08,
                    type: "spring",
                    stiffness: 400,
                    damping: 25
                  }
                }}
                exit={{ opacity: 0, rotate: 90 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "h-14 w-14 rounded-2xl mt-2",
                  "bg-muted/90 backdrop-blur-sm",
                  "text-muted-foreground shadow-lg",
                  "flex items-center justify-center",
                  "border border-border/50",
                  "hover:bg-muted hover:text-foreground",
                  "transition-colors duration-200"
                )}
                onClick={() => setIsOpen(false)}
              >
                <X className="h-6 w-6" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default ChatFloatingActionButton;
