import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Puzzle, Clock, Zap } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const PuzzleGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted]);

  const initializeGame = () => {
    let numbers = Array.from({ length: 15 }, (_, i) => i + 1);
    numbers.push(0);
    
    // Shuffle until solvable
    do {
      numbers = shuffleArray(numbers);
    } while (!isSolvable(numbers));
    
    setTiles(numbers);
    setMoves(0);
    setTime(0);
    setGameStarted(true);
  };

  const isSolvable = (arr: number[]) => {
    let inversions = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) {
          inversions++;
        }
      }
    }
    const emptyRow = Math.floor(arr.indexOf(0) / 4);
    return (inversions + emptyRow) % 2 === 0;
  };

  const shuffleArray = (array: number[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const canMove = (index: number) => {
    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / 4);
    const col = index % 4;
    const emptyRow = Math.floor(emptyIndex / 4);
    const emptyCol = emptyIndex % 4;

    return (
      (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
      (col === emptyCol && Math.abs(row - emptyRow) === 1)
    );
  };

  const moveTile = (index: number) => {
    if (!gameStarted || !canMove(index)) return;

    const newTiles = [...tiles];
    const emptyIndex = tiles.indexOf(0);
    [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
    setTiles(newTiles);
    setMoves(moves + 1);
  };

  const isSolved = () => {
    return tiles.every((tile, index) => index === tiles.length - 1 || tile === index + 1);
  };

  useEffect(() => {
    if (gameStarted && isSolved()) {
      endGame();
    }
  }, [tiles]);

  const endGame = async () => {
    setGameStarted(false);
    
    const efficiency = Math.max(150 - moves, 20);
    const timeBonus = Math.max(100 - Math.floor(time / 2), 0);
    const totalXp = efficiency + timeBonus;
    
    if (!bestScore || moves < bestScore) {
      setBestScore(moves);
    }

    if (user) {
      try {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_action_type: 'game_played',
          p_xp_amount: totalXp,
          p_metadata: { moves, time, game: '15_puzzle' }
        });

        await supabase.from('game_scores').insert({
          user_id: user.id,
          game_type: '15_puzzle',
          difficulty: 'normal',
          score: 1000 - moves - time,
          metadata: { moves, time }
        });

        toast.success(`Solved! ${moves} moves in ${time}s | +${totalXp} Nexa`);
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

  const getTileColor = (num: number) => {
    const colors = [
      'from-red-500 to-red-600',
      'from-orange-500 to-orange-600',
      'from-yellow-500 to-yellow-600',
      'from-green-500 to-green-600',
      'from-blue-500 to-blue-600',
      'from-indigo-500 to-indigo-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600'
    ];
    return colors[Math.floor((num - 1) / 2) % colors.length];
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Puzzle className="h-8 w-8 text-purple-500" />
            15 Puzzle Challenge
          </h1>
          <p className="text-muted-foreground">Arrange tiles in order - faster = more Nexa!</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-4 text-center border border-blue-500/20">
            <p className="text-xs text-muted-foreground mb-1">Moves</p>
            <p className="text-2xl font-bold">{moves}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-4 text-center border border-green-500/20">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Time
            </p>
            <p className="text-2xl font-bold">{formatTime(time)}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg p-4 text-center border border-yellow-500/20">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Trophy className="h-3 w-3" />
              Best
            </p>
            <p className="text-2xl font-bold">{bestScore || '-'}</p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <div className="aspect-square bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-2 shadow-2xl border-2 border-border">
            <div className="grid grid-cols-4 gap-2 h-full">
              {tiles.map((tile, index) => (
                <motion.button
                  key={index}
                  onClick={() => moveTile(index)}
                  disabled={tile === 0 || !canMove(index)}
                  className={`
                    rounded-xl font-bold text-2xl shadow-lg transition-all
                    ${tile === 0 
                      ? 'bg-transparent cursor-default' 
                      : canMove(index)
                        ? `bg-gradient-to-br ${getTileColor(tile)} text-white cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]`
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  whileTap={tile !== 0 && canMove(index) ? { scale: 0.95 } : {}}
                >
                  {tile !== 0 && tile}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button
              size="lg"
              onClick={initializeGame}
              className="w-full text-lg"
            >
              {tiles.length === 0 ? '🎮 Start Game' : '🔄 New Puzzle'}
            </Button>
          </div>
        </div>

        <div className="mt-6 bg-muted/30 rounded-xl p-4 border border-border max-w-md mx-auto">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Scoring System
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Efficiency Bonus:</span>
              <span className="text-foreground font-semibold">150 - moves</span>
            </div>
            <div className="flex justify-between">
              <span>Speed Bonus:</span>
              <span className="text-foreground font-semibold">100 - (time/2)</span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between">
              <span className="font-semibold text-foreground">Tips:</span>
            </div>
            <ul className="space-y-1 pl-4">
              <li>• Solve in fewer moves for more Nexa</li>
              <li>• Complete faster for time bonus</li>
              <li>• Adjacent tiles can be moved</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PuzzleGame;
