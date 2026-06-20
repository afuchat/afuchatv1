import { Button } from '@/components/ui/button';
import { Zap, Star, Crown } from 'lucide-react';

type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultySelectorProps {
  selected: Difficulty;
  onSelect: (difficulty: Difficulty) => void;
}

const difficulties = [
  { value: 'easy' as Difficulty, label: 'Easy', icon: Zap, color: 'text-green-500' },
  { value: 'medium' as Difficulty, label: 'Medium', icon: Star, color: 'text-yellow-500' },
  { value: 'hard' as Difficulty, label: 'Hard', icon: Crown, color: 'text-red-500' },
];

const DifficultySelector = ({ selected, onSelect }: DifficultySelectorProps) => {
  return (
    <div className="flex gap-2 justify-center">
      {difficulties.map(({ value, label, icon: Icon, color }) => (
        <Button
          key={value}
          variant={selected === value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(value)}
          className="gap-2"
        >
          <Icon className={`h-4 w-4 ${selected === value ? '' : color}`} />
          {label}
        </Button>
      ))}
    </div>
  );
};

export default DifficultySelector;
