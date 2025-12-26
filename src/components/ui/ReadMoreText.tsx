import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { toRenderableText } from '@/lib/textUtils';

interface ReadMoreTextProps {
  text: React.ReactNode;
  maxLines?: number;
  minCharsToShow?: number; // Minimum characters before showing Read more
  className?: string;
}

// Helper to extract plain text from React nodes
const extractPlainText = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  
  if (Array.isArray(node)) {
    return node.map(extractPlainText).join('');
  }
  
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as any).props;
    if (props?.children) {
      return extractPlainText(props.children);
    }
  }
  
  return '';
};

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

  // Get plain text length - extract from React nodes properly
  const plainTextLength = extractPlainText(text).length;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // If text is too short, never show the button
    if (plainTextLength < minCharsToShow) {
      setShouldShowButton(false);
      return;
    }

    const evaluate = () => {
      // When collapsed, check if content overflows
      const isOverflowing = el.scrollHeight > el.clientHeight + 1;
      setShouldShowButton(isOverflowing);
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
