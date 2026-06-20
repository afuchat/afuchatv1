import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Zap, Star, Flame } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AdGate } from '@/components/AdGate';

interface Target {
  id: number;
  x: number;
  y: number;
  type: 'normal' | 'golden' | 'bonus';
  points: number;
}

const SimpleGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState<Target[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [adWatched, setAdWatched] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize Web Audio API
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameActive) {
      endGame();
    }
  }, [timeLeft, gameActive]);

  useEffect(() => {
    if (gameActive) {
      const interval = setInterval(() => {
        spawnTarget();
      }, 600);
      return () => clearInterval(interval);
    }
  }, [gameActive, timeLeft]);

  // Reset combo if no click for 2 seconds
  useEffect(() => {
    if (gameActive && combo > 0) {
      const timeout = setTimeout(() => {
        if (Date.now() - lastClickTime > 2000) {
          setCombo(0);
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [lastClickTime, combo, gameActive]);

  const playSound = (frequency: number, duration: number) => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  const spawnTarget = () => {
    const random = Math.random();
    let type: 'normal' | 'golden' | 'bonus' = 'normal';
    let points = 10;
    
    // 10% chance for bonus target (50 points)
    if (random > 0.9) {
      type = 'bonus';
      points = 50;
    }
    // 20% chance for golden target (25 points)
    else if (random > 0.7) {
      type = 'golden';
      points = 25;
    }
    
    const newTarget: Target = {
      id: Date.now(),
      x: Math.random() * 75 + 5,
      y: Math.random() * 65 + 15,
      type,
      points
    };
    
    setTargets((prev) => [...prev, newTarget]);
    
    // Target duration based on type
    const duration = type === 'bonus' ? 800 : type === 'golden' ? 1200 : 1500;
    
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== newTarget.id));
    }, duration);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setTargets([]);
    setCombo(0);
    playSound(440, 0.2);
  };

  const endGame = async () => {
    setGameActive(false);
    setTargets([]);
    
    if (score > highScore) {
      setHighScore(score);
    }

    if (user && score > 0) {
      const xpEarned = Math.floor(score / 5);
      if (xpEarned > 0) {
        try {
          await supabase.rpc('award_xp', {
            p_user_id: user.id,
            p_action_type: 'game_played',
            p_xp_amount: xpEarned,
            p_metadata: { score, game: 'xp_collector' }
          });

          await supabase.from('game_scores').insert({
            user_id: user.id,
            game_type: 'xp_collector',
            difficulty: 'normal',
            score,
            metadata: { combo_max: combo }
          });

          toast.success(`Game Over! Score: ${score} | Earned ${xpEarned} Nexa!`);
        } catch (error) {
          console.error('Error:', error);
        }
      } else {
        toast.info(`Game Over! Score: ${score}`);
      }
    } else {
      toast.info(`Game Over! Score: ${score}`);
    }
    
    playSound(330, 0.5);
  };

  const handleTargetClick = (target: Target) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    // Combo logic: clicks within 1 second increase combo
    if (timeSinceLastClick < 1000) {
      setCombo(prev => prev + 1);
    } else {
      setCombo(1);
    }
    
    setLastClickTime(now);
    
    // Calculate points with combo multiplier
    const comboMultiplier = Math.min(combo + 1, 5) / 2;
    const finalPoints = Math.floor(target.points * comboMultiplier);
    
    setScore((prev) => prev + finalPoints);
    setTargets((prev) => prev.filter((t) => t.id !== target.id));
    
    // Play different sounds for different target types
    if (target.type === 'bonus') {
      playSound(880, 0.15);
    } else if (target.type === 'golden') {
      playSound(660, 0.15);
    } else {
      playSound(440 + (combo * 50), 0.1);
    }
  };

  const getTargetColor = (type: string) => {
    switch (type) {
      case 'bonus':
        return 'from-purple-500 via-pink-500 to-red-500';
      case 'golden':
        return 'from-yellow-400 via-amber-400 to-orange-400';
      default:
        return 'from-blue-400 via-cyan-400 to-blue-500';
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'bonus':
        return <Star className="h-6 w-6 text-white" />;
      case 'golden':
        return <Flame className="h-6 w-6 text-white" />;
      default:
        return <Zap className="h-6 w-6 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Ad Gate - Must watch ad before playing */}
      {!adWatched && (
        <AdGate 
          onAdWatched={() => setAdWatched(true)} 
          gameName="Nexa Collector Pro"
        />
      )}

      <main className="container max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500 animate-pulse" />
            Nexa Collector Pro
          </h1>
          <p className="text-muted-foreground">Click targets fast for combos & bonuses!</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-4 text-center border border-blue-500/20">
            <p className="text-xs text-muted-foreground mb-1">Score</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-4 text-center border border-green-500/20">
            <p className="text-xs text-muted-foreground mb-1">Time</p>
            <p className="text-2xl font-bold">{timeLeft}s</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg p-4 text-center border border-orange-500/20">
            <p className="text-xs text-muted-foreground mb-1">Combo</p>
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              {combo > 0 && <Flame className="h-4 w-4 text-orange-500" />}
              x{combo}
            </p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg p-4 text-center border border-yellow-500/20">
            <p className="text-xs text-muted-foreground mb-1">Best</p>
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {highScore}
            </p>
          </div>
        </div>

        <div 
          className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-border overflow-hidden shadow-2xl" 
          style={{ height: '500px' }}
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
          
          {!gameActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-10">
              <div className="text-center">
                <Button size="lg" onClick={startGame} className="mb-4 text-lg px-8 py-6">
                  {score === 0 ? '🎮 Start Game' : '🔄 Play Again'}
                </Button>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>💙 Blue Orbs: 10 pts</p>
                  <p>💛 Golden Orbs: 25 pts</p>
                  <p>⭐ Bonus Stars: 50 pts</p>
                  <p>🔥 Build combos for multipliers!</p>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {gameActive && targets.map((target) => (
              <motion.button
                key={target.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTargetClick(target)}
                className={`absolute w-14 h-14 rounded-full bg-gradient-to-br ${getTargetColor(target.type)} shadow-2xl cursor-pointer flex items-center justify-center border-2 border-white/30`}
                style={{ 
                  left: `${target.x}%`, 
                  top: `${target.y}%`,
                  filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))'
                }}
              >
                {getTargetIcon(target.type)}
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Combo display */}
          {combo > 2 && gameActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-bold text-2xl shadow-2xl"
            >
              🔥 {combo}x COMBO!
            </motion.div>
          )}
        </div>

        <div className="mt-6 bg-muted/30 rounded-xl p-4 border border-border">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Pro Tips
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <p className="font-semibold text-foreground">Fast Clicks</p>
                <p>Click within 1 second to build combos</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">⭐</span>
              <div>
                <p className="font-semibold text-foreground">Rare Targets</p>
                <p>Purple stars = 50pts, disappear faster!</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🔥</span>
              <div>
                <p className="font-semibold text-foreground">Max Multiplier</p>
                <p>Reach 5x combo for max points</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">💎</span>
              <div>
                <p className="font-semibold text-foreground">Earn Nexa</p>
                <p>Get 1 Nexa for every 5 points scored</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimpleGame;
