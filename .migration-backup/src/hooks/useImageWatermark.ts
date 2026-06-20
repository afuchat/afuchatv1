import { useState, useCallback } from 'react';
import { watermarkUploadedImage, watermarkAIImage, downloadImage } from '@/lib/imageWatermark';
import { toast } from 'sonner';

export function useImageWatermark() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processUploadedImage = useCallback(async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      return file;
    }
    
    setIsProcessing(true);
    try {
      const watermarkedFile = await watermarkUploadedImage(file);
      return watermarkedFile;
    } catch (error) {
      console.error('Watermark error:', error);
      return file; // Return original on error
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processAIImage = useCallback(async (imageUrl: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const watermarkedUrl = await watermarkAIImage(imageUrl);
      return watermarkedUrl;
    } catch (error) {
      console.error('AI watermark error:', error);
      return imageUrl; // Return original on error
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const download = useCallback(async (imageUrl: string, filename?: string) => {
    try {
      await downloadImage(imageUrl, filename);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  }, []);

  return {
    isProcessing,
    processUploadedImage,
    processAIImage,
    download,
  };
}
