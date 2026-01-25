import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Clock, 
  Eye, 
  TrendingUp, 
  Sparkles, 
  BookOpen,
  Calendar,
  ArrowRight,
  Home,
  Flame,
  Tag,
  User,
  ChevronRight,
  PenSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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
  author_id: string | null;
  is_featured: boolean;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: BookOpen },
  { id: 'Technology', label: 'Tech', icon: Sparkles },
  { id: 'Lifestyle', label: 'Lifestyle', icon: TrendingUp },
  { id: 'Business', label: 'Business', icon: Flame },
  { id: 'Entertainment', label: 'Entertainment', icon: Tag },
];

const Blog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'latest' | 'trending' | 'featured'>('latest');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(data === true);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    fetchArticles();
  }, [activeCategory, activeTab]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('blog_articles')
        .select('*')
        .eq('is_published', true);

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }

      if (activeTab === 'trending') {
        query = query.order('views_count', { ascending: false });
      } else if (activeTab === 'featured') {
        query = query.eq('is_featured', true).order('published_at', { ascending: false });
      } else {
        query = query.order('published_at', { ascending: false });
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set((data || []).filter(a => a.author_id).map(a => a.author_id))];
      let authorMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', authorIds);
        
        profiles?.forEach(p => {
          authorMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        });
      }

      const articlesWithAuthors = (data || []).map(article => ({
        ...article,
        author: article.author_id ? authorMap[article.author_id] : undefined
      }));

      setArticles(articlesWithAuthors);

      // Fetch featured separately for hero section
      if (activeTab === 'latest') {
        const { data: featured } = await supabase
          .from('blog_articles')
          .select('*')
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('published_at', { ascending: false })
          .limit(3);
        setFeaturedArticles(featured || []);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO 
        title="AfuChat Blog - Latest News, Tips & Updates"
        description="Discover the latest articles, tips, and updates from AfuChat. Stay informed about technology, lifestyle, business news and more."
        keywords="AfuChat blog, social media news, tech articles, lifestyle tips, business updates, AfuChat updates"
        type="website"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">AfuChat Blog</h1>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Home className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <IconComponent className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          {(['latest', 'trending', 'featured'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors relative",
                activeTab === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-40 w-full rounded-lg mb-3" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Articles Found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery ? 'Try a different search term' : 'Check back soon for new content'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Featured Hero (only on latest tab) */}
            {activeTab === 'latest' && featuredArticles.length > 0 && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Link to={`/blog/${featuredArticles[0].slug}`}>
                  <Card className="overflow-hidden group">
                    {featuredArticles[0].cover_image && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={featuredArticles[0].cover_image}
                          alt={featuredArticles[0].title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <Badge className="absolute top-3 left-3 bg-primary">Featured</Badge>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h2 className="text-white font-bold text-lg line-clamp-2">
                            {featuredArticles[0].title}
                          </h2>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      {featuredArticles[0].ai_summary && (
                        <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg mb-3">
                          <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {featuredArticles[0].ai_summary}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {featuredArticles[0].reading_time_minutes} min read
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {featuredArticles[0].views_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(featuredArticles[0].published_at)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            )}

            {/* Article List */}
            <div className="space-y-4">
              {filteredArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/blog/${article.slug}`}>
                    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="flex">
                        {article.cover_image && (
                          <div className="w-28 h-28 flex-shrink-0">
                            <img
                              src={article.cover_image}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {article.category}
                            </Badge>
                            {article.is_featured && (
                              <Flame className="h-3 w-3 text-accent" />
                            )}
                          </div>
                          <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                            {article.title}
                          </h3>
                          {article.ai_summary && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                              {article.ai_summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
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
                        <div className="flex items-center pr-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('latest')}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1",
              activeTab === 'latest' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px]">Latest</span>
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1",
              activeTab === 'trending' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-[10px]">Trending</span>
          </button>
          <button
            onClick={() => setActiveTab('featured')}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1",
              activeTab === 'featured' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Flame className="h-5 w-5" />
            <span className="text-[10px]">Featured</span>
          </button>
          <button
            onClick={() => navigate('/home')}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </button>
        </div>
        <div className="bg-background h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Admin FAB for creating blog posts */}
      {isAdmin && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/admin/blog')}
          className={cn(
            "fixed bottom-20 right-4 z-50",
            "h-14 w-14 rounded-full",
            "bg-gradient-to-br from-primary via-primary to-accent",
            "text-primary-foreground shadow-xl shadow-primary/30",
            "flex items-center justify-center",
            "before:absolute before:inset-0 before:rounded-full",
            "before:bg-gradient-to-t before:from-transparent before:to-white/20"
          )}
          aria-label="Create blog post"
        >
          <PenSquare className="h-6 w-6" />
        </motion.button>
      )}
    </div>
  );
};

export default Blog;
