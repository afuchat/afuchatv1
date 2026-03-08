import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, LucideIcon, Crown } from 'lucide-react';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection = ({ title, children, className }: SettingsSectionProps) => (
  <div className={cn("mb-6", className)}>
    {title && (
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
        {title}
      </p>
    )}
    <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
      {children}
    </div>
  </div>
);

interface SettingsRowProps {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  description?: string;
  value?: React.ReactNode;
  toggle?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onClick?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  premium?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  children?: React.ReactNode;
}

export const SettingsRow = ({
  icon: Icon,
  iconColor = 'bg-muted',
  label,
  description,
  value,
  toggle,
  checked,
  onCheckedChange,
  onClick,
  chevron,
  disabled,
  premium,
  destructive,
  isLast,
  children,
}: SettingsRowProps) => {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <div className={cn(!isLast && "border-b border-border/40")}>
      <Wrapper
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          onClick && "hover:bg-muted/40 active:bg-muted/60",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {Icon && (
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", iconColor)}>
            <Icon className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "font-semibold text-sm",
              destructive && "text-destructive"
            )}>{label}</p>
            {premium && (
              <span className="flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                <Crown className="h-2.5 w-2.5" />
                PRO
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        {value && <div className="flex-shrink-0 text-sm text-muted-foreground">{value}</div>}
        {toggle && (
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            className="flex-shrink-0"
          />
        )}
        {chevron && <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />}
      </Wrapper>
      {children && (
        <div className="px-4 pb-3.5">
          {children}
        </div>
      )}
    </div>
  );
};

interface SettingsInfoBoxProps {
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const SettingsInfoBox = ({ variant = 'default', icon: Icon, children, className }: SettingsInfoBoxProps) => {
  const variantStyles = {
    default: 'bg-muted/40 text-muted-foreground',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className={cn("flex items-start gap-2.5 p-3.5 rounded-xl text-sm", variantStyles[variant], className)}>
      {Icon && <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
};

interface SettingsStatCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string | number;
}

export const SettingsStatCard = ({ icon: Icon, iconColor, label, value }: SettingsStatCardProps) => (
  <div className="rounded-2xl bg-card shadow-soft p-4 flex items-center gap-3">
    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconColor)}>
      <Icon className="h-5 w-5 text-primary-foreground" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  </div>
);
