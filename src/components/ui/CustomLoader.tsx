import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.png';

interface CustomLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

// Spinning logo loader — replaces all skeleton/dot loaders app-wide
export const CustomLoader = ({ size = 'md', className, text }: CustomLoaderProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <motion.img
        src={logoIcon}
        alt="Loading"
        className={cn(sizeMap[size], 'object-contain')}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
      {text && (
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
      )}
    </div>
  );
};

// Full page loader
export const PageLoader = ({ text }: { text?: string }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <CustomLoader size="lg" text={text} />
    </div>
  );
};

// Inline loader
export const InlineLoader = ({ text, className }: { text?: string; className?: string }) => {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <CustomLoader size="md" text={text} />
    </div>
  );
};

// Card loader
export const CardLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center justify-center min-h-[120px]', className)}>
      <CustomLoader size="sm" />
    </div>
  );
};

// List loader
export const ListLoader = ({ className }: { rows?: number; className?: string }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <CustomLoader size="md" />
    </div>
  );
};

// Button loader
export const ButtonLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <motion.img
        src={logoIcon}
        alt=""
        className="h-4 w-4 object-contain"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
};

// Section loader
export const SectionLoader = ({ className, text }: { className?: string; text?: string }) => {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <CustomLoader size="md" text={text} />
    </div>
  );
};
