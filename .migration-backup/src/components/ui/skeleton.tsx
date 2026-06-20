import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "rounded-xl bg-muted animate-pulse",
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };