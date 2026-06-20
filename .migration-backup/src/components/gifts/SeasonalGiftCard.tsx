import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';

interface SeasonalGiftCardProps {
  gift: {
    id: string;
    name: string;
    emoji: string;
    rarity: string;
    image_url?: string | null;
  };
  price: number;
  onClick: () => void;
  index?: number;
}

const getRarityGradient = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return 'from-amber-500/30 via-yellow-400/20 to-amber-600/30';
    case 'epic':
      return 'from-purple-500/30 via-violet-400/20 to-purple-600/30';
    case 'rare':
      return 'from-blue-500/30 via-cyan-400/20 to-blue-600/30';
    case 'uncommon':
      return 'from-green-500/30 via-emerald-400/20 to-green-600/30';
    default:
      return 'from-red-500/20 via-green-500/10 to-red-500/20';
  }
};

const getRarityBorder = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return 'border-amber-500/50 hover:border-amber-400';
    case 'epic':
      return 'border-purple-500/50 hover:border-purple-400';
    case 'rare':
      return 'border-blue-500/50 hover:border-blue-400';
    case 'uncommon':
      return 'border-green-500/50 hover:border-green-400';
    default:
      return 'border-red-500/30 hover:border-green-400/50';
  }
};

const getRarityShadow = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return 'shadow-[0_0_20px_rgba(245,158,11,0.3)]';
    case 'epic':
      return 'shadow-[0_0_20px_rgba(168,85,247,0.3)]';
    case 'rare':
      return 'shadow-[0_0_15px_rgba(59,130,246,0.3)]';
    case 'uncommon':
      return 'shadow-[0_0_15px_rgba(34,197,94,0.2)]';
    default:
      return 'shadow-[0_0_15px_rgba(220,38,38,0.15)]';
  }
};

export const SeasonalGiftCard = ({ gift, price, onClick, index = 0 }: SeasonalGiftCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-2xl p-3
        bg-gradient-to-br ${getRarityGradient(gift.rarity)}
        border-2 ${getRarityBorder(gift.rarity)}
        ${getRarityShadow(gift.rarity)}
        backdrop-blur-sm transition-all duration-300
        group overflow-hidden
      `}
    >
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Christmas sparkle decorations */}
      <div className="absolute top-1 right-1 text-[8px] opacity-60">✨</div>
      <div className="absolute bottom-1 left-1 text-[8px] opacity-60">❄️</div>

      {/* Gift emoji container - no images, just emoji */}
      <div className="relative aspect-square flex items-center justify-center mb-2 rounded-xl bg-background/30 overflow-hidden">
        <motion.span 
          className="text-4xl drop-shadow-lg"
          whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
        >
          {gift.emoji}
        </motion.span>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Price in ACoin - no name shown */}
      <div className="flex items-center justify-center gap-1 bg-background/40 rounded-lg py-1.5 px-2">
        <Coins className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-sm font-bold text-foreground">
          {price.toLocaleString()}
        </span>
        <span className="text-[10px] text-yellow-500/80 font-medium">ACoin</span>
      </div>
    </motion.div>
  );
};
