import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Heart, Share2, MoreVertical, Clock, Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  image?: string;
  publishedAt?: string;
  author?: string;
}

interface GlobalNewsSectionProps {
  category?: 'general' | 'technology' | 'sports' | 'entertainment' | 'business';
}

export const GlobalNewsSection = ({ category = 'general' }: GlobalNewsSectionProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: { 
          category,
          country: 'us',
          pageSize: 15 
        },
      });

      if (error) {
        console.error('Error fetching news:', error);
        return;
      }

      if (data?.success && data.articles) {
        setNews(data.articles);
      } else if (data?.error) {
        console.log('News API:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch {
      return 'Recently';
    }
  };

  const handleShare = async (item: NewsItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: item.url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(item.url);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Top Stories</span>
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">No news available</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Top Stories</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-9 w-9"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* News Cards */}
      <AnimatePresence mode="popLayout">
        {news.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="mx-4 mb-4 overflow-hidden border-border/50 bg-card hover:bg-muted/30 transition-colors">
              {/* Source Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-bold text-foreground">
                      {item.source.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium text-sm text-foreground">{item.source}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Image */}
              {item.image ? (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </a>
              ) : (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative aspect-[16/9] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <Newspaper className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </a>
              )}

              {/* Content */}
              <div className="p-4">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <h3 className="font-bold text-lg leading-tight text-foreground line-clamp-2 hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                </a>
                
                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-sm">{getTimeAgo(item.publishedAt)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-red-500"
                    >
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-primary"
                      onClick={() => handleShare(item)}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* View More */}
      <div className="px-4 pb-4">
        <Button 
          variant="ghost" 
          className="w-full text-primary hover:text-primary/80 hover:bg-primary/10"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Stories
        </Button>
      </div>
    </div>
  );
};
