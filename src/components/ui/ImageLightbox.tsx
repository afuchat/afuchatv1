import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageLightboxProps {
  images: Array<{ url: string; alt?: string }>;
  initialIndex: number;
  onClose: (e?: React.MouseEvent) => void;
  senderName?: string;
  timestamp?: string;
}

export const ImageLightbox = ({ 
  images, 
  initialIndex, 
  onClose,
  senderName,
  timestamp
}: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, distance: 0 });
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const node = document.createElement('div');
    node.setAttribute('data-image-lightbox-portal', '');
    document.body.appendChild(node);
    setPortalNode(node);

    return () => {
      document.body.removeChild(node);
      setPortalNode(null);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex]);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (scale === 1) {
          setShowControls(false);
        }
      }, 3000);
    };

    resetControlsTimeout();
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [currentIndex, scale]);

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (scale === 1) {
        setShowControls(false);
      }
    }, 3000);
  };

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    resetTransform();
    setIsLoading(true);
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    resetTransform();
    setIsLoading(true);
  };

  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setScale((prev) => Math.min(prev + 0.5, 5));
    handleInteraction();
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
    handleInteraction();
  };

  const handleRotate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setRotation((prev) => (prev + 90) % 360);
    handleInteraction();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
    handleInteraction();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleInteraction();
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    handleInteraction();
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, distance: 0 };
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current.distance = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current.distance > 0) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance / touchStartRef.current.distance;
      const newScale = Math.min(Math.max(1, scale * delta), 5);
      setScale(newScale);
      touchStartRef.current.distance = distance;
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1 && scale === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
      if (Math.abs(deltaX) > 100 && deltaY < 50) {
        if (deltaX > 0) goToPrevious();
        else goToNext();
      }
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentImage = images[currentIndex];
    if (navigator.share) {
      try {
        await navigator.share({ url: currentImage.url, title: currentImage.alt || 'Image' });
        toast.success('Shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      await navigator.clipboard.writeText(currentImage.url);
      toast.success('Image URL copied to clipboard!');
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const currentImage = images[currentIndex];
      let blob: Blob;
      
      // Handle different URL types
      if (currentImage.url.startsWith('data:')) {
        // Base64 data URL
        const response = await fetch(currentImage.url);
        blob = await response.blob();
      } else if (currentImage.url.startsWith('blob:')) {
        // Blob URL
        const response = await fetch(currentImage.url);
        blob = await response.blob();
      } else {
        // Regular URL - use no-cors if CORS fails
        try {
          const response = await fetch(currentImage.url, { mode: 'cors' });
          blob = await response.blob();
        } catch {
          // Fallback: create a link directly
          const a = document.createElement('a');
          a.href = currentImage.url;
          a.download = `afuchat-image-${Date.now()}.jpg`;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success('Opening image for download...');
          return;
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afuchat-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download image');
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose(e);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      e.preventDefault();
      onClose(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2);
    }
    handleInteraction();
  };

  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : null;

  if (!portalNode) return null;

  const content = (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
        onClick={handleBackgroundClick}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: showControls ? 0 : -100, opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
        >
          <div className="flex items-center justify-between px-4 py-3 safe-area-inset-top">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClose} 
                className="h-10 w-10 rounded-full text-white hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </Button>
              {(senderName || formattedTime) && (
                <div className="flex flex-col">
                  {senderName && (
                    <span className="text-white font-medium text-sm">{senderName}</span>
                  )}
                  {formattedTime && (
                    <span className="text-white/60 text-xs">{formattedTime}</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRotate} 
                className="h-10 w-10 rounded-full text-white hover:bg-white/10"
              >
                <RotateCw className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDownload} 
                className="h-10 w-10 rounded-full text-white hover:bg-white/10"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleShare} 
                className="h-10 w-10 rounded-full text-white hover:bg-white/10"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="flex-1 relative flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: scale > 1 ? 'grab' : 'default' }}
        >
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          
          <motion.img
            ref={imageRef}
            src={images[currentIndex].url}
            alt={images[currentIndex].alt || 'Image'}
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              opacity: isLoading ? 0 : 1,
            }}
            draggable={false}
            onLoad={() => setIsLoading(false)}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: isLoading ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Bottom Controls */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: showControls ? 0 : 100, opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        >
          <div className="flex items-center justify-center gap-4 px-4 py-4 safe-area-inset-bottom">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="h-8 w-8 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm min-w-[3rem] text-center font-medium">
                {Math.round(scale * 100)}%
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleZoomIn}
                disabled={scale >= 5}
                className="h-8 w-8 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image Counter / Dots */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-4">
              {images.length <= 10 ? (
                images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      e.preventDefault(); 
                      setCurrentIndex(index); 
                      resetTransform(); 
                      setIsLoading(true);
                    }}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-200',
                      index === currentIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/40 w-1.5 hover:bg-white/60'
                    )}
                  />
                ))
              ) : (
                <span className="text-white/80 text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showControls ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-7 w-7" />
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showControls ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                onClick={goToNext}
              >
                <ChevronRight className="h-7 w-7" />
              </Button>
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, portalNode);
};