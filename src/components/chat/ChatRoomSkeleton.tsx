import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatRoomSkeletonProps {
  isEmbedded?: boolean;
  onBack?: () => void;
}

export const ChatRoomSkeleton = ({ isEmbedded = false, onBack }: ChatRoomSkeletonProps) => {
  return (
    <div className={`flex flex-col bg-background ${isEmbedded ? 'h-full relative' : 'fixed inset-0'}`}>
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-3 py-3 bg-background border-b border-border z-10 pt-[env(safe-area-inset-top)]">
        {!isEmbedded && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/50"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </header>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Received message */}
        <div className="flex gap-2 max-w-[80%]">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-16 w-48 rounded-2xl rounded-tl-sm" />
        </div>
        {/* Sent message */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-40 rounded-2xl rounded-tr-sm" />
        </div>
        {/* Received message */}
        <div className="flex gap-2 max-w-[80%]">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-20 w-56 rounded-2xl rounded-tl-sm" />
        </div>
        {/* Sent message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32 rounded-2xl rounded-tr-sm" />
        </div>
        {/* Received message */}
        <div className="flex gap-2 max-w-[80%]">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-14 w-44 rounded-2xl rounded-tl-sm" />
        </div>
      </div>

      {/* Input Area Placeholder */}
      <div className="flex-shrink-0 bg-background border-t border-border px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
};
