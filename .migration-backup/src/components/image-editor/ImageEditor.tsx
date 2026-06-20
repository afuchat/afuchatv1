import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, filters } from 'fabric';
import { ImageEditorControls } from './ImageEditorControls';

interface ImageEditorProps {
  image: string;
  onSave: (editedImage: Blob) => void;
  onCancel: () => void;
}

export const ImageEditor = ({ image, onSave, onCancel }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [fabricImage, setFabricImage] = useState<FabricImage | null>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: '#f0f0f0',
    });

    // Load the image
    FabricImage.fromURL(image).then((img) => {
      // Scale image to fit canvas
      const scale = Math.min(
        canvas.width! / img.width!,
        canvas.height! / img.height!
      );
      
      img.scale(scale);
      img.set({
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(img);
      canvas.renderAll();
      setFabricImage(img);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [image]);

  // Apply filters when brightness/contrast changes
  useEffect(() => {
    if (!fabricImage) return;

    const imageFilters: any[] = [];

    if (brightness !== 0) {
      imageFilters.push(new filters.Brightness({ brightness: brightness / 100 }));
    }

    if (contrast !== 0) {
      imageFilters.push(new filters.Contrast({ contrast: contrast / 100 }));
    }

    fabricImage.filters = imageFilters;
    fabricImage.applyFilters();
    fabricCanvas?.renderAll();
  }, [brightness, contrast, fabricImage, fabricCanvas]);

  // Apply rotation
  useEffect(() => {
    if (!fabricImage) return;
    fabricImage.rotate(rotation);
    fabricCanvas?.renderAll();
  }, [rotation, fabricImage, fabricCanvas]);

  const applyFilter = (filterType: string) => {
    if (!fabricImage) return;

    let filter;
    switch (filterType) {
      case 'grayscale':
        filter = new filters.Grayscale();
        break;
      case 'sepia':
        filter = new filters.Sepia();
        break;
      case 'vintage':
        filter = new filters.Saturation({ saturation: -0.5 });
        break;
      case 'polaroid':
        filter = new filters.Contrast({ contrast: 0.2 });
        break;
      case 'none':
        fabricImage.filters = [];
        fabricImage.applyFilters();
        fabricCanvas?.renderAll();
        return;
    }

    if (filter) {
      fabricImage.filters = [filter];
      fabricImage.applyFilters();
      fabricCanvas?.renderAll();
    }
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;

    setIsProcessing(true);
    try {
      // Export canvas to blob
      const dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.9,
        multiplier: 1,
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      onSave(blob);
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  const handleFlipHorizontal = () => {
    if (!fabricImage) return;
    fabricImage.set('flipX', !fabricImage.flipX);
    fabricCanvas?.renderAll();
  };

  const handleFlipVertical = () => {
    if (!fabricImage) return;
    fabricImage.set('flipY', !fabricImage.flipY);
    fabricCanvas?.renderAll();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border rounded-lg overflow-hidden bg-muted">
        <canvas ref={canvasRef} />
      </div>

      <ImageEditorControls
        brightness={brightness}
        contrast={contrast}
        onBrightnessChange={setBrightness}
        onContrastChange={setContrast}
        onRotate={handleRotate}
        onFlipHorizontal={handleFlipHorizontal}
        onFlipVertical={handleFlipVertical}
        onApplyFilter={applyFilter}
        onSave={handleSave}
        onCancel={onCancel}
        isProcessing={isProcessing}
      />
    </div>
  );
};
