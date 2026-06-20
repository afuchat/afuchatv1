import { User, Building2 } from 'lucide-react';
import { useAccountMode } from '@/contexts/AccountModeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const AccountModeSwitcher = () => {
  const { mode, setMode, canUseBusiness } = useAccountMode();

  if (!canUseBusiness) {
    return null; // Don't show switcher if user can't use business mode
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMode('personal')}
        className={cn(
          "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          mode === 'personal' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        <User className="h-4 w-4 mr-1.5" />
        Personal
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMode('business')}
        className={cn(
          "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          mode === 'business' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        <Building2 className="h-4 w-4 mr-1.5" />
        Business
      </Button>
    </div>
  );
};
