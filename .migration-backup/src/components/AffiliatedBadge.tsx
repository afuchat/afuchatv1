import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AffiliatedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showLabel?: boolean;
}

export const AffiliatedBadge = ({ size = 'sm', className, onClick, showLabel = false }: AffiliatedBadgeProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (showLabel) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 font-medium text-primary hover:bg-primary/20 transition-colors text-xs',
          className
        )}
        title="Business Affiliate - Click for details"
      >
        <Building2 className={sizeClasses[size]} />
        Affiliated
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn('text-primary ml-0.5 flex-shrink-0 hover:opacity-80 transition-opacity', className)}
      title="Business Affiliate - Click for details"
    >
      <Building2 className={sizeClasses[size]} />
    </button>
  );
};