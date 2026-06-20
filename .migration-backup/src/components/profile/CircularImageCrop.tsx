import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface CircularImageCropProps {
  imageFile: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (blob: Blob) => void;
}

export const CircularImageCrop = ({ imageFile, open, onOpenChange, onSave }: CircularImageCropProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (imageFile && open) {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);
      img.onload = () => {
        setImage(img);
        // Start with image fitting in the canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const canvasSize = 1080; // Full HD resolution
          const imgAspect = img.width / img.height;
          const initialScale = Math.min(canvasSize / img.width, canvasSize / img.height);
          setScale(initialScale);
          setPosition({ x: 0, y: 0 });
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }, [imageFile, open]);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawCanvas();
    }
  }, [image, scale, position]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Full HD resolution for high quality
    const size = 1080;
    canvas.width = size;
    canvas.height = size;

    // Fill with semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, size, size);

    // Draw image with transformations
    ctx.save();
    
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    // Center image and apply position offset
    const x = (size - scaledWidth) / 2 + position.x;
    const y = (size - scaledHeight) / 2 + position.y;
    
    ctx.drawImage(
      image,
      x,
      y,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();

    // Create circular crop preview (show what will be kept)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw circular border
    ctx.save();
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && e.touches[0]) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    // Create a new canvas for the final output without overlays
    const outputCanvas = document.createElement('canvas');
    const size = 1080;
    outputCanvas.width = size;
    outputCanvas.height = size;
    
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Draw the image with transformations (no overlay)
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const x = (size - scaledWidth) / 2 + position.x;
    const y = (size - scaledHeight) / 2 + position.y;
    
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    // Apply circular crop
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Convert to blob and save
    outputCanvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
        onOpenChange(false);
      }
    }, 'image/png');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-0">
        <SheetHeader className="space-y-0.5 pb-2 pt-4 px-6 border-b border-border/40 flex-shrink-0">
          <SheetTitle className="text-2xl font-bold">
            Edit Profile Picture
          </SheetTitle>
          <SheetDescription className="text-sm">
            Drag to reposition and use the slider to zoom
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Canvas */}
          <div className="flex justify-center">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="rounded-full cursor-move shadow-2xl border-4 border-primary/20"
                style={{ width: '350px', height: '350px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              />
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zoom</span>
              <span className="text-sm text-muted-foreground">{Math.round(scale * 100)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setScale(Math.max(0.1, scale - 0.1))}
                className="h-10 w-10"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Slider
                value={[scale]}
                onValueChange={(values) => setScale(values[0])}
                min={0.1}
                max={5}
                step={0.05}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setScale(Math.min(5, scale + 0.1))}
                className="h-10 w-10"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-t border-border/40 p-6 bg-background/95 backdrop-blur-xl">
          <div className="flex gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 h-12 text-sm font-semibold rounded-xl"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-12 text-sm font-semibold rounded-xl"
            >
              <Check className="h-4 w-4 mr-2" />
              Save Picture
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
