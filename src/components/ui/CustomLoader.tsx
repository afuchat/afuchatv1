import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.png';

interface CustomLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeMap = {
  sm: { container: 'h-8 w-8', ring: 'h-8 w-8 border-[2.5px]' },
  md: { container: 'h-12 w-12', ring: 'h-12 w-12 border-[3px]' },
  lg: { container: 'h-16 w-16', ring: 'h-16 w-16 border-[3.5px]' },
};

// Spinning logo loader with CSS fallback ring
export const CustomLoader = ({ size = 'md', className, text }: CustomLoaderProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('relative', sizeMap[size].container)}>
        {/* CSS ring spinner (always visible immediately) */}
        <div
          className={cn(
            sizeMap[size].ring,
            'absolute inset-0 rounded-full border-primary/20 border-t-primary animate-spin'
          )}
        />
        {/* Logo image on top */}
        <img
          src={logoIcon}
          alt=""
          className={cn('absolute inset-1 object-contain rounded-full animate-spin')}
          style={{ animationDuration: '1.2s' }}
        />
      </div>
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
      <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin" />
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
