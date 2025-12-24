import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  isBusiness?: boolean;
}

export const UserAvatar = memo(({ userId, avatarUrl, name, size = 40, className = '', isBusiness = false }: UserAvatarProps) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar 
      style={{ width: size, height: size }} 
      className={cn(
        className,
        isBusiness && 'rounded-lg'
      )}
    >
      <AvatarImage 
        src={avatarUrl || undefined} 
        alt={name}
        loading="lazy"
        className={cn(isBusiness && 'rounded-lg')}
      />
      <AvatarFallback className={cn(isBusiness && 'rounded-lg')}>{initials}</AvatarFallback>
    </Avatar>
  );
});