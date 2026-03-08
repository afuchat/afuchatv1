import { useState, useEffect, useRef, useCallback } from 'react';
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

// Clamp a value between min and max
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Get distance between two touch points
const getTouchDistance = (t1: React.Touch, t2: React.Touch) =>
  Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

// Get midpoint between two touch points
const getTouchMidpoint = (t1: React.Touch, t2: React.Touch) => ({
  x: (t1.clientX + t2.clientX) / 2,
  y: (t1.clientY + t2.clientY) / 2,
});

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 80;
const DISMISS_THRESHOLD = 120;
const DOUBLE_TAP_DELAY = 300;

export const ImageLightbox = ({
  images,
  initialIndex,
  onClose,
  senderName,
  timestamp,
}: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [rotation, setRotation] = useState(0);

  // Transform state for zoom/pan
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const [displayScale, setDisplayScale] = useState(1);
  const [displayPos, setDisplayPos] = useState({ x: 0, y: 0 });

  // Dismiss drag state
  const [dismissY, setDismissY] = useState(0);
  const [dismissOpacity, setDismissOpacity] = useState(1);
  const isDismissing = useRef(false);

  // Gesture refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const gestureRef = useRef<{
    type: 'none' | 'pan' | 'pinch' | 'swipe' | 'dismiss';
    startX: number;
    startY: number;
    startScale: number;
    startPosX: number;
    startPosY: number;
    startDistance: number;
    lastTapTime: number;
    lastTapX: number;
    lastTapY: number;
    moved: boolean;
  }>({
    type: 'none',
    startX: 0, startY: 0,
    startScale: 1,
    startPosX: 0, startPosY: 0,
    startDistance: 0,
    lastTapTime: 0,
    lastTapX: 0, lastTapY: 0,
    moved: false,
  });

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const animFrameRef = useRef<number>();

  // --- Helpers ---
  const applyTransform = useCallback(() => {
    setDisplayScale(scaleRef.current);
    setDisplayPos({ ...posRef.current });
  }, []);

  const resetTransform = useCallback(() => {
    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };
    setRotation(0);
    applyTransform();
  }, [applyTransform]);

  const constrainPosition = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const scale = scaleRef.current;

    if (scale <= 1) {
      posRef.current = { x: 0, y: 0 };
      return;
    }

    const img = imageRef.current;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    // Compute displayed image size (object-contain)
    const containerAspect = container.width / container.height;
    const imageAspect = naturalW / naturalH;
    let displayW: number, displayH: number;
    if (imageAspect > containerAspect) {
      displayW = container.width;
      displayH = container.width / imageAspect;
    } else {
      displayH = container.height;
      displayW = container.height * imageAspect;
    }

    const scaledW = displayW * scale;
    const scaledH = displayH * scale;

    const maxX = Math.max(0, (scaledW - container.width) / 2);
    const maxY = Math.max(0, (scaledH - container.height) / 2);

    posRef.current = {
      x: clamp(posRef.current.x, -maxX, maxX),
      y: clamp(posRef.current.y, -maxY, maxY),
    };
  }, []);

  const animateToScale = useCallback((targetScale: number, originX?: number, originY?: number) => {
    const startScale = scaleRef.current;
    const startPos = { ...posRef.current };
    const container = containerRef.current?.getBoundingClientRect();

    let targetPos = { x: 0, y: 0 };
    if (targetScale > 1 && container && originX !== undefined && originY !== undefined) {
      // Zoom toward the tap/click point
      const cx = container.width / 2;
      const cy = container.height / 2;
      const dx = cx - originX;
      const dy = cy - originY;
      targetPos = { x: dx * (targetScale - 1), y: dy * (targetScale - 1) };
    }

    const duration = 250;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = clamp(elapsed / duration, 0, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      scaleRef.current = startScale + (targetScale - startScale) * eased;
      posRef.current = {
        x: startPos.x + (targetPos.x - startPos.x) * eased,
        y: startPos.y + (targetPos.y - startPos.y) * eased,
      };

      if (scaleRef.current <= 1) {
        posRef.current = { x: 0, y: 0 };
      } else {
        constrainPosition();
      }

      applyTransform();

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [applyTransform, constrainPosition]);

  // --- Controls visibility ---
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (scaleRef.current === 1) setShowControls(false);
    }, 3000);
  }, []);

  // --- Navigation ---
  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };
    setRotation(0);
    setIsLoading(true);
    applyTransform();
    showControlsTemporarily();
  }, [applyTransform, showControlsTemporarily]);

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    goTo(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  }, [currentIndex, images.length, goTo]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    goTo(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, images.length, goTo]);

  // --- Portal setup ---
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

  // --- Keyboard ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === '+' || e.key === '=') {
        animateToScale(clamp(scaleRef.current + 0.5, MIN_SCALE, MAX_SCALE));
        showControlsTemporarily();
      }
      if (e.key === '-') {
        animateToScale(clamp(scaleRef.current - 0.5, MIN_SCALE, MAX_SCALE));
        showControlsTemporarily();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, goToPrevious, goToNext, animateToScale, showControlsTemporarily]);

  // Auto-hide controls on mount
  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [showControlsTemporarily]);

  // --- Touch handlers ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const g = gestureRef.current;
    g.moved = false;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      g.startX = touch.clientX;
      g.startY = touch.clientY;
      g.startPosX = posRef.current.x;
      g.startPosY = posRef.current.y;
      g.type = scaleRef.current > 1 ? 'pan' : 'none';
    } else if (e.touches.length === 2) {
      g.type = 'pinch';
      g.startDistance = getTouchDistance(e.touches[0], e.touches[1]);
      g.startScale = scaleRef.current;
      g.startPosX = posRef.current.x;
      g.startPosY = posRef.current.y;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gestureRef.current;

    if (e.touches.length === 2) {
      // Pinch zoom
      g.type = 'pinch';
      g.moved = true;
      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = newDist / g.startDistance;
      const newScale = clamp(g.startScale * ratio, MIN_SCALE, MAX_SCALE);

      const mid = getTouchMidpoint(e.touches[0], e.touches[1]);
      const container = containerRef.current?.getBoundingClientRect();
      if (container) {
        const cx = container.width / 2;
        const cy = container.height / 2;
        const relX = mid.x - container.left - cx;
        const relY = mid.y - container.top - cy;

        const scaleChange = newScale / scaleRef.current;
        posRef.current = {
          x: relX - scaleChange * (relX - posRef.current.x),
          y: relY - scaleChange * (relY - posRef.current.y),
        };
      }

      scaleRef.current = newScale;
      if (newScale <= 1) posRef.current = { x: 0, y: 0 };
      else constrainPosition();
      applyTransform();
      return;
    }

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - g.startX;
    const dy = touch.clientY - g.startY;

    if (!g.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    g.moved = true;

    if (scaleRef.current > 1) {
      // Pan when zoomed
      g.type = 'pan';
      posRef.current = {
        x: g.startPosX + dx,
        y: g.startPosY + dy,
      };
      constrainPosition();
      applyTransform();
    } else {
      // Determine gesture: horizontal swipe or vertical dismiss
      if (g.type === 'none') {
        g.type = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'dismiss';
      }

      if (g.type === 'dismiss') {
        isDismissing.current = true;
        const absDy = Math.abs(dy);
        setDismissY(dy);
        setDismissOpacity(clamp(1 - absDy / 400, 0.2, 1));
      }
    }
  }, [applyTransform, constrainPosition]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gestureRef.current;

    // Handle pinch end
    if (g.type === 'pinch') {
      if (scaleRef.current < 1.1) {
        animateToScale(1);
      } else {
        constrainPosition();
        applyTransform();
      }
      g.type = 'none';
      return;
    }

    // Handle dismiss
    if (g.type === 'dismiss') {
      isDismissing.current = false;
      if (Math.abs(dismissY) > DISMISS_THRESHOLD) {
        onClose();
      } else {
        setDismissY(0);
        setDismissOpacity(1);
      }
      g.type = 'none';
      return;
    }

    // Handle swipe navigation
    if (g.type === 'swipe' || (g.type === 'none' && !g.moved)) {
      if (e.changedTouches.length === 1 && scaleRef.current === 1 && g.moved) {
        const dx = e.changedTouches[0].clientX - g.startX;
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          if (dx > 0) goToPrevious();
          else goToNext();
          g.type = 'none';
          return;
        }
      }
    }

    // Handle double-tap
    if (!g.moved && e.changedTouches.length === 1) {
      const now = Date.now();
      const touch = e.changedTouches[0];
      const timeDiff = now - g.lastTapTime;
      const distFromLast = Math.hypot(touch.clientX - g.lastTapX, touch.clientY - g.lastTapY);

      if (timeDiff < DOUBLE_TAP_DELAY && distFromLast < 30) {
        // Double tap
        const container = containerRef.current?.getBoundingClientRect();
        if (container) {
          const originX = touch.clientX - container.left;
          const originY = touch.clientY - container.top;
          if (scaleRef.current > 1) {
            animateToScale(1);
          } else {
            animateToScale(DOUBLE_TAP_SCALE, originX, originY);
          }
        }
        g.lastTapTime = 0;
      } else {
        g.lastTapTime = now;
        g.lastTapX = touch.clientX;
        g.lastTapY = touch.clientY;
        // Single tap → toggle controls
        setTimeout(() => {
          if (Date.now() - g.lastTapTime >= DOUBLE_TAP_DELAY - 10) {
            showControlsTemporarily();
          }
        }, DOUBLE_TAP_DELAY);
      }
    }

    g.type = 'none';
  }, [dismissY, onClose, goToPrevious, goToNext, animateToScale, constrainPosition, applyTransform, showControlsTemporarily]);

  // --- Mouse handlers (desktop) ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.003;
    const newScale = clamp(scaleRef.current + delta * scaleRef.current, MIN_SCALE, MAX_SCALE);

    const container = containerRef.current?.getBoundingClientRect();
    if (container) {
      const cx = container.width / 2;
      const cy = container.height / 2;
      const mouseX = e.clientX - container.left - cx;
      const mouseY = e.clientY - container.top - cy;
      const scaleChange = newScale / scaleRef.current;
      posRef.current = {
        x: mouseX - scaleChange * (mouseX - posRef.current.x),
        y: mouseY - scaleChange * (mouseY - posRef.current.y),
      };
    }

    scaleRef.current = newScale;
    if (newScale <= 1) posRef.current = { x: 0, y: 0 };
    else constrainPosition();
    applyTransform();
    showControlsTemporarily();
  }, [applyTransform, constrainPosition, showControlsTemporarily]);

  const mouseRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scaleRef.current > 1) {
      mouseRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: posRef.current.x,
        startPosY: posRef.current.y,
      };
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseRef.current.dragging || scaleRef.current <= 1) return;
    posRef.current = {
      x: mouseRef.current.startPosX + (e.clientX - mouseRef.current.startX),
      y: mouseRef.current.startPosY + (e.clientY - mouseRef.current.startY),
    };
    constrainPosition();
    applyTransform();
  }, [applyTransform, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.dragging = false;
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    const originX = e.clientX - container.left;
    const originY = e.clientY - container.top;
    if (scaleRef.current > 1) {
      animateToScale(1);
    } else {
      animateToScale(DOUBLE_TAP_SCALE, originX, originY);
    }
    showControlsTemporarily();
  }, [animateToScale, showControlsTemporarily]);

  // --- Action handlers ---
  const handleZoomIn = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    animateToScale(clamp(scaleRef.current + 0.5, MIN_SCALE, MAX_SCALE));
    showControlsTemporarily();
  }, [animateToScale, showControlsTemporarily]);

  const handleZoomOut = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    animateToScale(clamp(scaleRef.current - 0.5, MIN_SCALE, MAX_SCALE));
    showControlsTemporarily();
  }, [animateToScale, showControlsTemporarily]);

  const handleRotate = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setRotation(r => (r + 90) % 360);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const img = images[currentIndex];
    if (navigator.share) {
      try {
        await navigator.share({ url: img.url, title: img.alt || 'Image' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') toast.error('Failed to share');
      }
    } else {
      await navigator.clipboard.writeText(img.url);
      toast.success('Image URL copied!');
    }
  }, [images, currentIndex]);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const img = images[currentIndex];
      let blob: Blob;
      if (img.url.startsWith('data:') || img.url.startsWith('blob:')) {
        blob = await (await fetch(img.url)).blob();
      } else {
        try {
          blob = await (await fetch(img.url, { mode: 'cors' })).blob();
        } catch {
          const a = document.createElement('a');
          a.href = img.url;
          a.download = `image-${Date.now()}.jpg`;
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
      a.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Failed to download image');
    }
  }, [images, currentIndex]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose(e);
  }, [onClose]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      e.preventDefault();
      onClose(e);
    }
  }, [onClose]);

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  if (!portalNode) return null;

  const imageStyle: React.CSSProperties = {
    transform: `translate(${displayPos.x}px, ${displayPos.y}px) scale(${displayScale}) rotate(${rotation}deg)`,
    transition: mouseRef.current.dragging || gestureRef.current.type !== 'none'
      ? 'none' : 'transform 0.15s ease-out',
    willChange: 'transform',
    touchAction: 'none',
  };

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex flex-col select-none"
        style={{
          backgroundColor: `rgba(0,0,0,${dismissOpacity})`,
        }}
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
                  {senderName && <span className="text-white font-medium text-sm">{senderName}</span>}
                  {formattedTime && <span className="text-white/60 text-xs">{formattedTime}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleRotate} className="h-10 w-10 rounded-full text-white hover:bg-white/10">
                <RotateCw className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload} className="h-10 w-10 rounded-full text-white hover:bg-white/10">
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare} className="h-10 w-10 rounded-full text-white hover:bg-white/10">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="flex-1 relative flex items-center justify-center overflow-hidden"
          style={{
            transform: `translateY(${dismissY}px)`,
            transition: isDismissing.current ? 'none' : 'transform 0.3s ease-out',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          <img
            ref={imageRef}
            src={images[currentIndex].url}
            alt={images[currentIndex].alt || 'Image'}
            className="max-w-full max-h-full object-contain pointer-events-none"
            style={{
              ...imageStyle,
              opacity: isLoading ? 0 : 1,
              cursor: displayScale > 1 ? 'grab' : 'default',
            }}
            draggable={false}
            onLoad={() => setIsLoading(false)}
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
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={displayScale <= MIN_SCALE}
                className="h-8 w-8 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm min-w-[3rem] text-center font-medium">
                {Math.round(displayScale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={displayScale >= MAX_SCALE}
                className="h-8 w-8 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-4">
              {images.length <= 10 ? (
                images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      goTo(index);
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
