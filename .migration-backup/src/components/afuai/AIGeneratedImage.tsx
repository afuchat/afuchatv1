import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadImage, watermarkAIImage } from '@/lib/imageWatermark';
import { toast } from 'sonner';

interface AIGeneratedImageProps {
  imageUrl: string;
  prompt?: string;
}

const AIGeneratedImage: React.FC<AIGeneratedImageProps> = ({ imageUrl, prompt }) => {
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const processImage = async () => {
      setIsProcessing(true);
      setError(false);
      
      try {
        // Add AfuAI watermark to the generated image
        const processed = await watermarkAIImage(imageUrl);
        if (mounted) {
          setWatermarkedUrl(processed);
        }
      } catch (err) {
        console.error('Failed to watermark image:', err);
        if (mounted) {
          // Fall back to original URL if watermarking fails
          setWatermarkedUrl(imageUrl);
        }
      } finally {
        if (mounted) {
          setIsProcessing(false);
        }
      }
    };
    
    processImage();
    
    return () => {
      mounted = false;
      // Clean up blob URL when unmounting
      if (watermarkedUrl && watermarkedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(watermarkedUrl);
      }
    };
  }, [imageUrl]);

  const handleDownload = async () => {
    try {
      const urlToDownload = watermarkedUrl || imageUrl;
      await downloadImage(urlToDownload, `afuai-generated-${Date.now()}.jpg`);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleImageError = () => {
    setError(true);
    // Fall back to original URL
    setWatermarkedUrl(imageUrl);
  };

  const displayUrl = watermarkedUrl || imageUrl;

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-border/50 bg-muted/30">
      {isProcessing ? (
        <div className="w-full h-48 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <img 
          src={displayUrl} 
          alt={prompt || "AI Generated Image"} 
          className="w-full max-h-80 object-contain"
          onError={handleImageError}
        />
      )}
      <div className="flex items-center justify-between p-2 border-t border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            ✦ AfuAI Generated
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDownload}
            disabled={isProcessing}
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
            <a href={displayUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIGeneratedImage;
