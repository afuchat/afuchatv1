import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Games = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to mini programs with games filter
    navigate('/mini-programs', { replace: true });
  }, [navigate]);

  return null;
};

export default Games;
