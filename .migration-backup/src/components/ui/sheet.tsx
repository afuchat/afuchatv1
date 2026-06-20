import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";
import { motion, PanInfo } from "framer-motion";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

interface SheetOverlayProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> {
  zIndex?: string;
}

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  SheetOverlayProps
>(({ className, zIndex = "z-40", ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      `fixed inset-0 ${zIndex} bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-all duration-300`,
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-[100] gap-4 bg-card shadow-soft-xl transition-all ease-premium flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 max-h-[85vh] border-b border-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top rounded-b-3xl",
        bottom:
          "inset-x-0 bottom-0 h-[85vh] border-t border-border data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom rounded-t-3xl",
        left: "inset-y-0 left-0 h-full w-3/4 border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm rounded-r-3xl p-6",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm rounded-l-3xl p-6",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  onOpenChange?: (open: boolean) => void;
  hideCloseButton?: boolean;
  overlayClassName?: string;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, onOpenChange, hideCloseButton = false, overlayClassName, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const isBottom = side === "bottom";

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      if (isBottom && (info.offset.y > 100 || info.velocity.y > 500)) {
        onOpenChange?.(false);
      }
    };

    // Lock body scroll when bottom sheet is open
    React.useEffect(() => {
      if (isBottom) {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        return () => {
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
        };
      }
    }, [isBottom]);

    const handleTouchMove = (e: React.TouchEvent) => {
      e.stopPropagation();
    };

    const content = isBottom ? (
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.15 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className="w-full h-full flex flex-col overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
      >
        {/* Premium drag handle */}
        <div className="flex justify-center pt-4 pb-2 flex-shrink-0">
          <motion.div 
            className="w-10 h-1 rounded-full bg-border hover:bg-muted-foreground/40 transition-colors cursor-grab active:cursor-grabbing"
            whileHover={{ scaleX: 1.1 }}
            whileTap={{ scaleX: 0.95 }}
          />
        </div>
        <div 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-6 overscroll-contain touch-pan-y" 
          style={{ WebkitOverflowScrolling: 'touch' }}
          onTouchMove={handleTouchMove}
        >
          {children}
        </div>
      </motion.div>
    ) : (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </motion.div>
    );

    return (
      <SheetPortal>
        <SheetOverlay className={overlayClassName} />
        <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
          {content}
          {!isBottom && !hideCloseButton && (
            <SheetPrimitive.Close className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center opacity-70 transition-all hover:opacity-100 hover:bg-muted/80 focus:outline-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-xl font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};