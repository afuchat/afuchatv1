import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Save, 
  X
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ImageEditorControlsProps {
  brightness: number;
  contrast: number;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onRotate: (degrees: number) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onApplyFilter: (filter: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const ImageEditorControls = ({
  brightness,
  contrast,
  onBrightnessChange,
  onContrastChange,
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
  onApplyFilter,
  onSave,
  onCancel,
  isProcessing,
}: ImageEditorControlsProps) => {
  const filters = [
    { id: 'none', name: 'Original', preview: '🖼️' },
    { id: 'grayscale', name: 'B&W', preview: '⬛' },
    { id: 'sepia', name: 'Sepia', preview: '🟫' },
    { id: 'vintage', name: 'Vintage', preview: '📷' },
    { id: 'polaroid', name: 'Polaroid', preview: '📸' },
  ];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="adjust" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="adjust">Adjust</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="transform">Transform</TabsTrigger>
        </TabsList>

        <TabsContent value="adjust" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Brightness: {brightness}</Label>
            <Slider
              value={[brightness]}
              onValueChange={([value]) => onBrightnessChange(value)}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Contrast: {contrast}</Label>
            <Slider
              value={[contrast]}
              onValueChange={([value]) => onContrastChange(value)}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="filters" className="mt-4">
          <div className="grid grid-cols-5 gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onApplyFilter(filter.id)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <span className="text-2xl">{filter.preview}</span>
                <span className="text-xs">{filter.name}</span>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transform" className="mt-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => onRotate(90)}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <RotateCw className="h-5 w-5" />
              <span className="text-xs">Rotate</span>
            </Button>
            <Button
              variant="outline"
              onClick={onFlipHorizontal}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <FlipHorizontal className="h-5 w-5" />
              <span className="text-xs">Flip H</span>
            </Button>
            <Button
              variant="outline"
              onClick={onFlipVertical}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <FlipVertical className="h-5 w-5" />
              <span className="text-xs">Flip V</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={onSave}
          className="flex-1"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save & Apply
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
