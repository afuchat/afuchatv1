import { useState } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Sparkles } from 'lucide-react';

interface AltTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

export const AltTextEditor = ({ value, onChange, onGenerate, isGenerating }: AltTextEditorProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Alt Text (Accessibility)</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="h-7 text-xs"
        >
          {isGenerating ? (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              AI Generate
            </>
          )}
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe this image for visually impaired users..."
        className="text-xs resize-none"
        rows={2}
      />
    </div>
  );
};
