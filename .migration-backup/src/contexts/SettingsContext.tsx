import { createContext, useContext, useState, ReactNode } from 'react';

type SettingsTab = 'account' | 'security' | 'notifications' | 'data' | 'appearance' | 'blocked' | '2fa' | 'activity';

interface SettingsContextType {
  isOpen: boolean;
  activeTab: SettingsTab;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  setActiveTab: (tab: SettingsTab) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  const openSettings = (tab: SettingsTab = 'account') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const closeSettings = () => {
    setIsOpen(false);
  };

  return (
    <SettingsContext.Provider value={{ isOpen, activeTab, openSettings, closeSettings, setActiveTab }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
