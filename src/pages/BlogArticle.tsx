import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  Calendar, 
  Sparkles, 
  Share2,
  BookOpen,
  User,
  Tag,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  views_count: number;
  reading_time_minutes: number;
  ai_summary: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  published_at: string | null;
  author_id: string | null;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  reading_time_minutes: number;
}

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [authorProfile, setAuthorProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      setArticle(data);

      // Increment view count
      await supabase.rpc('increment_article_views', { article_id: data.id });

      // Fetch author profile
      if (data.author_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', data.author_id)
          .single();
        setAuthorProfile(profile);
      }

      // Fetch related articles
      const { data: related } = await supabase
        .from('blog_articles')
        .select('id, title, slug, cover_image, reading_time_minutes')
        .eq('is_published', true)
        .eq('category', data.category)
        .neq('id', data.id)
        .limit(3);
      setRelatedArticles(related || []);

    } catch (error) {
      console.error('Error fetching article:', error);
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const generateAiSummary = async () => {
    if (!article) return;
    
    setGeneratingAiSummary(true);
    try {
      // Strip HTML tags and limit content
      const plainText = article.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const truncatedContent = plainText.substring(0, 1200);
      
      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: {
          message: `Extract key points from this article in exactly 2 factual sentences. No greetings, no opinions, only facts from the content:\n\n${truncatedContent}`,
          systemPrompt: 'You are a factual summarizer. Output ONLY 2 sentences that summarize the main facts. No greetings, introductions, or additional commentary. Be direct and factual.'
        }
      });

      if (error) throw error;

      const summary = data?.reply || 'Unable to generate summary.';
      
      await supabase
        .from('blog_articles')
        .update({ ai_summary: summary })
        .eq('id', article.id);

      setArticle(prev => prev ? { ...prev, ai_summary: summary } : null);
      setShowAiSummary(true);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setGeneratingAiSummary(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt || '',
          url
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMMM d, yyyy');
  };

  // Render rich content (supports basic HTML)
  const renderContent = (content: string) => {
    return { __html: content };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="p-4">
          <Skeleton className="h-8 w-8 rounded-full mb-4" />
          <Skeleton className="h-64 w-full rounded-xl mb-4" />
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Article Not Found</h2>
          <Button onClick={() => navigate('/blog')}>Back to Blog</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO 
        title={article.meta_title || `${article.title} | AfuChat Blog`}
        description={article.meta_description || article.excerpt || article.title}
        keywords={article.meta_keywords?.join(', ') || article.tags?.join(', ') || 'AfuChat blog'}
        image={article.cover_image || undefined}
        type="article"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Badge variant="secondary">{article.category}</Badge>
          <button
            onClick={handleShare}
            className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Article Content */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        {/* Cover Image */}
        {article.cover_image && (
          <div className="relative -mx-4 mb-4">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-56 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
        )}

        {/* Title & Meta */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-3">{article.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.reading_time_minutes} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.views_count.toLocaleString()} views
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(article.published_at)}</span>
            {authorProfile && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {authorProfile.avatar_url ? (
                    <img 
                      src={authorProfile.avatar_url} 
                      alt={authorProfile.display_name || 'Author'}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>{authorProfile.display_name || 'AfuChat Team'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* AI Summary Card - Collapsible Quote Style */}
        <div className="mb-6">
          <button
            onClick={() => setShowAiSummary(!showAiSummary)}
            className="flex items-center gap-2 w-full text-left mb-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AfuAI Summary</span>
            <ChevronRight className={cn(
              "h-4 w-4 text-muted-foreground transition-transform ml-auto",
              showAiSummary && "rotate-90"
            )} />
          </button>
          
          <AnimatePresence>
            {showAiSummary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {article.ai_summary ? (
                  <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/30 rounded-r-lg italic text-sm text-muted-foreground leading-relaxed">
                    "{article.ai_summary}"
                  </blockquote>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAiSummary}
                    disabled={generatingAiSummary}
                    className="w-full"
                  >
                    {generatingAiSummary ? 'Generating...' : 'Generate AI Summary'}
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Article Body */}
        <div 
          className="prose prose-sm dark:prose-invert max-w-none mb-8"
          dangerouslySetInnerHTML={renderContent(article.content)}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Related Articles - Horizontal Scroll */}
        {relatedArticles.length > 0 && (
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Similar Content
            </h3>
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3" style={{ width: 'max-content' }}>
                {relatedArticles.map((related) => (
                  <Link key={related.id} to={`/blog/${related.slug}`}>
                    <Card className="w-40 overflow-hidden hover:border-primary/50 transition-colors flex-shrink-0">
                      {related.cover_image && (
                        <img
                          src={related.cover_image}
                          alt={related.title}
                          className="w-full h-24 object-cover"
                        />
                      )}
                      <div className="p-2">
                        <h4 className="font-medium text-xs line-clamp-2 mb-1">{related.title}</h4>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {related.reading_time_minutes} min
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.article>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-4">
          <Link to="/blog" className="flex flex-col items-center gap-0.5 text-muted-foreground">
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px]">Blog</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 text-muted-foreground"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-[10px]">Share</span>
          </button>
          <button
            onClick={() => setShowAiSummary(!showAiSummary)}
            className={cn(
              "flex flex-col items-center gap-0.5",
              showAiSummary ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px]">AI</span>
          </button>
        </div>
        <div className="bg-background h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

export default BlogArticle;
