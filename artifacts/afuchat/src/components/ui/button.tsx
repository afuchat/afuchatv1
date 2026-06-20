import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[15px] font-medium transition-all duration-200 ease-premium focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-soft-lg",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-muted hover:border-muted-foreground/20",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted active:bg-muted/80",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow-sm hover:shadow-glow hover:scale-[1.02]",
        glass: "bg-card/80 backdrop-blur-xl border border-border/50 hover:bg-card/90",
      },
      size: {
        default: "h-11 px-5 py-2.5 rounded-xl",
        sm: "h-10 px-4 rounded-lg text-[14px]",
        lg: "h-12 px-8 rounded-xl text-base",
        xl: "h-14 px-10 rounded-2xl text-lg font-semibold",
        icon: "h-11 w-11 rounded-xl [&_svg]:size-[22px]",
        "icon-sm": "h-9 w-9 rounded-lg [&_svg]:size-5",
        "icon-lg": "h-12 w-12 rounded-xl [&_svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };