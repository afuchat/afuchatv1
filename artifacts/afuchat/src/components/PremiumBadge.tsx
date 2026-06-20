import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  className?: string;
  showText?: boolean;
}

export const PremiumBadge = ({ className, showText = true }: PremiumBadgeProps) => {
  return (
    <Badge 
      className={cn(
        "bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 gap-1",
        className
      )}
    >
      <Crown className="h-3 w-3" />
      {showText && 'Premium'}
    </Badge>
  );
};
