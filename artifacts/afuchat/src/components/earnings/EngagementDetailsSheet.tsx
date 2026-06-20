import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Eye, Heart, MessageCircle, TrendingUp, Calendar, BarChart3, Ban, Gift, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
interface EngagementDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'views' | 'likes' | 'replies' | 'total';
  post: {
    id: string;
    content: string;
    created_at: string;
    view_count: number;
    likes_count: number;
    replies_count: number;
    engagement_score: number;
    total_views: number;
    total_likes: number;
    total_replies: number;
    total_engagement_score: number;
    days_active: number;
    estimated_total_earnings: number;
  } | null;
  isEligible?: boolean;
}

export function EngagementDetailsSheet({ open, onOpenChange, type, post, isEligible = false }: EngagementDetailsSheetProps) {
  if (!post) return null;

  const getTitle = () => {
    switch (type) {
      case 'views': return 'Views Details';
      case 'likes': return 'Likes Details';
      case 'replies': return 'Replies Details';
      case 'total': return 'Engagement Summary';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'views': return <Eye className="h-5 w-5 text-blue-500" />;
      case 'likes': return <Heart className="h-5 w-5 text-red-500" />;
      case 'replies': return <MessageCircle className="h-5 w-5 text-green-500" />;
      case 'total': return <BarChart3 className="h-5 w-5 text-primary" />;
    }
  };

  const getTodayValue = () => {
    switch (type) {
      case 'views': return post.view_count;
      case 'likes': return post.likes_count;
      case 'replies': return post.replies_count;
      case 'total': return post.engagement_score;
    }
  };

  const getTotalValue = () => {
    switch (type) {
      case 'views': return post.total_views;
      case 'likes': return post.total_likes;
      case 'replies': return post.total_replies;
      case 'total': return post.total_engagement_score;
    }
  };

  const getMultiplier = () => {
    switch (type) {
      case 'views': return 1;
      case 'likes': return 3;
      case 'replies': return 5;
      case 'total': return 1;
    }
  };

  const todayValue = getTodayValue();
  const totalValue = getTotalValue();
  const multiplier = getMultiplier();
  const todayPoints = type === 'total' ? todayValue : todayValue * multiplier;
  const totalPoints = type === 'total' ? totalValue : totalValue * multiplier;

  // Calculate today's potential earnings from this post
  const dailyPool = 5000;
  const estimatedTodayEarnings = todayPoints > 0 ? Math.round((todayPoints / Math.max(todayPoints * 10, 100)) * dailyPool * 0.1) : 0;
  
  // Calculate total missed earnings (when user wasn't eligible)
  const totalMissedEarnings = !isEligible ? post.estimated_total_earnings : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[80vh] overflow-hidden"
        onOpenChange={onOpenChange}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-80px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Post Preview */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm line-clamp-2 mb-2">{post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Posted {format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                <span>•</span>
                <span>{post.days_active} day{post.days_active !== 1 ? 's' : ''} active</span>
              </div>
            </div>

            {/* Today's Engagement & Earnings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Today's {type === 'total' ? 'Total Engagement' : type.charAt(0).toUpperCase() + type.slice(1)}
              </h3>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-600">+{todayValue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {type !== 'total' && `= ${todayPoints.toLocaleString()} points (×${multiplier} multiplier)`}
                      {type === 'total' && 'engagement points'}
                    </p>
                  </div>
                  {getIcon()}
                </div>
              </div>

              {/* Today's Earnings */}
              <div className={`p-4 rounded-lg ${isEligible ? 'bg-primary/10 border border-primary/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {isEligible ? "Today's Credited Earnings" : "Today's Potential Earnings"}
                    </p>
                    <p className={`text-2xl font-bold ${isEligible ? 'text-primary' : 'text-yellow-600'}`}>
                      ~{estimatedTodayEarnings.toLocaleString()} UGX
                    </p>
                  </div>
                  {isEligible ? (
                    <Gift className="h-6 w-6 text-primary" />
                  ) : (
                    <Ban className="h-6 w-6 text-yellow-600" />
                  )}
                </div>
                {!isEligible && (
                  <p className="text-xs text-yellow-700 mt-2">
                    ⚠️ Not credited — you're not yet eligible for the creator program
                  </p>
                )}
              </div>
            </div>

            {/* Total Earned / Missed */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Lifetime Stats
              </h3>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      All-time {type === 'total' ? 'Engagement' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </p>
                    <p className="text-3xl font-bold text-primary">{totalValue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {type !== 'total' && `= ${totalPoints.toLocaleString()} total points`}
                      {type === 'total' && 'total engagement points'}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Estimated Total Earned */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">~{isEligible ? post.estimated_total_earnings.toLocaleString() : 0}</p>
                  <p className="text-xs text-muted-foreground">Total Earned (UGX)</p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">~{totalMissedEarnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Missed (UGX)</p>
                </div>
              </div>

              {!isEligible && totalMissedEarnings > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">
                    You've missed approximately <strong>{totalMissedEarnings.toLocaleString()} UGX</strong> in earnings because you weren't eligible during this post's lifetime. Become eligible now to stop missing out!
                  </p>
                </div>
              )}
            </div>

            {/* Breakdown for total */}
            {type === 'total' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Score Breakdown (All-time)</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Views</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{post.total_views.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-2">×1 = {post.total_views.toLocaleString()} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Likes</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{post.total_likes.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-2">×3 = {(post.total_likes * 3).toLocaleString()} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Replies</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{post.total_replies.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-2">×5 = {(post.total_replies * 5).toLocaleString()} pts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress to daily pool */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Today's share of 5,000 UGX pool</span>
                <span className="font-medium">{todayPoints > 0 ? 'Active' : 'No activity'}</span>
              </div>
              <Progress value={todayPoints > 0 ? Math.min(100, (todayPoints / 100) * 10) : 0} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Higher engagement = bigger share of daily pool
              </p>
            </div>

            {/* Important Note */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Only today's engagement counts toward daily payouts. Earnings are credited only if you're eligible (10+ followers, 500+ weekly views). Past engagement cannot be retroactively credited.
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
