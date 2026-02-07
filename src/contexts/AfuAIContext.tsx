import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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

  const openAfuAI = useCallback(() => setIsOpen(true), []);
  const closeAfuAI = useCallback(() => setIsOpen(false), []);

  return (
    <AfuAIContext.Provider value={{ isOpen, openAfuAI, closeAfuAI }}>
      {children}
    </AfuAIContext.Provider>
  );
};
