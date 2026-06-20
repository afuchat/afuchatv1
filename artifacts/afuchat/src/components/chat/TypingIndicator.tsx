import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  userName?: string;
}

export const TypingIndicator = ({ userName }: TypingIndicatorProps) => {
  return (
    <div className="flex items-end gap-2 mb-2">
      {userName && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
          {userName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="bg-card rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-muted-foreground/60 rounded-full"
              animate={{
                y: [0, -6, 0],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
