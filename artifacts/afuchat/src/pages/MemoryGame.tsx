import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Brain, Clock, Zap } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DifficultySelector from '@/components/games/DifficultySelector';
import { motion, AnimatePresence } from 'framer-motion';

type Difficulty = 'easy' | 'medium' | 'hard';

const emojiSets = {
  easy: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸'],
  medium: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎬', '🎤'],
  hard: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎬', '🎤', '🎧', '🎹', '🎲', '🎰', '🎳', '🎾']
};

const difficultySettings = {
  easy: { xpMultiplier: 1, timeLimit: 60 },
  medium: { xpMultiplier: 1.5, timeLimit: 90 },
  hard: { xpMultiplier: 2.5, timeLimit: 120 }
};

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && time < difficultySettings[difficulty].timeLimit) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    } else if (time >= difficultySettings[difficulty].timeLimit && gameStarted) {
      setGameStarted(false);
      toast.error('Time\'s up!');
      playSound(220, 0.5);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted, time, difficulty]);

  const playSound = (frequency: number, duration: number) => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  const initializeGame = () => {
    const emojis = emojiSets[difficulty];
    const shuffledEmojis = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setTime(0);
    setStreak(0);
    setGameStarted(true);
    playSound(440, 0.2);
  };

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || flippedCards.includes(id) || cards[id].isMatched) return;

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);
    playSound(523, 0.1);

    if (newFlippedCards.length === 2) {
      setMoves(moves + 1);
      const [firstId, secondId] = newFlippedCards;
      
      if (cards[firstId].emoji === cards[secondId].emoji) {
        // Match found!
        setCards(prev => prev.map(card => 
          card.id === firstId || card.id === secondId 
            ? { ...card, isMatched: true } 
            : card
        ));
        setMatches(matches + 1);
        setStreak(streak + 1);
        setFlippedCards([]);
        playSound(880, 0.2);
      } else {
        // No match
        setStreak(0);
        setTimeout(() => {
          setFlippedCards([]);
          playSound(330, 0.2);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    const totalPairs = emojiSets[difficulty].length;
    if (matches === totalPairs && gameStarted) {
      const handleWin = async () => {
        await endGame(true);
      };
      handleWin();
    }
  }, [matches, difficulty, gameStarted]);

  const endGame = async (won: boolean) => {
    setGameStarted(false);
    
    if (!won) {
      toast.error('Time\'s up!');
      playSound(220, 0.5);
      return;
    }

    const efficiency = Math.max(200 - (moves * 5), 50);
    const timeBonus = Math.max(difficultySettings[difficulty].timeLimit - time, 0);
    const streakBonus = streak * 10;
    const baseXp = efficiency + timeBonus + streakBonus;
    const totalXp = Math.floor(baseXp * difficultySettings[difficulty].xpMultiplier);

    if (!bestScore || moves < bestScore) {
      setBestScore(moves);
    }

    if (user) {
      try {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_action_type: 'game_played',
          p_xp_amount: totalXp,
          p_metadata: { moves, time, difficulty, game: 'memory_match' }
        });

        await supabase.from('game_scores').insert({
          user_id: user.id,
          game_type: 'memory_match',
          difficulty,
          score: 10000 - (moves * 100) - (time * 10),
          metadata: { moves, time, streak }
        });

        toast.success(`Perfect! ${moves} moves in ${time}s | +${totalXp} Nexa`);
        playSound(660, 0.5);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGridCols = () => {
    switch (difficulty) {
      case 'easy': return 'grid-cols-3';
      case 'medium': return 'grid-cols-4';
      case 'hard': return 'grid-cols-6';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-purple-500" />
            Memory Match Pro
          </h1>
          <p className="text-muted-foreground">Match pairs before time runs out!</p>
        </div>

        {!gameStarted && (
          <div className="mb-6">
            <DifficultySelector
              selected={difficulty}
              onSelect={(val) => setDifficulty(val)}
            />
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-4 text-center border border-blue-500/20">
            <p className="text-xs text-muted-foreground mb-1">Moves</p>
            <p className="text-2xl font-bold">{moves}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-4 text-center border border-purple-500/20">
            <p className="text-xs text-muted-foreground mb-1">Matches</p>
            <p className="text-2xl font-bold">{matches}/{emojiSets[difficulty].length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-4 text-center border border-green-500/20">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Time
            </p>
            <p className="text-2xl font-bold">{formatTime(time)}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg p-4 text-center border border-orange-500/20">
            <p className="text-xs text-muted-foreground mb-1">Streak</p>
            <p className="text-2xl font-bold">🔥{streak}</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-6">
          <div className={`grid ${getGridCols()} gap-3`}>
            <AnimatePresence>
              {cards.map((card) => (
                <motion.button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={!gameStarted || card.isMatched}
                  className={`
                    aspect-square rounded-xl text-4xl font-bold transition-all relative
                    ${card.isMatched 
                      ? 'bg-gradient-to-br from-green-500 to-green-600 cursor-default' 
                      : flippedCards.includes(card.id)
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                        : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
                    }
                    ${!gameStarted || card.isMatched ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  `}
                  initial={{ rotateY: 0 }}
                  animate={{ 
                    rotateY: (flippedCards.includes(card.id) || card.isMatched) ? 180 : 0,
                    scale: card.isMatched ? 0.95 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    {(flippedCards.includes(card.id) || card.isMatched) && (
                      <span className="drop-shadow-lg">{card.emoji}</span>
                    )}
                  </div>
                  {!flippedCards.includes(card.id) && !card.isMatched && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain className="h-8 w-8 text-white/30" />
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center mb-6">
          <Button
            size="lg"
            onClick={initializeGame}
            className="w-full max-w-md text-lg"
          >
            {cards.length === 0 ? '🎮 Start Game' : '🔄 New Game'}
          </Button>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 border border-border max-w-md mx-auto">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Scoring Breakdown
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Efficiency:</span>
              <span className="text-foreground">200 - (moves × 5)</span>
            </div>
            <div className="flex justify-between">
              <span>Time Bonus:</span>
              <span className="text-foreground">Remaining time</span>
            </div>
            <div className="flex justify-between">
              <span>Streak Bonus:</span>
              <span className="text-foreground">Streak × 10</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground pt-2 border-t">
              <span>Multiplier ({difficulty}):</span>
              <span>{difficultySettings[difficulty].xpMultiplier}x</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemoryGame;
