import { Skeleton } from '@/components/ui/skeleton';

// Feed Post Skeleton - matches actual post card layout
export const PostSkeleton = () => (
  <div className="border-b border-border p-4">
    <div className="flex gap-3">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-40 w-full rounded-lg mt-2" />
        <div className="flex items-center gap-6 mt-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  </div>
);

// Feed Skeleton - multiple posts
export const FeedContentSkeleton = () => (
  <div className="divide-y divide-border">
    {Array.from({ length: 5 }).map((_, i) => (
      <PostSkeleton key={i} />
    ))}
  </div>
);

// Chat List Item Skeleton
export const ChatItemSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  </div>
);

// Chat List Skeleton
export const ChatListContentSkeleton = () => (
  <div className="flex flex-col">
    {/* Stories header skeleton */}
    <div className="flex gap-3 px-4 py-3 border-b border-border overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-2 w-10" />
        </div>
      ))}
    </div>
    {/* Filter tabs skeleton */}
    <div className="flex gap-2 px-4 py-3 border-b border-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-16 rounded-full" />
      ))}
    </div>
    {/* Chat items */}
    {Array.from({ length: 8 }).map((_, i) => (
      <ChatItemSkeleton key={i} />
    ))}
  </div>
);

// Profile Header Skeleton
export const ProfileHeaderSkeleton = () => (
  <div className="space-y-4">
    {/* Banner */}
    <Skeleton className="h-32 w-full" />
    {/* Avatar and info */}
    <div className="px-4 -mt-12 relative">
      <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full max-w-xs" />
        <div className="flex gap-4 mt-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  </div>
);

// Profile Content Skeleton
export const ProfileContentSkeleton = () => (
  <div className="min-h-screen bg-background">
    <ProfileHeaderSkeleton />
    {/* Tabs */}
    <div className="flex border-b border-border mt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 flex-1" />
      ))}
    </div>
    {/* Posts */}
    <FeedContentSkeleton />
  </div>
);

// Notification Item Skeleton
export const NotificationItemSkeleton = () => (
  <div className="flex items-start gap-3 p-4 border-b border-border">
    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-3 w-32" />
    </div>
  </div>
);

// Notifications Content Skeleton
export const NotificationsContentSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-28" />
    </div>
    {Array.from({ length: 10 }).map((_, i) => (
      <NotificationItemSkeleton key={i} />
    ))}
  </div>
);

// Wallet Balance Card Skeleton
export const WalletBalanceSkeleton = () => (
  <div className="bg-primary/10 rounded-xl p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
    <Skeleton className="h-10 w-40" />
    <div className="flex gap-4">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

// Wallet Content Skeleton
export const WalletContentSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header */}
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center justify-between">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    {/* Balance hero */}
    <div className="bg-primary/20 p-6 space-y-4">
      <div className="text-center space-y-2">
        <Skeleton className="h-4 w-24 mx-auto" />
        <Skeleton className="h-12 w-40 mx-auto" />
      </div>
      <div className="flex justify-center gap-8">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16 mx-auto" />
          <Skeleton className="h-5 w-20 mx-auto" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16 mx-auto" />
          <Skeleton className="h-5 w-20 mx-auto" />
        </div>
      </div>
      <div className="flex justify-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
    {/* Cards */}
    <div className="p-4 space-y-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      {/* Transactions */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Gift Card Skeleton
export const GiftCardSkeleton = () => (
  <div className="p-3 rounded-xl border border-border space-y-2">
    <Skeleton className="aspect-square w-full rounded-lg" />
    <Skeleton className="h-4 w-20 mx-auto" />
    <Skeleton className="h-3 w-16 mx-auto" />
  </div>
);

// Gifts Content Skeleton
export const GiftsContentSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-16" />
    </div>
    {/* Tabs */}
    <div className="flex border-b border-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 flex-1" />
      ))}
    </div>
    {/* Grid */}
    <div className="p-4 grid grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <GiftCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Search Content Skeleton
export const SearchContentSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="p-4 space-y-4">
      <Skeleton className="h-10 w-full rounded-full" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Premium Page Skeleton
export const PremiumContentSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-24" />
    </div>
    {/* Hero */}
    <div className="p-6 space-y-4">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border space-y-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-10 w-28" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Checkout Skeleton
export const CheckoutContentSkeleton = () => (
  <div className="min-h-screen bg-background p-4 space-y-4">
    <Skeleton className="h-8 w-32" />
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
    <div className="space-y-2 pt-4">
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  </div>
);

// Order List Skeleton
export const OrderListSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  </div>
);

// Admin Dashboard Skeleton
export const AdminDashboardSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-36" />
    </div>
    <div className="p-4 space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  </div>
);

// Generic Page Skeleton - for pages without specific skeletons
export const GenericPageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="p-4 space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

// Home Skeleton - for initial home page load
export const HomeContentSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Banner placeholder */}
    <Skeleton className="h-12 w-full" />
    {/* Feed */}
    <FeedContentSkeleton />
  </div>
);

// Mini Programs Grid Skeleton
export const MiniProgramsSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="p-4 grid grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  </div>
);

// Settings Skeleton
export const SettingsSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center">
      <Skeleton className="h-6 w-20" />
    </div>
    <div className="p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-border">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  </div>
);
