import { Github } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DeveloperBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const DeveloperBadge = ({ size = 'md', showTooltip = true }: DeveloperBadgeProps) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const containerClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const badge = (
    <div 
      className={`${containerClasses[size]} rounded-full bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-1 ring-gray-600/50 shadow-sm`}
    >
      <Github className={`${sizeClasses[size]} text-white`} />
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">AfuChat Developer</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DeveloperBadge;
