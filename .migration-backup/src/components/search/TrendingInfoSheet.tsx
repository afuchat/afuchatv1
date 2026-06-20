import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TrendingUp, Hash, MessageSquare, Users, ExternalLink, Sparkles, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';

interface TrendingInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trend: {
    topic: string;
    post_count: number;
    category?: string;
    relatedHashtags?: string[];
    topPosts?: Array<{
      id: string;
      content: string;
      author: string;
    }>;
  } | null;
  onSearchTopic: (topic: string) => void;
}

export const TrendingInfoSheet = ({ 
  open, 
  onOpenChange, 
  trend, 
  onSearchTopic 
}: TrendingInfoSheetProps) => {
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const formatPostCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const generateAISummary = async () => {
    if (!isPremium) {
      toast.error('AI Summary is a premium feature');
      navigate('/premium');
      return;
    }

    if (!trend) return;

    setLoadingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: {
          message: `Provide a brief 2-3 sentence summary about the trending topic "${trend.topic}" on social media. What are people discussing about this topic and why is it trending? Keep it informative and neutral.`,
          context: 'trending_summary'
        }
      });

      if (error) throw error;
      setAiSummary(data?.reply || 'Unable to generate summary');
    } catch (error) {
      console.error('AI Summary error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  if (!trend) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-primary" />
            {trend.topic}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-bold text-foreground">{formatPostCount(trend.post_count)}</span>
                <span className="text-muted-foreground ml-1">posts</span>
              </span>
            </div>
            {trend.category && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{trend.category}</span>
              </div>
            )}
          </div>

          {/* AI Summary Section */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">AfuAI Summary</span>
              </div>
              {!isPremium && (
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Crown className="h-3 w-3" />
                  <span>Premium</span>
                </div>
              )}
            </div>
            
            {aiSummary ? (
              <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
            ) : loadingSummary ? (
              <div className="flex items-center justify-center py-4">
                <CustomLoader size="sm" />
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={generateAISummary}
                className="w-full"
                disabled={loadingSummary}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Summary
                {!isPremium && <Crown className="h-3 w-3 ml-2 text-amber-500" />}
              </Button>
            )}
          </div>

          {/* Related Hashtags */}
          {trend.relatedHashtags && trend.relatedHashtags.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Related Hashtags
              </h3>
              <div className="flex flex-wrap gap-2">
                {trend.relatedHashtags.map((hashtag, idx) => (
                  <Button
                    key={idx}
                    variant="secondary"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => {
                      onSearchTopic(hashtag);
                      onOpenChange(false);
                    }}
                  >
                    #{hashtag}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Top Posts Preview */}
          {trend.topPosts && trend.topPosts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top Posts
              </h3>
              <div className="space-y-2">
                {trend.topPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    className="bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      navigate(`/post/${post.id}`);
                      onOpenChange(false);
                    }}
                  >
                    <p className="text-xs text-muted-foreground mb-1">@{post.author}</p>
                    <p className="text-sm line-clamp-2">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                onSearchTopic(trend.topic);
                onOpenChange(false);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All Posts
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/search')}
            >
              See More Trends
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
