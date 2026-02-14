import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Clock, 
  Eye, 
  Flame, 
  BookOpen, 
  TrendingUp, 
  Sparkles, 
  Home, 
  ChevronRight, 
  PenSquare, 
  Tag 
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

  // Fetch articles
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

      if (activeCategory !== 'all') query = query.eq('category', activeCategory);

      if (activeTab === 'trending') query = query.order('views_count', { ascending: false });
      else if (activeTab === 'featured') query = query.eq('is_featured', true).order('published_at', { ascending: false });
      else query = query.order('published_at', { ascending: false });

      const { data, error } = await query.limit(20);
      if (error) throw error;

      // Fetch authors
      const authorIds = [...new Set((data || []).filter(a => a.author_id).map(a => a.author_id))];
      let authorMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', authorIds);
        profiles?.forEach(p => authorMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url });
      }

      const articlesWithAuthors = (data || []).map(article => ({
        ...article,
        author: article.author_id ? authorMap[article.author_id] : undefined
      }));

      setArticles(articlesWithAuthors);

      // Featured for hero
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

  const formatDate = (dateStr: string | null) => dateStr ? format(new Date(dateStr), 'MMM d, yyyy') : '';

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO 
        title="AfuChat Blog - Latest News & Updates"
        description="Read the latest articles from AfuChat. Stay updated on technology, lifestyle, business, and entertainment."
        keywords="AfuChat blog, news, technology, lifestyle, business, entertainment"
        type="website"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">AfuChat Blog</h1>
          </div>
          <button onClick={() => navigate('/home')} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Home className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0"
          />
        </div>

        {/* Categories */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
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
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mt-3">
          {(['latest', 'trending', 'featured'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors relative",
                activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="mx-auto h-16 w-16 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Articles Found</h3>
            <p>{searchQuery ? 'Try a different search term' : 'Check back soon for new content'}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Featured Section */}
            {activeTab === 'latest' && featuredArticles.length > 0 && !searchQuery && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-accent" /> Featured
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredArticles.map(f => (
                    <Link key={f.id} to={`/blog/${f.slug}`} className="group">
                      <div className="overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        {f.cover_image && <img src={f.cover_image} alt={f.title} className="w-full h-48 object-cover" />}
                        <div className="p-4">
                          <span className="text-xs font-semibold text-primary">{f.category}</span>
                          <h3 className="text-lg font-bold mt-1 line-clamp-2">{f.title}</h3>
                          {f.ai_summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{f.ai_summary}</p>}
                          <div className="text-xs text-muted-foreground mt-2 flex gap-3">
                            <span>{formatDate(f.published_at)}</span>
                            <span>{f.reading_time_minutes} min read</span>
                            <span>{f.views_count.toLocaleString()} views</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Article List */}
            <section className="space-y-6">
              {filteredArticles.map((article, idx) => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Link to={`/blog/${article.slug}`} className="block hover:bg-muted/10 transition-colors rounded-md p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      {article.cover_image && (
                        <div className="w-full md:w-48 h-36 flex-shrink-0">
                          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover rounded-md" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-semibold text-primary">{article.category}</span>
                          <h3 className="text-lg font-bold mt-1 line-clamp-2">{article.title}</h3>
                          {article.ai_summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{article.ai_summary}</p>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3 items-center">
                          <span>{formatDate(article.published_at)}</span>
                          <span>{article.reading_time_minutes} min read</span>
                          <span>{article.views_count.toLocaleString()} views</span>
                          {article.author?.display_name && <span>By {article.author.display_name}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </section>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
          <button onClick={() => setActiveTab('latest')} className={cn("flex flex-col items-center gap-0.5 px-4 py-1", activeTab === 'latest' ? "text-primary" : "text-muted-foreground")}>
            <BookOpen className="h-5 w-5" /><span className="text-[10px]">Latest</span>
          </button>
          <button onClick={() => setActiveTab('trending')} className={cn("flex flex-col items-center gap-0.5 px-4 py-1", activeTab === 'trending' ? "text-primary" : "text-muted-foreground")}>
            <TrendingUp className="h-5 w-5" /><span className="text-[10px]">Trending</span>
          </button>
          <button onClick={() => setActiveTab('featured')} className={cn("flex flex-col items-center gap-0.5 px-4 py-1", activeTab === 'featured' ? "text-primary" : "text-muted-foreground")}>
            <Flame className="h-5 w-5" /><span className="text-[10px]">Featured</span>
          </button>
          <button onClick={() => navigate('/home')} className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground">
            <Home className="h-5 w-5" /><span className="text-[10px]">Home</span>
          </button>
        </div>
        <div className="bg-background h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Admin FAB */}
      {isAdmin && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/admin/blog')}
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center"
          aria-label="Create blog post"
        >
          <PenSquare className="h-6 w-6" />
        </motion.button>
      )}
    </div>
  );
};

export default Blog;
