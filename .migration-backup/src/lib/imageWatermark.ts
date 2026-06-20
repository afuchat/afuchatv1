/**
 * Image Watermarking Utility for AfuChat
 * Adds watermarks to images uploaded or generated on the platform
 */

export type WatermarkType = 'afuchat' | 'afuai';

interface WatermarkOptions {
  type: WatermarkType;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  opacity?: number;
  scale?: number;
}

/**
 * Adds a watermark to an image
 * @param imageSource - Image source (File, Blob, or URL)
 * @param options - Watermark configuration
 * @returns Watermarked image as Blob
 */
export async function addWatermark(
  imageSource: File | Blob | string,
  options: WatermarkOptions
): Promise<Blob> {
  const { type, position = 'bottom-right', opacity = 0.85, scale = 1 } = options;
  
  return new Promise(async (resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Load the source image
      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(imageSource);
      }
      
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Calculate watermark dimensions based on image size
        const watermarkHeight = Math.max(24, Math.min(48, img.height * 0.06)) * scale;
        const padding = Math.max(12, img.width * 0.02);
        
        // Set up text style
        ctx.globalAlpha = opacity;
        
        // Create gradient background for watermark
        const brandName = type === 'afuai' ? 'AfuAI' : 'AfuChat';
        const logoText = '✦'; // Crystal/sparkle symbol as logo representation
        const fullText = `${logoText} ${brandName}`;
        
        ctx.font = `bold ${watermarkHeight * 0.7}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        const textMetrics = ctx.measureText(fullText);
        const textWidth = textMetrics.width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = watermarkHeight + padding;
        
        // Calculate position
        let x: number, y: number;
        switch (position) {
          case 'bottom-left':
            x = padding;
            y = img.height - boxHeight - padding;
            break;
          case 'top-right':
            x = img.width - boxWidth - padding;
            y = padding;
            break;
          case 'top-left':
            x = padding;
            y = padding;
            break;
          case 'bottom-right':
          default:
            x = img.width - boxWidth - padding;
            y = img.height - boxHeight - padding;
            break;
        }
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(x, y, boxWidth, boxHeight, 8);
        ctx.fill();
        
        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(fullText, x + padding, y + boxHeight / 2);
        
        // Add subtle border
        ctx.globalAlpha = opacity * 0.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create watermarked image'));
            }
          },
          'image/jpeg',
          0.92
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Adds AfuChat watermark to an uploaded image file
 */
export async function watermarkUploadedImage(file: File): Promise<File> {
  // Skip if not an image
  if (!file.type.startsWith('image/')) {
    return file;
  }
  
  // Skip GIFs (watermarking would break animation)
  if (file.type === 'image/gif') {
    return file;
  }
  
  try {
    const watermarkedBlob = await addWatermark(file, { type: 'afuchat' });
    return new File([watermarkedBlob], file.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Failed to add watermark:', error);
    return file; // Return original if watermarking fails
  }
}

/**
 * Adds AfuAI watermark to an AI-generated image
 * Works with base64 data URLs or regular URLs
 */
export async function watermarkAIImage(imageUrl: string): Promise<string> {
  try {
    const watermarkedBlob = await addWatermark(imageUrl, { type: 'afuai' });
    return URL.createObjectURL(watermarkedBlob);
  } catch (error) {
    console.error('Failed to add AI watermark:', error);
    return imageUrl; // Return original if watermarking fails
  }
}

/**
 * Downloads an image with proper error handling
 */
export async function downloadImage(
  imageUrl: string, 
  filename?: string
): Promise<void> {
  try {
    // Handle different URL types
    let blob: Blob;
    
    if (imageUrl.startsWith('data:')) {
      // Base64 data URL
      const response = await fetch(imageUrl);
      blob = await response.blob();
    } else if (imageUrl.startsWith('blob:')) {
      // Blob URL
      const response = await fetch(imageUrl);
      blob = await response.blob();
    } else {
      // Regular URL - fetch with CORS handling
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      blob = await response.blob();
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `afuchat-image-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download image. Please try again.');
  }
}
