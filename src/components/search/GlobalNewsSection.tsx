import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Heart, Share2, MoreVertical, Clock, Newspaper, Loader2 } from 'lucide-react';
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

const FAVICON_SIZE = 64;

const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${FAVICON_SIZE}&v=1`;
  } catch {
    return null;
  }
};

export const GlobalNewsSection = ({ category = 'general' }: GlobalNewsSectionProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchNews = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: { 
          category,
          country: 'us',
          pageSize: 10,
          page: pageNum
        },
      });

      if (error) {
        console.error('Error fetching news:', error);
        return;
      }

      if (data?.success && data.articles) {
        if (append) {
          setNews(prev => [...prev, ...data.articles]);
        } else {
          setNews(data.articles);
        }
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
      } else if (data?.error) {
        console.log('News API:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [category]);

  useEffect(() => {
    setNews([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    fetchNews(1, false);
  }, [category]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchNews(page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchNews]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchNews(1, false);
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch {
      return 'Recently';
    }
  };

  const handleShare = async (item: NewsItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleOpenArticle = (item: NewsItem) => {
    window.open(item.url, '_blank', 'noopener,noreferrer');
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
            <Card 
              className="mx-4 mb-4 overflow-hidden border-border/50 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleOpenArticle(item)}
            >
              {/* Source Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {getFaviconUrl(item.url) ? (
                      <img 
                        src={getFaviconUrl(item.url)!} 
                        alt={item.source}
                        className="h-5 w-5 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Newspaper className={`h-3.5 w-3.5 text-muted-foreground ${getFaviconUrl(item.url) ? 'hidden' : ''}`} />
                  </div>
                  <span className="font-medium text-sm text-foreground">{item.source}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '';
                      target.style.display = 'none';
                      target.parentElement?.classList.add('fallback-active');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                  <Newspaper className="h-16 w-16 text-primary/30" />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-base leading-tight text-foreground line-clamp-2">
                  {item.title}
                </h3>
                
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">{getTimeAgo(item.publishedAt)}</span>
                    {item.author && (
                      <>
                        <span className="text-xs">•</span>
                        <span className="text-xs truncate max-w-[100px]">{item.author}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={(e) => handleShare(item, e)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="px-4 py-6 flex justify-center">
        {loadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more stories...</span>
          </div>
        )}
      </div>
    </div>
  );
};
