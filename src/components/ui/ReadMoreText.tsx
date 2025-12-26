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
  minCharsToShow = 200, // Default: only show Read more for content > 200 chars
  className = '' 
}: ReadMoreTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Ensure text is safely renderable
  const safeText = toRenderableText(text);
  
  // Get plain text length for minimum threshold check
  const plainTextLength = typeof text === 'string' 
    ? text.length 
    : (typeof safeText === 'string' ? safeText.length : 0);

  useEffect(() => {
    if (contentRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(contentRef.current).lineHeight) || 20;
      const height = contentRef.current.scrollHeight;
      const lines = height / lineHeight;
      
      // Only show button if content exceeds maxLines AND exceeds minimum character threshold
      setShouldShowButton(lines > maxLines && plainTextLength > minCharsToShow);
    }
  }, [safeText, maxLines, plainTextLength, minCharsToShow]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className={`overflow-hidden transition-all ${
          !isExpanded && shouldShowButton ? `line-clamp-${maxLines}` : ''
        }`}
        style={!isExpanded && shouldShowButton ? { 
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
        } : {}}
      >
        {safeText}
      </div>
      {shouldShowButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-primary hover:text-primary/80 p-0 h-auto font-normal mt-1"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  );
};
