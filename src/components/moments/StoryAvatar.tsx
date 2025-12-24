import { memo, useCallback, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserStories } from '@/hooks/useUserStories';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

interface StoryAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStoryRing?: boolean;
  onClick?: () => void;
  isBusiness?: boolean;
  enableLightbox?: boolean;
}

const sizeMap = {
  sm: 'h-6 w-6 sm:h-7 sm:w-7',
  md: 'h-8 w-8 sm:h-10 sm:w-10',
  lg: 'h-12 w-12',
  xl: 'h-20 w-20 sm:h-28 sm:w-28'
};

const ringMap = {
  sm: 'p-[1.5px]',
  md: 'p-[2px]',
  lg: 'p-[2px]',
  xl: 'p-[2.5px]'
};

export const StoryAvatar = memo(({
  userId,
  avatarUrl,
  name,
  size = 'md',
  className = '',
  showStoryRing = true,
  onClick,
  isBusiness = false,
  enableLightbox = false
}: StoryAvatarProps) => {
  const { hasActiveStories } = useUserStories(userId);
  const navigate = useNavigate();
  const [showLightbox, setShowLightbox] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onClick) {
      onClick();
      return;
    }

    // If stories are active and ring is shown, navigate to stories
    if (hasActiveStories && showStoryRing) {
      e.stopPropagation();
      navigate(`/moments?user=${userId}`);
      return;
    }

    // If lightbox is enabled and we have an avatar, show it
    if (enableLightbox && avatarUrl) {
      e.stopPropagation();
      setShowLightbox(true);
    }
  }, [onClick, hasActiveStories, showStoryRing, navigate, userId, enableLightbox, avatarUrl]);

  const initials = name?.substring(0, 2).toUpperCase() || '';

  // Business accounts get rounded-lg (square with rounded corners)
  const shapeClass = isBusiness ? 'rounded-lg' : 'rounded-full';

  const avatarContent = (
    <Avatar className={cn(sizeMap[size], 'flex-shrink-0', isBusiness && 'rounded-lg', enableLightbox && avatarUrl && 'cursor-pointer')}>
      <AvatarImage 
        src={avatarUrl || undefined} 
        alt={name}
        loading="lazy"
        className={cn(isBusiness && 'rounded-lg')}
      />
      <AvatarFallback className={cn(
        size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base',
        isBusiness && 'rounded-lg'
      )}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const content = hasActiveStories && showStoryRing ? (
    <div
      className={cn(
        'bg-gradient-to-tr from-cyan-400 to-teal-500 cursor-pointer transition-all duration-200 hover:scale-105',
        isBusiness ? 'rounded-lg' : 'rounded-full',
        ringMap[size],
        className
      )}
      onClick={handleClick}
    >
      {avatarContent}
    </div>
  ) : (
    <div className={className} onClick={handleClick}>
      {avatarContent}
    </div>
  );

  return (
    <>
      {content}
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
