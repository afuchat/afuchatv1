import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Newspaper, 
  BookOpen, 
  Heart,
  MessageCircle,
  Clock,
  User,
  Sparkles,
  Eye,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { VerifiedBadge } from '@/components/VerifiedBadge';

type FeedItemType = 'post' | 'news' | 'blog';

interface FeedItem {
  id: string;
  type: FeedItemType;
  data: TrendingPost | NewsItem | BlogArticle;
  priority: number;
  createdAt: Date;
}

interface TrendingPost {
  id: string;
  content: string;
  created_at: string;
  image_url?: string;
  like_count: number;
  reply_count: number;
  view_count: number;
  author: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url?: string;
    is_verified?: boolean;
    is_organization_verified?: boolean;
  };
  post_images?: { id: string; image_url: string; display_order: number }[];
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  image?: string;
  publishedAt?: string;
}

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  ai_summary: string | null;
  reading_time_minutes: number;
  published_at: string | null;
}

const FAVICON_SIZE = 32;

const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${FAVICON_SIZE}`;
  } catch {
    return null;
  }
};

async function fetchTrendingPosts(pageNum: number): Promise<TrendingPost[]> {
  // Fetch posts sorted by view_count
  const { data: posts, error } = await (supabase as any)
    .from('posts')
    .select('id, content, created_at, image_url, view_count, author_id')
    .eq('is_deleted', false)
    .order('view_count', { ascending: false })
    .order('created_at', { ascending: false })
    .range(pageNum * 5, (pageNum + 1) * 5 - 1);

  if (error || !posts || posts.length === 0) return [];

  // Get unique author IDs
  const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))] as string[];
  
  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, handle, avatar_url, is_verified, is_organization_verified')
    .in('id', authorIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Fetch post images
  const postIds = posts.map(p => p.id);
  const { data: images } = await supabase
    .from('post_images')
    .select('id, post_id, image_url, display_order')
    .in('post_id', postIds);

  const imagesMap = new Map<string, typeof images>();
  (images || []).forEach(img => {
    const existing = imagesMap.get(img.post_id) || [];
    existing.push(img);
    imagesMap.set(img.post_id, existing);
  });

  // Fetch acknowledgment (like) counts
  const { data: acks } = await supabase
    .from('post_acknowledgments')
    .select('post_id')
    .in('post_id', postIds);

  const likeCountMap = new Map<string, number>();
  (acks || []).forEach(ack => {
    likeCountMap.set(ack.post_id, (likeCountMap.get(ack.post_id) || 0) + 1);
  });

  // Fetch reply counts
  const { data: replies } = await supabase
    .from('post_replies')
    .select('post_id')
    .in('post_id', postIds);

  const replyCountMap = new Map<string, number>();
  (replies || []).forEach(reply => {
    replyCountMap.set(reply.post_id, (replyCountMap.get(reply.post_id) || 0) + 1);
  });

  // Build result
  const result: TrendingPost[] = [];
  posts.forEach(post => {
    const author = profileMap.get(post.author_id);
    if (author) {
      result.push({
        id: post.id,
        content: post.content || '',
        created_at: post.created_at,
        image_url: post.image_url || undefined,
        like_count: likeCountMap.get(post.id) || 0,
        reply_count: replyCountMap.get(post.id) || 0,
        view_count: post.view_count || 0,
        author: {
          id: author.id,
          display_name: author.display_name || 'Unknown',
          handle: author.handle || 'unknown',
          avatar_url: author.avatar_url || undefined,
          is_verified: author.is_verified || false,
          is_organization_verified: author.is_organization_verified || false
        },
        post_images: (imagesMap.get(post.id) || []).map(img => ({
          id: img.id,
          image_url: img.image_url,
          display_order: img.display_order
        }))
      });
    }
  });

  return result;
}

export const ForYouFeed = ({ onPostClick }: { onPostClick: (postId: string) => void }) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const fetchMixedContent = useCallback(async (pageNum: number, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    if (append) setLoadingMore(true);

    try {
      const items: FeedItem[] = [];

      // Fetch trending posts
      const trendingPosts = await fetchTrendingPosts(pageNum);
      trendingPosts.forEach(post => {
        items.push({
          id: `post-${post.id}`,
          type: 'post',
          data: post,
          priority: post.like_count + post.view_count,
          createdAt: new Date(post.created_at)
        });
      });

      // Fetch news (only on first page or every 3rd page)
      if (pageNum % 3 === 0) {
        try {
          const { data: newsData } = await supabase.functions.invoke('fetch-news', {
            body: { category: 'general', pageSize: 3, page: Math.floor(pageNum / 3) + 1 }
          });
          
          (newsData?.articles || []).forEach((article: NewsItem, idx: number) => {
            items.push({
              id: `news-${article.id || idx}-${pageNum}`,
              type: 'news',
              data: article,
              priority: 100 - idx,
              createdAt: article.publishedAt ? new Date(article.publishedAt) : new Date()
            });
          });
        } catch (e) {
          console.log('News fetch error:', e);
        }
      }

      // Fetch blog articles (only on first page or every 2nd page)
      if (pageNum % 2 === 0) {
        const { data: blogArticles } = await supabase
          .from('blog_articles')
          .select('id, title, slug, excerpt, cover_image, category, ai_summary, reading_time_minutes, published_at')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .range(Math.floor(pageNum / 2) * 2, Math.floor(pageNum / 2) * 2 + 1);

        (blogArticles || []).forEach((article) => {
          items.push({
            id: `blog-${article.id}`,
            type: 'blog',
            data: article as BlogArticle,
            priority: 80,
            createdAt: article.published_at ? new Date(article.published_at) : new Date()
          });
        });
      }

      // Shuffle items for variety
      const shuffled = items.sort(() => Math.random() - 0.5);

      if (append) {
        setFeedItems(prev => [...prev, ...shuffled]);
      } else {
        setFeedItems(shuffled);
      }

      setHasMore(items.length >= 3);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching mixed content:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchMixedContent(0);
  }, [fetchMixedContent]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !fetchingRef.current) {
          fetchMixedContent(page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, page, fetchMixedContent]);

  const getTimeAgo = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(d, { addSuffix: false });
    } catch {
      return 'Recently';
    }
  };

  const renderPost = (post: TrendingPost) => (
    <Card 
      className="overflow-hidden border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onPostClick(post.id)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={post.author.avatar_url || ''} />
            <AvatarFallback className="bg-muted">
              {post.author.display_name?.charAt(0) || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-bold text-[15px] truncate max-w-[120px]">
                {post.author.display_name}
              </span>
              <VerifiedBadge 
                isVerified={post.author.is_verified} 
                isOrgVerified={post.author.is_organization_verified}
                size="sm"
              />
              <span className="text-muted-foreground text-[15px]">@{post.author.handle}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-sm">{getTimeAgo(post.created_at)}</span>
            </div>
            <p className="text-[15px] mt-1 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
            
            {post.post_images && post.post_images.length > 0 && (
              <div className="mt-3 rounded-xl overflow-hidden border border-border">
                <img 
                  src={post.post_images[0].image_url} 
                  alt="" 
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center gap-6 mt-3 text-muted-foreground">
              <span className="flex items-center gap-1.5 text-sm">
                <Heart className="h-4 w-4" />
                {post.like_count}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <MessageCircle className="h-4 w-4" />
                {post.reply_count}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-2">
        <Badge variant="secondary" className="text-[10px]">
          <TrendingUp className="h-3 w-3 mr-1" />
          Trending
        </Badge>
      </div>
    </Card>
  );

  const renderNews = (news: NewsItem) => (
    <Card 
      className="overflow-hidden border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => window.open(news.url, '_blank')}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {getFaviconUrl(news.url) ? (
              <img src={getFaviconUrl(news.url)!} alt="" className="h-4 w-4" />
            ) : (
              <Newspaper className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm font-medium">{news.source}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          <Newspaper className="h-3 w-3 mr-1" />
          News
        </Badge>
      </div>
      {news.image && (
        <div className="aspect-video overflow-hidden">
          <img src={news.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-bold text-base line-clamp-2">{news.title}</h3>
        {news.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{news.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {getTimeAgo(news.publishedAt || new Date().toISOString())}
        </div>
      </div>
    </Card>
  );

  const renderBlog = (article: BlogArticle) => (
    <Link to={`/blog/${article.slug}`}>
      <Card className="overflow-hidden border-border/50 hover:bg-muted/30 transition-colors">
        <div className="flex">
          {article.cover_image ? (
            <div className="w-24 h-24 flex-shrink-0">
              <img src={article.cover_image} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 flex-shrink-0 bg-muted flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px]">
                <BookOpen className="h-3 w-3 mr-1" />
                Blog
              </Badge>
              <Badge variant="outline" className="text-[10px]">{article.category}</Badge>
            </div>
            <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
            {article.ai_summary && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                {article.ai_summary}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {article.reading_time_minutes}m read
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );

  const renderItem = (item: FeedItem) => {
    switch (item.type) {
      case 'post':
        return renderPost(item.data as TrendingPost);
      case 'news':
        return renderNews(item.data as NewsItem);
      case 'blog':
        return renderBlog(item.data as BlogArticle);
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-base font-semibold mb-1">Nothing here yet</h3>
        <p className="text-muted-foreground text-sm">Check back soon for personalized content</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">For You</h2>
      </div>

      <AnimatePresence mode="popLayout">
        {feedItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }}
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerRef} className="py-6 flex justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
