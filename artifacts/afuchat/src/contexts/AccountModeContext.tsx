import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type AccountMode = 'personal' | 'business';

interface AccountModeContextType {
  mode: AccountMode;
  setMode: (mode: AccountMode) => void;
  canUseBusiness: boolean;
  loading: boolean;
}

const AccountModeContext = React.createContext<AccountModeContextType>({
  mode: 'personal',
  setMode: () => {},
  canUseBusiness: false,
  loading: true,
});

export const useAccountMode = () => {
  const context = React.useContext(AccountModeContext);
  if (!context) {
    throw new Error('useAccountMode must be used within AccountModeProvider');
  }
  return context;
};

export function AccountModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = React.useState<AccountMode>('personal');
  const [canUseBusiness, setCanUseBusiness] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkBusinessAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_business_mode')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setCanUseBusiness(data.is_business_mode);
          // Restore saved mode from localStorage if available
          const savedMode = localStorage.getItem('accountMode') as AccountMode;
          if (savedMode === 'business' && data.is_business_mode) {
            setModeState('business');
          }
        }
      } catch (error) {
        console.error('Error checking business access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBusinessAccess();
  }, [user]);

  const setMode = React.useCallback((newMode: AccountMode) => {
    if (newMode === 'business' && !canUseBusiness) {
      return; // Don't allow switching to business if not enabled
    }
    setModeState(newMode);
    localStorage.setItem('accountMode', newMode);
  }, [canUseBusiness]);

  return (
    <AccountModeContext.Provider value={{ mode, setMode, canUseBusiness, loading }}>
      {children}
    </AccountModeContext.Provider>
  );
}
