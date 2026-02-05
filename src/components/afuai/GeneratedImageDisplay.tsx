import React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GeneratedImageDisplayProps {
  imageUrl: string;
  prompt?: string;
}

const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({ imageUrl, prompt }) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afuai-generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-border/50 bg-muted/30">
      <img 
        src={imageUrl} 
        alt={prompt || "AI Generated Image"} 
        className="w-full max-h-80 object-contain"
      />
      <div className="flex items-center justify-between p-2 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          AI Generated
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            asChild
          >
            <a href={imageUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedImageDisplay;
