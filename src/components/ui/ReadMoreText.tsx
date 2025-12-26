import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { toRenderableText } from '@/lib/textUtils';

interface ReadMoreTextProps {
  text: React.ReactNode;
  maxLines?: number;
  minCharsToShow?: number; // Minimum characters before showing Read more
  className?: string;
}

export const ReadMoreText = ({
  text,
  maxLines = 4,
  minCharsToShow = 200,
  className = '',
}: ReadMoreTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Ensure text is safely renderable
  const safeText = toRenderableText(text);

  // Get plain text length for minimum threshold check
  const plainTextLength = typeof text === 'string'
    ? text.length
    : typeof safeText === 'string'
      ? safeText.length
      : 0;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const evaluate = () => {
      // When collapsed, we clamp via inline styles below; overflow is detectable via scrollHeight > clientHeight.
      const isOverflowing = el.scrollHeight > el.clientHeight + 1;
      setShouldShowButton(isOverflowing && plainTextLength >= minCharsToShow);
    };

    // Evaluate once after paint
    const raf = requestAnimationFrame(evaluate);

    // Re-evaluate on resize/content changes
    const ro = new ResizeObserver(() => evaluate());
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [safeText, maxLines, plainTextLength, minCharsToShow, isExpanded]);

  const clampStyle = !isExpanded
    ? {
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }
    : undefined;

  return (
    <div className={className}>
      <div ref={contentRef} style={clampStyle} className="transition-all">
        {safeText}
      </div>
      {shouldShowButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded((v) => !v);
          }}
          className="text-primary hover:text-primary/80 p-0 h-auto font-normal mt-1"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  );
};
