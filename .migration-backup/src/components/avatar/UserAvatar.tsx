import { memo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

interface UserAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  isBusiness?: boolean;
  enableLightbox?: boolean;
}

export const UserAvatar = memo(({ userId, avatarUrl, name, size = 40, className = '', isBusiness = false, enableLightbox = false }: UserAvatarProps) => {
  const [showLightbox, setShowLightbox] = useState(false);

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleClick = (e: React.MouseEvent) => {
    if (enableLightbox && avatarUrl) {
      e.stopPropagation();
      setShowLightbox(true);
    }
  };

  return (
    <>
      <Avatar 
        style={{ width: size, height: size }} 
        className={cn(
          className,
          isBusiness && 'rounded-lg',
          enableLightbox && avatarUrl && 'cursor-pointer'
        )}
        onClick={handleClick}
      >
        <AvatarImage 
          src={avatarUrl || undefined} 
          alt={name}
          loading="lazy"
          className={cn(isBusiness && 'rounded-lg')}
        />
        <AvatarFallback className={cn(isBusiness && 'rounded-lg')}>{initials}</AvatarFallback>
      </Avatar>
      {showLightbox && avatarUrl && (
        <ImageLightbox
          images={[{ url: avatarUrl, alt: `${name}'s profile picture` }]}
          initialIndex={0}
          onClose={() => setShowLightbox(false)}
          senderName={name}
        />
      )}
    </>
  );
});