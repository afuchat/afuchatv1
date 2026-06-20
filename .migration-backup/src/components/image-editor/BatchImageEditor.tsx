import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Wand2, RotateCw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BatchImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  onApply: (editedImages: string[]) => void;
}

export const BatchImageEditor = ({ isOpen, onClose, images, onApply }: BatchImageEditorProps) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const editedImages = await Promise.all(
        images.map(async (imageSrc) => {
          return new Promise<string>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              
              // Handle rotation dimensions
              if (rotation === 90 || rotation === 270) {
                canvas.width = img.height;
                canvas.height = img.width;
              } else {
                canvas.width = img.width;
                canvas.height = img.height;
              }

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(imageSrc);
                return;
              }

              // Apply rotation
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((rotation * Math.PI) / 180);
              ctx.translate(-img.width / 2, -img.height / 2);

              // Apply filters
              ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
              ctx.drawImage(img, 0, 0);

              resolve(canvas.toDataURL('image/jpeg', 0.92));
            };
            img.onerror = () => resolve(imageSrc);
            img.src = imageSrc;
          });
        })
      );

      onApply(editedImages);
      toast.success('Filters applied to all images!');
      onClose();
    } catch (error) {
      toast.error('Failed to apply filters');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Edit Images</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={img}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded border border-border"
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                    transform: `rotate(${rotation}deg)`,
                  }}
                />
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Adjustments (Applied to all images)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brightness: {brightness}%</Label>
                <Slider
                  value={[brightness]}
                  onValueChange={(v) => setBrightness(v[0])}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Contrast: {contrast}%</Label>
                <Slider
                  value={[contrast]}
                  onValueChange={(v) => setContrast(v[0])}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Saturation: {saturation}%</Label>
                <Slider
                  value={[saturation]}
                  onValueChange={(v) => setSaturation(v[0])}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotation: {rotation}°
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  >
                    Rotate 90°
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation(0)}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Reset All
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleApply}
              disabled={isProcessing}
              className="flex-1"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Apply to All'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
