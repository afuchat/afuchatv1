import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
  variant?: 'default' | 'centered' | 'full';
}

export const PageSkeleton = ({ variant = 'default' }: PageSkeletonProps) => {
  if (variant === 'centered') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <Skeleton className="h-8 w-8 rounded-full mb-3" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
};

export const InlineSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center py-8 ${className || ''}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
};

export const CardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={`p-4 rounded-lg border border-border ${className || ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded" />
    </div>
  );
};

export const ListSkeleton = ({ rows = 5, className }: { rows?: number; className?: string }) => {
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SectionSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={`py-8 ${className || ''}`}>
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  );
};

export const ButtonSkeleton = ({ className }: { className?: string }) => {
  return <Skeleton className={`h-9 w-20 rounded-md ${className || ''}`} />;
};
