import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const BusinessBadge = ({ size = 'sm', className, showLabel = false }: BusinessBadgeProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20',
          className
        )}
        title="Verified Business Account"
      >
        <Briefcase className={cn('text-blue-500', sizeClasses[size])} />
        <span className="text-xs font-medium text-blue-500">Business</span>
      </div>
    );
  }

  // Don't show the briefcase icon inline next to names
  return null;
};