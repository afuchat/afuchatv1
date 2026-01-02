import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GradeBadge, type Grade } from './GradeBadge';

interface NexaProgressBarProps {
  currentNexa: number;
  currentGrade?: Grade; // Optional - will be calculated from currentNexa if not provided
  showDetails?: boolean;
}

const GRADE_THRESHOLDS = [
  { 
    grade: 'Newcomer' as Grade, 
    min: 0, 
    max: 1000, 
    gradient: 'from-gray-400 via-gray-500 to-gray-600',
    glow: 'shadow-gray-500/20',
    shimmerSpeed: 2
  },
  { 
    grade: 'Active Chatter' as Grade, 
    min: 1000, 
    max: 5000, 
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    glow: 'shadow-blue-500/30',
    shimmerSpeed: 1.8
  },
  { 
    grade: 'Community Builder' as Grade, 
    min: 5000, 
    max: 20000, 
    gradient: 'from-purple-400 via-purple-500 to-purple-600',
    glow: 'shadow-purple-500/40',
    shimmerSpeed: 1.5
  },
  { 
    grade: 'Rising Star' as Grade, 
    min: 20000, 
    max: 75000, 
    gradient: 'from-cyan-400 via-cyan-500 to-cyan-600',
    glow: 'shadow-cyan-500/40',
    shimmerSpeed: 1.4
  },
  { 
    grade: 'Influencer' as Grade, 
    min: 75000, 
    max: 250000, 
    gradient: 'from-pink-400 via-pink-500 to-pink-600',
    glow: 'shadow-pink-500/45',
    shimmerSpeed: 1.3
  },
  { 
    grade: 'Elite Creator' as Grade, 
    min: 250000, 
    max: 750000, 
    gradient: 'from-yellow-400 via-yellow-500 to-amber-500',
    glow: 'shadow-yellow-500/50',
    shimmerSpeed: 1.2
  },
  { 
    grade: 'Champion' as Grade, 
    min: 750000, 
    max: 2000000, 
    gradient: 'from-orange-400 via-orange-500 to-orange-600',
    glow: 'shadow-orange-500/50',
    shimmerSpeed: 1.1
  },
  { 
    grade: 'Master' as Grade, 
    min: 2000000, 
    max: 5000000, 
    gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
    glow: 'shadow-emerald-500/55',
    shimmerSpeed: 1.0
  },
  { 
    grade: 'Grandmaster' as Grade, 
    min: 5000000, 
    max: 10000000, 
    gradient: 'from-indigo-400 via-indigo-500 to-indigo-600',
    glow: 'shadow-indigo-500/55',
    shimmerSpeed: 0.9
  },
  { 
    grade: 'Legend' as Grade, 
    min: 10000000, 
    max: Infinity, 
    gradient: 'from-red-500 via-orange-500 to-pink-500',
    glow: 'shadow-red-500/60',
    shimmerSpeed: 0.8
  },
];



export const NexaProgressBar = ({ currentNexa, currentGrade: providedGrade, showDetails = true }: NexaProgressBarProps) => {
  const [progress, setProgress] = useState(0);
  
  // Calculate the actual grade from currentNexa
  const calculatedGrade = GRADE_THRESHOLDS.find(t => currentNexa >= t.min && currentNexa < t.max)?.grade || 'Newcomer';
  const currentGrade = calculatedGrade;
  
  const currentThreshold = GRADE_THRESHOLDS.find(t => t.grade === currentGrade);
  const nextThreshold = GRADE_THRESHOLDS[GRADE_THRESHOLDS.findIndex(t => t.grade === currentGrade) + 1];

  useEffect(() => {
    // Calculate progress within current level only
    if (currentThreshold && nextThreshold) {
      const levelMin = currentThreshold.min;
      const levelMax = nextThreshold.min;
      const levelProgress = ((currentNexa - levelMin) / (levelMax - levelMin)) * 100;
      setProgress(Math.min(Math.max(levelProgress, 0), 100));
    } else if (!nextThreshold) {
      // Legend level - always full
      setProgress(100);
    }
  }, [currentNexa, currentThreshold, nextThreshold]);

  const nexaToNextGrade = nextThreshold ? Math.max(nextThreshold.min - currentNexa, 0) : 0;

  // Get current grade config for styling
  const gradeConfig = currentThreshold || GRADE_THRESHOLDS[0];

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="w-full space-y-2">
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <GradeBadge grade={currentGrade} size="sm" showLabel />
            <span className="text-muted-foreground">{formatNumber(currentNexa)} Nexa</span>
          </div>
          {nextThreshold && (
            <span className="text-muted-foreground">
              {formatNumber(nexaToNextGrade)} to {nextThreshold.grade}
            </span>
          )}
        </div>
      )}
      
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* Progress fill with grade-specific gradient and glow */}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full overflow-hidden ${gradeConfig.glow}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className={`h-full w-full bg-gradient-to-r ${gradeConfig.gradient} relative`}>
            {/* Shimmer effect with grade-specific speed */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ 
                duration: gradeConfig.shimmerSpeed, 
                repeat: Infinity, 
                ease: 'linear' 
              }}
            />
            
            {/* Pulse effect for higher grades */}
            {(currentGrade === 'Elite Creator' || currentGrade === 'Legend') && (
              <motion.div
                className="absolute inset-0 bg-white/10"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: 'easeInOut' 
                }}
              />
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Level labels - current level min and max only */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatNumber(currentThreshold?.min || 0)}</span>
        <span>{nextThreshold ? formatNumber(nextThreshold.min) : 'MAX'}</span>
      </div>
    </div>
  );
};