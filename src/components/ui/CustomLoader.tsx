import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

// Skeleton-only loader (replaces all dot/spinner loaders app-wide)
export const CustomLoader = ({ size = 'md', className, text }: CustomLoaderProps) => {
  const widths = {
    sm: 'w-24',
    md: 'w-40',
    lg: 'w-56',
  };

  const heights = {
    sm: 'h-2.5',
    md: 'h-3',
    lg: 'h-3.5',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="flex flex-col items-center gap-2">
        <Skeleton className={cn(widths[size], heights[size], 'rounded-full')} />
        <Skeleton className={cn(widths[size], heights[size], 'rounded-full opacity-80')} />
        <Skeleton className={cn('w-20', heights[size], 'rounded-full opacity-60')} />
      </div>

      {text ? (
        <motion.p
          className="text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          {text}
        </motion.p>
      ) : null}
    </div>
  );
};

// Full page loader - for initial page loads
export const PageLoader = ({ text = 'Loading...' }: { text?: string }) => {
  return (
    <motion.div
      className="flex min-h-screen items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <CustomLoader size="lg" text={text} />
    </motion.div>
  );
};

// Inline loader - for sections/cards
export const InlineLoader = ({ text, className }: { text?: string; className?: string }) => {
  return (
    <motion.div
      className={cn('flex items-center justify-center py-8', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <CustomLoader size="md" text={text} />
    </motion.div>
  );
};

// Card loader - for loading content within cards
export const CardLoader = ({ className }: { className?: string }) => {
  return (
    <motion.div
      className={cn('flex items-center justify-center min-h-[120px]', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <CustomLoader size="sm" />
    </motion.div>
  );
};

// List loader - for loading lists
export const ListLoader = ({ className }: { rows?: number; className?: string }) => {
  return (
    <motion.div
      className={cn('flex flex-col items-center justify-center py-12', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <CustomLoader size="md" />
    </motion.div>
  );
};

// Button loader - for buttons (skeleton pulse)
export const ButtonLoader = ({ className }: { className?: string }) => {
  return <Skeleton className={cn('h-4 w-10 rounded-full', className)} />;
};

// Section loader
export const SectionLoader = ({ className, text }: { className?: string; text?: string }) => {
  return (
    <motion.div
      className={cn('flex items-center justify-center py-16', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <CustomLoader size="md" text={text} />
    </motion.div>
  );
};

