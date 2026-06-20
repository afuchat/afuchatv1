import { AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface WarningBadgeProps {
  className?: string;
  showText?: boolean;
  reason?: string | null;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'profile' | 'post';
}

export function WarningBadge({ className = '', showText = false, reason, size = 'md', variant = 'inline' }: WarningBadgeProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  
  // Profile variant - TikTok style bold warning under name
  if (variant === 'profile') {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
          <AlertTriangle className="h-4 w-4 text-red-500 fill-red-500/20" />
          <span className="text-red-500 font-bold text-sm">Account Warning</span>
        </div>
        {reason && (
          <p className="text-xs text-muted-foreground text-center max-w-[250px] mt-1">
            {reason}
          </p>
        )}
      </div>
    );
  }

  // Post variant - clickable warning badge with popover
  if (variant === 'post') {
    const shortReason = reason 
      ? reason.length > 50 ? reason.substring(0, 50) + '...' : reason
      : 'Community guidelines violation';
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className={`inline-flex items-center gap-1 bg-red-500/15 text-red-500 font-bold px-1.5 py-0.5 rounded flex-shrink-0 cursor-pointer hover:bg-red-500/25 transition-colors ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle className={`${iconSize} text-red-500 fill-red-500/30`} />
            <span className={`${textSize} font-bold`}>⚠ Warned</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="max-w-[280px] bg-red-500/10 border-red-500/30 p-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-bold text-red-500">⚠️ Account Warning</p>
          <p className="text-xs mt-1 text-foreground">{shortReason}</p>
        </PopoverContent>
      </Popover>
    );
  }

  // Default inline variant - clickable with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className={`inline-flex items-center gap-1 bg-red-500/15 text-red-500 font-bold px-1.5 py-0.5 rounded flex-shrink-0 cursor-pointer hover:bg-red-500/25 transition-colors ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <AlertTriangle className={`${iconSize} text-red-500 fill-red-500/30`} />
          {showText && <span className={`${textSize} font-bold`}>Warned</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[250px] bg-red-500/10 border-red-500/30 p-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-bold text-red-500">⚠️ Account Warning</p>
        <p className="text-xs mt-1 text-foreground">
          {reason || 'This account has been warned for violating community guidelines.'}
        </p>
      </PopoverContent>
    </Popover>
  );
}
