import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get stored theme synchronously to prevent flash
const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem('afuchat-theme') as Theme;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage might not be available
  }
  return 'system';
};

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
};

// Apply theme to DOM immediately
const applyTheme = (resolved: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);

  // Update meta theme-color for status bar - Charcoal black theme
  const themeColor = resolved === 'dark' ? '#121212' : '#F9FAFB';
  const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor);
  }
};

// Initialize theme immediately on module load to prevent flash
const initialTheme = getStoredTheme();
const initialResolved = resolveTheme(initialTheme);
applyTheme(initialResolved);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(initialResolved);

  const updateTheme = useCallback((currentTheme: Theme) => {
    const resolved = resolveTheme(currentTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateTheme]);

  // Re-apply theme on mount to ensure consistency
  useEffect(() => {
    updateTheme(theme);
  }, [theme, updateTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem('afuchat-theme', newTheme);
    } catch {
      // localStorage might not be available
    }
    setThemeState(newTheme);
    updateTheme(newTheme);
  }, [updateTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}