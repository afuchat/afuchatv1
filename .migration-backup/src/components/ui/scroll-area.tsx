import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  scrollbarVariant?: 'default' | 'premium' | 'auto-hide' | 'thin';
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, scrollbarVariant = 'default', ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport>
    <ScrollBar variant={scrollbarVariant} />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

interface ScrollBarProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {
  variant?: 'default' | 'premium' | 'auto-hide' | 'thin';
}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, orientation = "vertical", variant = 'default', ...props }, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'premium':
        return '[&>div]:bg-gradient-to-b [&>div]:from-primary/40 [&>div]:to-primary/30 [&>div]:shadow-[0_0_8px_hsl(var(--primary)/0.2)]';
      case 'thin':
        return orientation === 'vertical' ? 'w-1.5 md:w-2' : 'h-1.5 md:h-2';
      case 'auto-hide':
        return 'opacity-0 hover:opacity-100 transition-opacity duration-200';
      default:
        return '';
    }
  };

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px] md:w-3",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px] md:h-3",
        getVariantClasses(),
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb 
        className={cn(
          "relative flex-1 rounded-full transition-colors",
          variant === 'premium' 
            ? "bg-gradient-to-b from-primary/40 to-primary/30 hover:from-primary/60 hover:to-primary/50"
            : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
        )} 
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
});
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
