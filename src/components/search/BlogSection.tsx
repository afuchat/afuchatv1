import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Clock, 
  Eye, 
  Sparkles, 
  ChevronRight,
  Flame
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  views_count: number;
  reading_time_minutes: number;
  ai_summary: string | null;
  published_at: string | null;
  is_featured: boolean;
}

export const BlogSection = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loadingRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  const fetchArticles = useCallback(async (pageNum: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, title, slug, excerpt, cover_image, category, tags, views_count, reading_time_minutes, ai_summary, published_at, is_featured')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        if (append) {
          setArticles(prev => [...prev, ...data]);
        } else {
          setArticles(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error fetching blog articles:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchArticles(0);
  }, [fetchArticles]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchArticles(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, page, fetchArticles]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMM d');
  };

  if (loading && articles.length === 0) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 flex gap-3">
            <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-base font-semibold mb-1">No Articles Yet</h3>
        <p className="text-muted-foreground text-sm">
          Check back soon for fresh content from AfuChat
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-[20px] font-extrabold text-foreground">Live Blogs</h2>
        <Link 
          to="/blog" 
          className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
        >
          See all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {articles.map((article, index) => (
        <motion.div
          key={article.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.03 }}
        >
          <Link to={`/blog/${article.slug}`}>
            <div className="p-4 hover:bg-muted/50 transition-colors flex gap-3">
              {article.cover_image ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={article.cover_image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {article.category}
                  </Badge>
                  {article.is_featured && (
                    <Flame className="h-3 w-3 text-accent" />
                  )}
                </div>
                
                <h3 className="font-semibold text-[15px] line-clamp-2 text-foreground mb-1">
                  {article.title}
                </h3>
                
                {article.ai_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="truncate">{article.ai_summary}</span>
                  </p>
                )}
                
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {article.reading_time_minutes}m
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Eye className="h-2.5 w-2.5" />
                    {article.views_count}
                  </span>
                  <span>{formatDate(article.published_at)}</span>
                </div>
              </div>
              
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        </motion.div>
      ))}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerRef} className="p-4 flex justify-center">
          <div className="animate-pulse flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span>Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
};
