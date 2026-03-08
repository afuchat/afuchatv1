import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface AfuAIContextType {
  isOpen: boolean;
  openAfuAI: () => void;
  closeAfuAI: () => void;
}

const AfuAIContext = createContext<AfuAIContextType>({
  isOpen: false,
  openAfuAI: () => {},
  closeAfuAI: () => {},
});

export const useAfuAI = () => useContext(AfuAIContext);

export const AfuAIProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const openAfuAI = useCallback(() => {
    if (isMobile) {
      // On mobile, navigate to the AfuAI page
      navigate('/afuai');
    } else {
      // On desktop, open as a side panel
      setIsOpen(true);
    }
  }, [isMobile, navigate]);

  const closeAfuAI = useCallback(() => setIsOpen(false), []);

  return (
    <AfuAIContext.Provider value={{ isOpen, openAfuAI, closeAfuAI }}>
      {children}
    </AfuAIContext.Provider>
  );
};