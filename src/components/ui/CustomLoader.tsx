import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.svg';

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

export const CustomLoader = ({ size = 'md', className, text }: CustomLoaderProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <img
        src={logoIcon}
        alt="Loading"
        className={cn(sizeMap[size], 'object-contain animate-spin')}
        style={{ animationDuration: '1.2s' }}
      />
      {text && (
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
      )}
    </div>
  );
};

export const PageLoader = ({ text }: { text?: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <CustomLoader size="lg" text={text} />
  </div>
);

export const InlineLoader = ({ text, className }: { text?: string; className?: string }) => (
  <div className={cn('flex items-center justify-center py-8', className)}>
    <CustomLoader size="md" text={text} />
  </div>
);

export const CardLoader = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center justify-center min-h-[120px]', className)}>
    <CustomLoader size="sm" />
  </div>
);

export const ListLoader = ({ className }: { rows?: number; className?: string }) => (
  <div className={cn('flex flex-col items-center justify-center py-12', className)}>
    <CustomLoader size="md" />
  </div>
);

export const ButtonLoader = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center justify-center', className)}>
    <img
      src={logoIcon}
      alt=""
      className="h-4 w-4 object-contain animate-spin"
      style={{ animationDuration: '1.2s' }}
    />
  </div>
);

export const SectionLoader = ({ className, text }: { className?: string; text?: string }) => (
  <div className={cn('flex items-center justify-center py-16', className)}>
    <CustomLoader size="md" text={text} />
  </div>
);
