import { useNavigate } from 'react-router-dom';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { useEffect } from 'react';

interface RequireBanCheckProps {
  children: React.ReactNode;
}

export function RequireBanCheck({ children }: RequireBanCheckProps) {
  const { loading, isBanned } = useProfileCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isBanned) {
      navigate('/banned', { replace: true });
    }
  }, [loading, isBanned, navigate]);

  if (loading) {
    return null;
  }

  if (isBanned) {
    return null;
  }

  return <>{children}</>;
}
