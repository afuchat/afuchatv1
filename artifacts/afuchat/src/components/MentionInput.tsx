import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mention?: string;
  className?: string;
  onSubmit?: () => void;
}

export const MentionInput = ({
  value,
  onChange,
  placeholder,
  mention,
  className,
  onSubmit,
}: MentionInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Store user's text without mention - mention will be added on submit
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative">
      {mention && value.trim() === '' && (
        <div className="absolute left-3 top-3 pointer-events-none text-muted-foreground/40 select-none whitespace-nowrap overflow-hidden">
          {mention}
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
};

