// Recent apps tracking utilities

const RECENT_APPS_KEY = 'afuchat_recent_apps';
const MAX_RECENT_APPS = 8;

export interface RecentApp {
  id: string;
  name: string;
  icon?: string;
  isBuiltIn: boolean;
  lastUsed: number;
  route?: string;
  url?: string;
}

export const getRecentApps = (): RecentApp[] => {
  try {
    const stored = localStorage.getItem(RECENT_APPS_KEY);
    if (stored) {
      const apps = JSON.parse(stored) as RecentApp[];
      // Sort by last used, most recent first
      return apps.sort((a, b) => b.lastUsed - a.lastUsed);
    }
  } catch (e) {
    console.error('Error reading recent apps:', e);
  }
  return [];
};

export const addRecentApp = (app: Omit<RecentApp, 'lastUsed'>) => {
  try {
    const apps = getRecentApps();
    
    // Remove if already exists
    const filtered = apps.filter(a => a.id !== app.id);
    
    // Add to front with current timestamp
    const updated: RecentApp[] = [
      { ...app, lastUsed: Date.now() },
      ...filtered
    ].slice(0, MAX_RECENT_APPS);
    
    localStorage.setItem(RECENT_APPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving recent app:', e);
  }
};

export const hasUsedApp = (appId: string): boolean => {
  const apps = getRecentApps();
  return apps.some(a => a.id === appId);
};
