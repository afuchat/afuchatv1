import { useState, useEffect } from 'react';
import { useGiftImageFromCache } from '@/hooks/useGiftImageCache';
import { motion } from 'framer-motion';

interface GiftImageProps {
  giftId: string;
  giftName: string;
  emoji: string;
  rarity: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const GiftImage = ({ 
  giftId,
  giftName,
  emoji,
  rarity,
  size = 'md',
  className = '' 
}: GiftImageProps) => {
  const { imageUrl } = useGiftImageFromCache(giftId, giftName, emoji, rarity);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  const emojiSizes = {
    xs: 'text-xl',
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
    xl: 'text-9xl'
  };

  const sizeClass = sizeClasses[size];
  const emojiSize = emojiSizes[size];

  // No loading state - show emoji as placeholder until image loads
  if (!imageUrl || imgError) {
    return (
      <div className={`${sizeClass} ${className} flex items-center justify-center`}>
        <span className={`drop-shadow-lg ${emojiSize}`}>{emoji}</span>
      </div>
    );
  }

  return (
    <motion.div 
      className={`${sizeClass} ${className} flex items-center justify-center relative`}
      style={{ perspective: '1000px' }}
    >
      {/* Show emoji while image loads */}
      {!imgLoaded && (
        <span className={`drop-shadow-lg ${emojiSize} absolute`}>{emoji}</span>
      )}
      <motion.img 
        src={imageUrl} 
        alt={giftName}
        className={`${sizeClass} object-contain drop-shadow-lg ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ transformStyle: 'preserve-3d' }}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
        initial={false}
        animate={{ 
          y: imgLoaded ? [0, -5, 0] : 0 
        }}
        transition={{ 
          y: {
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }
        }}
        whileHover={{ 
          scale: 1.2,
          rotateX: 15,
          rotateZ: 5,
          transition: { type: 'spring', stiffness: 400, damping: 10 }
        }}
      />
    </motion.div>
  );
};
