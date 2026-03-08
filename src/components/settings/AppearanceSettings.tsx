import { Sun, Moon, Monitor, Type, Layout } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsUI';
import { cn } from '@/lib/utils';

export const AppearanceSettings = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun, description: 'Bright and clean', color: 'bg-amber-500' },
    { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Easy on the eyes', color: 'bg-slate-700' },
    { value: 'system' as const, label: 'System', icon: Monitor, description: 'Follows device', color: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-0">
      <SettingsSection title="Theme">
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200",
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                    isActive ? option.color : "bg-muted"
                  )}>
                    <Icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  </div>
                  <div className="text-center">
                    <p className={cn("text-sm font-semibold", isActive && "text-primary")}>{option.label}</p>
                    <p className="text-[10px] text-muted-foreground">{option.description}</p>
                  </div>
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Text & Display">
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-purple-500 flex items-center justify-center">
                <Type className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Font Size</p>
                <p className="text-xs text-muted-foreground">Adjust text size</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs">A</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-sm">A</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-base">A</Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Layout">
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-cyan-500 flex items-center justify-center">
                <Layout className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Compact Mode</p>
                <p className="text-xs text-muted-foreground">Show more content with reduced spacing</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-full">Soon</span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};
