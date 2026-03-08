import { useState, memo } from 'react';
import { cn } from '@/lib/utils';
import { ImageLightbox } from './ImageLightbox';

interface ImageCarouselProps {
  images: Array<{ url: string; alt?: string }> | string[];
  className?: string;
}

export const ImageCarousel = memo(({ images, className }: ImageCarouselProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const imageUrls = images.map(img => typeof img === 'string' ? img : img.url);
  const imageAlts = images.map(img => typeof img === 'string' ? 'Post image' : (img.alt || 'Post image'));

  const handleImageClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const imageObjects = images.map(img => typeof img === 'string' ? { url: img, alt: 'Post image' } : img);

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDelta = useRef(0);

  const handleSlideSwipe = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleSlideMove = useCallback((e: React.TouchEvent) => {
    touchDelta.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleSlideEnd = useCallback(() => {
    if (Math.abs(touchDelta.current) > 50) {
      if (touchDelta.current < 0 && currentSlide < imageUrls.length - 1) {
        setCurrentSlide(prev => prev + 1);
      } else if (touchDelta.current > 0 && currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
      }
    }
    touchDelta.current = 0;
  }, [currentSlide, imageUrls.length]);

  // Image layouts
  return (
    <>
      <div className={cn('relative', className)}>
        {/* Single Image */}
        {imageUrls.length === 1 && (
          <div 
            className="rounded-2xl overflow-hidden border border-border cursor-pointer"
            onClick={(e) => handleImageClick(e, 0)}
          >
            <img
              src={imageUrls[0]}
              alt={imageAlts[0]}
              loading="lazy"
              decoding="async"
              className="w-full max-h-[288px] object-cover hover:brightness-95 transition-all"
            />
          </div>
        )}

        {/* Two Images - Side by side */}
        {imageUrls.length === 2 && (
          <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-border">
            {imageUrls.map((image, index) => (
              <div
                key={index}
                className="relative aspect-[4/5] overflow-hidden cursor-pointer"
                onClick={(e) => handleImageClick(e, index)}
              >
                <img
                  src={image}
                  alt={imageAlts[index]}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover hover:brightness-95 transition-all"
                />
              </div>
            ))}
          </div>
        )}

        {/* 3+ Images - Horizontal swipeable slider */}
        {imageUrls.length >= 3 && (
          <div className="relative rounded-2xl overflow-hidden border border-border">
            <div
              ref={slideRef}
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              onTouchStart={handleSlideSwipe}
              onTouchMove={handleSlideMove}
              onTouchEnd={handleSlideEnd}
            >
              {imageUrls.map((image, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 cursor-pointer"
                  onClick={(e) => handleImageClick(e, index)}
                >
                  <img
                    src={image}
                    alt={imageAlts[index]}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-[288px] object-cover hover:brightness-95 transition-all"
                  />
                </div>
              ))}
            </div>
            {/* Dot indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imageUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all',
                    index === currentSlide ? 'bg-white w-3' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
            {/* Counter badge */}
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {currentSlide + 1}/{imageUrls.length}
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={imageObjects}
          initialIndex={lightboxIndex}
          onClose={(e) => {
            e?.stopPropagation();
            e?.preventDefault();
            setLightboxOpen(false);
          }}
        />
      )}
    </>
  );
});
