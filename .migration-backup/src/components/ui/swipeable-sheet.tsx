import * as React from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SwipeableSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Title displayed in the header */
  title?: string;
  /** Description displayed below the title */
  description?: string;
  /** Side from which the sheet appears. Default: "bottom" */
  side?: 'bottom' | 'left' | 'right' | 'top';
  /** Custom className for the content container */
  className?: string;
  /** Whether to show a close button (for left/right sheets) */
  showCloseButton?: boolean;
  /** Disable swipe to close */
  disableSwipe?: boolean;
  /** Custom snap points for bottom sheets */
  snapPoints?: (number | string)[];
  /** Active snap point index */
  activeSnapPoint?: number | string | null;
  /** Callback when snap point changes */
  onSnapPointChange?: (snapPoint: number | string) => void;
}

const SwipeableSheet = ({
  open,
  onOpenChange,
  children,
  title,
  description,
  side = 'bottom',
  className,
  showCloseButton = false,
  disableSwipe = false,
  snapPoints: customSnapPoints,
  activeSnapPoint: customActiveSnapPoint,
  onSnapPointChange: customOnSnapPointChange,
}: SwipeableSheetProps) => {
  const isHorizontal = side === 'left' || side === 'right';
  const isBottom = side === 'bottom';
  
  // Use custom snap points or default to auto-expanding behavior for bottom sheets
  const defaultSnapPoints = isBottom ? [0.5, 1] : undefined;
  const snapPoints = customSnapPoints ?? defaultSnapPoints;
  
  const [activeSnapPoint, setActiveSnapPoint] = React.useState<number | string | null>(
    customActiveSnapPoint ?? (snapPoints ? snapPoints[0] : null)
  );

  // Reset snap point when sheet opens
  React.useEffect(() => {
    if (open && snapPoints) {
      setActiveSnapPoint(snapPoints[0]);
    }
  }, [open, snapPoints]);

  const handleSnapPointChange = (snapPoint: number | string) => {
    setActiveSnapPoint(snapPoint);
    customOnSnapPointChange?.(snapPoint);
  };

  const isFullScreen = activeSnapPoint === 1;

  // Get direction based on side
  const getDirection = () => {
    switch (side) {
      case 'left':
        return 'left';
      case 'right':
        return 'right';
      case 'top':
        return 'top';
      default:
        return 'bottom';
    }
  };

  const getContentStyles = () => {
    const baseStyles = 'bg-background flex flex-col focus:outline-none';
    
    switch (side) {
      case 'left':
        return cn(
          baseStyles,
          'fixed inset-y-0 left-0 h-full w-[85%] max-w-sm rounded-r-3xl border-r border-border'
        );
      case 'right':
        return cn(
          baseStyles,
          'fixed inset-y-0 right-0 h-full w-[85%] max-w-sm rounded-l-3xl border-l border-border'
        );
      case 'top':
        return cn(
          baseStyles,
          'fixed inset-x-0 top-0 max-h-[85vh] rounded-b-3xl border-b border-border'
        );
      default:
        return cn(
          baseStyles,
          'fixed inset-x-0 bottom-0 h-full',
          isFullScreen ? 'rounded-none' : 'rounded-t-3xl border-t border-border'
        );
    }
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={getDirection()}
      dismissible={!disableSwipe}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={handleSnapPointChange}
      fadeFromIndex={snapPoints ? 0 : undefined}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Drawer.Content
          className={cn(
            getContentStyles(),
            'z-50 shadow-2xl transition-[border-radius] duration-200',
            className
          )}
        >
          {/* Drag handle for bottom/top sheets */}
          {!isHorizontal && !disableSwipe && (
            <div className="flex justify-center pt-4 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
            </div>
          )}

          {/* Header with title and description */}
          {(title || description) && (
            <div className={cn(
              'flex-shrink-0 px-6',
              isHorizontal ? 'pt-6 pb-4' : 'pb-4',
              (title || description) && 'border-b border-border/40'
            )}>
              {title && (
                <Drawer.Title className="text-xl font-semibold text-foreground">
                  {title}
                </Drawer.Title>
              )}
              {description && (
                <Drawer.Description className="text-sm text-muted-foreground mt-1">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}

          {/* Scrollable content area */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>

          {/* Close button for horizontal sheets */}
          {isHorizontal && showCloseButton && (
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center opacity-70 transition-all hover:opacity-100 hover:bg-muted/80 focus:outline-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

// Sub-components for flexible composition
const SwipeableSheetHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 px-6 pb-4', className)}
    {...props}
  >
    {children}
  </div>
);

const SwipeableSheetTitle = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn('text-xl font-semibold text-foreground', className)}
    {...props}
  >
    {children}
  </h2>
);

const SwipeableSheetDescription = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  >
    {children}
  </p>
);

const SwipeableSheetContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 pb-6', className)} {...props}>
    {children}
  </div>
);

const SwipeableSheetFooter = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex-shrink-0 border-t border-border/40 p-6 bg-background mt-auto',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export {
  SwipeableSheet,
  SwipeableSheetHeader,
  SwipeableSheetTitle,
  SwipeableSheetDescription,
  SwipeableSheetContent,
  SwipeableSheetFooter,
};
