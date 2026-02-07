import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAfuAI } from '@/contexts/AfuAIContext';

const AfuAI = () => {
  const { openAfuAI } = useAfuAI();
  const navigate = useNavigate();

  useEffect(() => {
    openAfuAI();
    navigate('/', { replace: true });
  }, [openAfuAI, navigate]);

  return null;
};

export default AfuAI;
