import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, User, MessageSquare, Users, Clock, X, Trash2, MoreHorizontal, Hash, Radio, Crown, Lock, Megaphone, Globe } from 'lucide-react';
import { PostInteractionButtons } from '@/components/feed/PostInteractionButtons';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SearchContentSkeleton, PostSkeleton } from '@/components/skeletons';
import { toast } from 'sonner';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useTranslation } from 'react-i18next';
import { searchSchema } from '@/lib/validation';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { TrendingInfoSheet } from '@/components/search/TrendingInfoSheet';
import { HashtagsSection } from '@/components/search/HashtagsSection';
import { AISearchSummary } from '@/components/search/AISearchSummary';
import { VerifiedBadge as PlatformVerifiedBadge } from '@/components/VerifiedBadge';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { AdvancedSearchFilters, SearchFilters, DEFAULT_FILTERS } from '@/components/search/AdvancedSearchFilters';
import { 
  detectContentType,
  filterByMediaType,
  MediaType
} from '@/lib/contentCategorization';
import { GlobalNewsSection } from '@/components/search/GlobalNewsSection';
import { FinanceSection } from '@/components/search/FinanceSection';

import { ForYouFeed } from '@/components/search/ForYouFeed';
import { WebSearchSection } from '@/components/search/WebSearchSection';

const SEARCH_HISTORY_KEY = 'afuchat_search_history';
const MAX_SEARCH_HISTORY = 10;

const getSearchHistory = (): string[] => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToSearchHistory = (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return;
  
  const history = getSearchHistory();
  const filtered = history.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, MAX_SEARCH_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

const removeFromSearchHistory = (query: string) => {
  const history = getSearchHistory();
  const updated = history.filter(h => h !== query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

const clearSearchHistory = () => {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
};

interface PostImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface SearchResult {
  type: 'user' | 'post' | 'group' | 'message';
  id: string;
  display_name?: string;
  handle?: string;
  bio?: string;
  is_verified?: boolean;
  is_organization_verified?: boolean;
  is_private?: boolean;
  avatar_url?: string;
  content?: string;
  created_at?: string;
  author_id?: string;
  image_url?: string;
  post_images?: PostImage[];
  author_profiles?: {
    display_name: string;
    handle: string;
    is_verified?: boolean;
    is_organization_verified?: boolean;
    avatar_url?: string;
  };
  name?: string;
  description?: string;
  member_count?: number;
  is_member?: boolean;
  group_verified?: boolean;
  is_channel?: boolean;
  // Post engagement fields
  like_count?: number;
  reply_count?: number;
  view_count?: number;
  is_liked?: boolean;
  // Message-specific fields
  chat_id?: string;
  chat_name?: string;
  chat_avatar_url?: string;
  sender_name?: string;
  sender_avatar_url?: string;
  sent_at?: string;
}

interface Trend {
  topic: string;
  post_count: number;
}

interface ExtendedTrend extends Trend {
  category?: string;
  relatedHashtags?: string[];
  topPosts?: Array<{ id: string; content: string; author: string }>;
}

const TwitterVerifiedBadge = ({ size = 'w-4 h-4' }: { size?: string }) => (
  <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" className={`${size} ml-0.5 fill-primary flex-shrink-0`}>
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
  </svg>
);

const GoldVerifiedBadge = ({ size = 'w-4 h-4' }: { size?: string }) => (
  <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" className={`${size} ml-0.5 fill-yellow-500 flex-shrink-0`}>
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
  </svg>
);

const TABS = ['For You', 'Web', 'Trending', 'News', 'Finance', 'Sports', 'Entertainment'] as const;
const SEARCH_RESULT_TABS = ['All', 'People', 'Communities', 'Posts', 'Messages'] as const;
type TabType = typeof TABS[number];
type SearchResultTabType = typeof SEARCH_RESULT_TABS[number];

const formatPostCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M posts`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K posts`;
  return `${count} posts`;
};

const TrendingItem = ({
  trend, 
  index, 
  category,
  onClick,
  onMoreClick
}: { 
  trend: ExtendedTrend; 
  index: number;
  category?: string;
  onClick: () => void;
  onMoreClick: (e: React.MouseEvent) => void;
}) => (
  <div 
    className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer flex justify-between items-start"
    onClick={onClick}
  >
    <div className="flex-1 min-w-0">
      <p className="text-[13px] text-muted-foreground">
        {category || `${index + 1} · Trending`}
      </p>
      <p className="font-bold text-[15px] text-foreground mt-0.5 flex items-center gap-1">
        {trend.topic.startsWith('#') && <Hash className="h-3.5 w-3.5 text-primary" />}
        {trend.topic}
      </p>
      <p className="text-[13px] text-muted-foreground mt-0.5">
        {formatPostCount(trend.post_count)}
      </p>
      {trend.relatedHashtags && trend.relatedHashtags.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {trend.relatedHashtags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-8 w-8 text-muted-foreground -mr-2 hover:text-primary hover:bg-primary/10"
      onClick={onMoreClick}
    >
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </div>
);

interface CategoryPost {
  id: string;
  content: string;
  created_at: string;
  author: {
    display_name: string;
    handle: string;
    avatar_url?: string;
    is_verified?: boolean;
    is_organization_verified?: boolean;
  };
  image_url?: string;
  post_images?: PostImage[];
  like_count: number;
  confidence?: number;
}

const CategoryPostItem = ({ 
  post, 
  onClick 
}: { 
  post: CategoryPost;
  onClick: () => void;
}) => (
  <div 
    className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={post.author.avatar_url || ''} alt={post.author.display_name} />
        <AvatarFallback className="bg-muted text-muted-foreground">
          {post.author.display_name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-[15px] text-foreground max-w-[120px] truncate" title={post.author.display_name}>
            {post.author.display_name.length > 12 ? `${post.author.display_name.slice(0, 10)}...` : post.author.display_name}
          </span>
          <PlatformVerifiedBadge
            isVerified={post.author.is_verified}
            isOrgVerified={post.author.is_organization_verified}
            size="sm"
          />
          <span className="text-[15px] text-muted-foreground">
            @{post.author.handle}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-[15px] text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-[15px] text-foreground mt-1 leading-normal line-clamp-3 whitespace-pre-wrap">
          {post.content}
        </p>
        {(post.post_images && post.post_images.length > 0) && (
          <div className={`mt-3 grid gap-0.5 rounded-2xl overflow-hidden border border-border ${post.post_images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.post_images.slice(0, 4).map((img, idx) => (
              <div key={img.id} className="relative aspect-video">
                <img 
                  src={img.image_url} 
                  alt={`Post image ${idx + 1}`} 
                  className="w-full h-full object-cover"
                />
                {post.post_images && post.post_images.length > 4 && idx === 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{post.post_images.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

const TrendingSection = ({ 
  activeTab,
  onTrendClick,
  onPostClick,
  searchQuery
}: { 
  activeTab: TabType;
  onTrendClick: (topic: string) => void;
  onPostClick: (postId: string) => void;
  searchQuery?: string;
}) => {
  const { t } = useTranslation();
  const [trends, setTrends] = useState<ExtendedTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<ExtendedTrend | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      // Only fetch trending for For You and Trending tabs
      // News, Sports, Entertainment, Web are handled by other components
      if (activeTab !== 'For You' && activeTab !== 'Trending') {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase.rpc('get_trending_topics', {
          hours_ago: 24,
          num_topics: 10,
        });

        if (error) {
          console.error('Error fetching trends:', error);
          setTrends([]);
        } else if (Array.isArray(data)) {
          // Fetch related hashtags and top posts for each trend
          const enhancedTrends = await Promise.all(
            data.map(async (d: Trend, idx: number) => {
              const topic = d.topic.charAt(0).toUpperCase() + d.topic.slice(1);
              
              // Fetch top posts for this topic
              const { data: topPostsData } = await supabase
                .from('posts')
                .select('id, content, profiles!author_id(handle)')
                .textSearch('content', d.topic, { type: 'plain', config: 'english' })
                .order('created_at', { ascending: false })
                .limit(5);

              // Extract related hashtags from top posts
              const relatedHashtags: string[] = [];
              topPostsData?.forEach((post: any) => {
                const matches = post.content.match(/#[\w\u0590-\u05ff\u0600-\u06ff]+/g);
                if (matches) {
                  matches.forEach((tag: string) => {
                    const normalized = tag.replace('#', '').toLowerCase();
                    if (!relatedHashtags.includes(normalized) && normalized !== d.topic.toLowerCase()) {
                      relatedHashtags.push(normalized);
                    }
                  });
                }
              });

              return {
                topic,
                post_count: d.post_count,
                category: idx % 5 === 0 ? 'Trending' : 
                         idx % 5 === 1 ? 'Politics · Trending' : 
                         idx % 5 === 2 ? 'Entertainment · Trending' : 
                         idx % 5 === 3 ? 'Sports · Trending' : 'Technology · Trending',
                relatedHashtags: relatedHashtags.slice(0, 5),
                topPosts: topPostsData?.slice(0, 3).map((p: any) => ({
                  id: p.id,
                  content: p.content,
                  author: p.profiles?.handle || 'unknown'
                })) || []
              };
            })
          );
          setTrends(enhancedTrends);
        } else {
          setTrends([]);
        }
      } catch (error) {
        console.error('RPC call failed:', error);
        setTrends([]);
      }
      
      setLoading(false);
    };

    fetchContent();
  }, [activeTab]);

  const handleMoreClick = (trend: ExtendedTrend, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrend(trend);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="py-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show web search tab
  if (activeTab === 'Web') {
    return <WebSearchSection query={searchQuery || ''} />;
  }


  // Show global news for News, Sports, and Entertainment tabs
  if (activeTab === 'News') {
    return <GlobalNewsSection category="general" />;
  }

  if (activeTab === 'Finance') {
    return <FinanceSection />;
  }
  
  if (activeTab === 'Sports') {
    return <GlobalNewsSection category="sports" />;
  }
  
  if (activeTab === 'Entertainment') {
    return <GlobalNewsSection category="entertainment" />;
  }

  // Show For You mixed feed
  if (activeTab === 'For You') {
    return <ForYouFeed onPostClick={onPostClick} />;
  }

  // Show trending topics for Trending tab only
  if (activeTab === 'Trending') {
    if (trends.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12 text-sm">
          {t('search.noTrends')}
        </div>
      );
    }

    return (
      <>
        <div className="divide-y divide-border">
          <h2 className="px-4 py-3 text-[20px] font-extrabold text-foreground">
            What's happening
          </h2>
          {trends.map((trend, index) => (
            <TrendingItem
              key={index}
              trend={trend}
              index={index}
              category={trend.category}
              onClick={() => onTrendClick(trend.topic)}
              onMoreClick={(e) => handleMoreClick(trend, e)}
            />
          ))}
        </div>
        <TrendingInfoSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          trend={selectedTrend}
          onSearchTopic={onTrendClick}
        />
      </>
    );
  }

  // Fallback - should not reach here with current tabs
  return null;
};

const SearchHistorySection = ({ 
  onHistoryClick, 
  onRemove, 
  onClearAll 
}: { 
  onHistoryClick: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
}) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const handleRemove = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromSearchHistory(query);
    setHistory(getSearchHistory());
    onRemove(query);
  };

  const handleClearAll = () => {
    clearSearchHistory();
    setHistory([]);
    onClearAll();
  };

  if (history.length === 0) return null;

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-[15px] font-bold text-foreground">
          {t('search.recentSearches', 'Recent')}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="text-xs text-primary hover:text-primary/80 h-auto p-0"
        >
          {t('search.clearAll', 'Clear all')}
        </Button>
      </div>
      <div className="divide-y divide-border">
        {history.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onHistoryClick(item)}
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-[15px] text-foreground">{item}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={(e) => handleRemove(item, e)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Search = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [historyKey, setHistoryKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('For You');
  const [activeResultTab, setActiveResultTab] = useState<SearchResultTabType>('All');
  const [userProfile, setUserProfile] = useState<{ avatar_url?: string | null; display_name?: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch current user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchUserProfile();
  }, [user]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getSearchHistory());
  }, [historyKey]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlQuery = params.get('q') || '';
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [location.search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: { type: string; id: string; text: string }) => {
    setShowSuggestions(false);
    
    if (suggestion.type === 'user') {
      navigate(`/@${suggestion.id}`);
    } else if (suggestion.type === 'web') {
      // Switch to Web tab and set query for web search
      setQuery(suggestion.text);
      setActiveTab('Web');
    } else if (suggestion.type === 'hashtag') {
      setQuery(suggestion.text);
    } else {
      setQuery(suggestion.text);
    }
  };

  const handleSearch = useCallback(async () => {
    const trimmedQuery = debouncedQuery.trim();
    if (!trimmedQuery) return;
    
    try {
      searchSchema.parse(trimmedQuery);
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || 'Invalid search query');
      setLoading(false);
      return;
    }

    setLoading(true);
    addToSearchHistory(trimmedQuery);
    setHistoryKey(prev => prev + 1);
    navigate(`?q=${encodeURIComponent(trimmedQuery)}`, { replace: true });

    const searchConfig = 'english'; 
    const searchTsQuery = trimmedQuery.replace(/ /g, ' | '); 

    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, display_name, handle, bio, is_verified, is_organization_verified, is_private, avatar_url, is_warned, warning_reason')
        .or(`display_name.ilike.%${trimmedQuery}%,handle.ilike.%${trimmedQuery}%`)
        .eq('is_warned', false) // Filter out warned users from search
        .limit(5);

      const { data: postData } = await supabase
        .from('posts')
        .select(`
          id, content, created_at, author_id, image_url,
          profiles!author_id(display_name, handle, is_verified, is_organization_verified, avatar_url),
          post_images(id, image_url, display_order),
          post_acknowledgments(id, user_id),
          post_replies(id),
          post_views(id)
        `)
        .textSearch('content', searchTsQuery, { type: 'plain', config: searchConfig })
        .limit(10);

      // Fetch groups and channels (publicly visible to all users)
      const { data: groupData } = await supabase
        .from('chats')
        .select('id, name, description, avatar_url, is_verified, is_group, is_channel')
        .or('is_group.eq.true,is_channel.eq.true')
        .or(`name.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`)
        .limit(10);

      // Fetch messages from public channels
      const { data: channelIds } = await supabase
        .from('chats')
        .select('id')
        .eq('is_channel', true);

      let messageResults: any[] = [];
      if (channelIds && channelIds.length > 0) {
        const channelIdList = channelIds.map(c => c.id);
        const { data: messageData } = await supabase
          .from('messages')
          .select(`
            id, encrypted_content, sent_at, chat_id,
            sender:profiles!sender_id(display_name, avatar_url),
            chat:chats!chat_id(name, avatar_url, is_channel)
          `)
          .in('chat_id', channelIdList)
          .ilike('encrypted_content', `%${trimmedQuery}%`)
          .order('sent_at', { ascending: false })
          .limit(10);

        if (messageData) {
          messageResults = messageData.filter((m: any) => m.chat?.is_channel === true);
        }
      }

      let groupsWithMembership = groupData || [];
      if (groupData && groupData.length > 0) {
        const groupIds = groupData.map((g: any) => g.id);
        
        const { data: memberCounts } = await supabase
          .from('chat_members')
          .select('chat_id')
          .in('chat_id', groupIds);
        
        const countMap = new Map<string, number>();
        memberCounts?.forEach(m => {
          countMap.set(m.chat_id, (countMap.get(m.chat_id) || 0) + 1);
        });

        let memberGroupIds = new Set<string>();
        if (user) {
          const { data: userMemberships } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('user_id', user.id)
            .in('chat_id', groupIds);
          memberGroupIds = new Set(userMemberships?.map(m => m.chat_id) || []);
        }

        groupsWithMembership = groupData.map((g: any) => ({
          ...g,
          is_member: memberGroupIds.has(g.id),
          member_count: countMap.get(g.id) || 0,
          is_verified: g.is_verified,
          is_channel: g.is_channel,
        }));
      }

      const combinedResults: SearchResult[] = [
        ...(userData || []).map((u: any) => ({
          type: 'user' as const,
          ...u,
        })),
        ...(groupsWithMembership || []).map((g: any) => ({
          type: 'group' as const,
          id: g.id,
          name: g.name,
          description: g.description,
          avatar_url: g.avatar_url,
          member_count: g.member_count,
          is_member: g.is_member,
          group_verified: g.is_verified,
          is_channel: g.is_channel,
        })),
        ...(postData || []).map((p: any) => {
          const isLiked = user ? p.post_acknowledgments?.some((ack: any) => ack.user_id === user.id) : false;
          return {
            type: 'post' as const,
            id: p.id,
            content: p.content,
            created_at: p.created_at,
            author_id: p.author_id,
            image_url: p.image_url,
            post_images: p.post_images?.sort((a: any, b: any) => a.display_order - b.display_order) || [],
            author_profiles: p.profiles,
            like_count: p.post_acknowledgments?.length || 0,
            reply_count: p.post_replies?.length || 0,
            view_count: p.post_views?.length || 0,
            is_liked: isLiked,
          };
        }),
        ...messageResults.map((m: any) => ({
          type: 'message' as const,
          id: m.id,
          content: m.encrypted_content,
          chat_id: m.chat_id,
          chat_name: m.chat?.name || 'Unknown Channel',
          chat_avatar_url: m.chat?.avatar_url,
          sender_name: m.sender?.display_name || 'Unknown',
          sender_avatar_url: m.sender?.avatar_url,
          sent_at: m.sent_at,
        })),
      ];

      setResults(combinedResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, navigate, user]);
  
  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch();
    } else if (location.search.includes('q=')) {
        navigate('', { replace: true }); 
        setResults([]);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, handleSearch, navigate, location.search]);

  const handleViewProfile = (userId: string) => {
    navigate(`/@${userId}`);
  };

  const handleViewPost = (postId: string) => {
    navigate(`/post/${postId}`); 
  };
  
  const handleTrendClick = (topic: string) => {
    setQuery(topic); 
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data: chatId, error } = await supabase
        .rpc('get_or_create_chat', {
          other_user_id: targetUserId
        })
        .single();

      if (error) throw error;

      if (chatId) {
        navigate(`/chat/${chatId}`);
      }
    } catch (error) {
      console.error('Chat creation error:', error);
      toast.error('Failed to create chat');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Use RPC to handle rejoin with admin rights restoration for creators
      const { error } = await supabase
        .rpc('rejoin_group_with_admin_check', {
          _user_id: user.id,
          _chat_id: groupId
        });

      if (error) throw error;

      toast.success(t('search.joinedGroup'));
      navigate(`/chat/${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(t('search.joinGroupError'));
    }
  };

  const isSearchActive = !!query.trim();
  const safeResults = results || [];
  const userResults = safeResults.filter(r => r.type === 'user');
  const groupResults = safeResults.filter(r => r.type === 'group');
  const messageResults = safeResults.filter(r => r.type === 'message');
  
  // Apply advanced filters to post results
  const postResults = useMemo(() => {
    let posts = safeResults.filter(r => r.type === 'post');
    
    // Apply media type filter
    if (searchFilters.mediaTypes.length > 0) {
      posts = posts.filter(post => {
        const contentInfo = detectContentType({
          content: post.content,
          image_url: post.image_url,
          post_images: post.post_images,
        });
        return searchFilters.mediaTypes.includes(contentInfo.mediaType);
      });
    }
    
    // Apply verified filter
    if (searchFilters.verified === true) {
      posts = posts.filter(post => 
        post.author_profiles?.is_verified || post.author_profiles?.is_organization_verified
      );
    }
    
    // Apply engagement filter
    if (searchFilters.hasEngagement) {
      posts = posts.filter(post => 
        (post.like_count || 0) > 0 || (post.reply_count || 0) > 0
      );
    }
    
    // Apply min likes filter
    if (searchFilters.minLikes > 0) {
      posts = posts.filter(post => (post.like_count || 0) >= searchFilters.minLikes);
    }
    
    // Apply date range filter
    if (searchFilters.dateRange !== 'all' && posts.length > 0) {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (searchFilters.dateRange) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      posts = posts.filter(post => 
        post.created_at && new Date(post.created_at) >= cutoffDate
      );
    }
    
    // Apply sorting
    if (searchFilters.sortBy === 'recent') {
      posts.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    } else if (searchFilters.sortBy === 'popular') {
      posts.sort((a, b) => 
        ((b.like_count || 0) + (b.view_count || 0)) - ((a.like_count || 0) + (a.view_count || 0))
      );
    }
    
    return posts;
  }, [safeResults, searchFilters]);
  
  const hasAnyResults = safeResults.length > 0;

  // Get filtered results based on active tab
  const getFilteredResults = () => {
    switch (activeResultTab) {
      case 'People':
        return { userResults, groupResults: [], postResults: [], messageResults: [] };
      case 'Communities':
        return { userResults: [], groupResults, postResults: [], messageResults: [] };
      case 'Posts':
        return { userResults: [], groupResults: [], postResults, messageResults: [] };
      case 'Messages':
        return { userResults: [], groupResults: [], postResults: [], messageResults };
      default:
        return { userResults, groupResults, postResults, messageResults };
    }
  };

  const filteredResults = getFilteredResults();

  // Get result counts for tabs
  const getTabCount = (tab: SearchResultTabType) => {
    switch (tab) {
      case 'People': return userResults.length;
      case 'Communities': return groupResults.length;
      case 'Posts': return postResults.length;
      case 'Messages': return messageResults.length;
      default: return safeResults.length;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background min-h-0 overflow-x-hidden w-full max-w-full">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-2">
          {isMobile && (
            <ProfileDrawer
              trigger={
                <button className="flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
          )}
          <div className="flex-1 relative" ref={searchContainerRef}>
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowSuggestions(false);
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  inputRef.current?.blur();
                }
              }}
              className="w-full rounded-full bg-muted/70 border-0 focus-visible:ring-1 focus-visible:ring-primary h-10 pl-10 pr-10 text-[15px]"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 z-10"
                onClick={() => {
                  setQuery('');
                  setShowSuggestions(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <SearchSuggestions
              query={query}
              onSelect={handleSuggestionSelect}
              recentSearches={recentSearches}
              isVisible={showSuggestions && !loading}
            />
          </div>
        </div>

        {/* Category Tabs - always show, with Web tab highlighted when active */}
        {(!isSearchActive || activeTab === 'Web') && (
          <ScrollArea className="w-full">
            <div className="flex border-b border-border">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-3 text-[15px] font-medium transition-colors relative ${
                    activeTab === tab 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        )}

        {/* Search Result Category Tabs with Web option - shown when searching and not on Web tab */}
        {isSearchActive && activeTab !== 'Web' && (
          <ScrollArea className="w-full">
            <div className="flex border-b border-border">
              {/* Web Search Tab */}
              <button
                onClick={() => setActiveTab('Web')}
                className="flex-shrink-0 px-4 py-3 text-[15px] font-medium transition-colors relative text-primary hover:text-primary/80 flex items-center gap-1.5"
              >
                <Globe className="h-4 w-4" />
                Web
              </button>
              {SEARCH_RESULT_TABS.map((tab) => {
                const count = getTabCount(tab);
                const isMessagesTab = tab === 'Messages';
                const isLocked = isMessagesTab && !isPremium;
                
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      if (isLocked) {
                        navigate('/premium');
                        return;
                      }
                      setActiveResultTab(tab);
                    }}
                    className={`flex-shrink-0 px-4 py-3 text-[15px] font-medium transition-colors relative flex items-center gap-1.5 ${
                      activeResultTab === tab 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    } ${isLocked ? 'opacity-70' : ''}`}
                  >
                    {isLocked && <Lock className="h-3.5 w-3.5" />}
                    {tab}
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeResultTab === tab 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {count}
                      </span>
                    )}
                    {activeResultTab === tab && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        )}
        
        {/* Advanced Search Filters - shown when searching */}
        {isSearchActive && (
          <AdvancedSearchFilters
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            resultCount={postResults.length}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Web Search Tab - always show when Web tab is active */}
        {activeTab === 'Web' ? (
          <WebSearchSection query={query} />
        ) : loading && isSearchActive ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : !isSearchActive ? (
          <>
            <SearchHistorySection 
              key={historyKey}
              onHistoryClick={(term) => setQuery(term)}
              onRemove={() => {}}
              onClearAll={() => toast.success(t('search.historyCleared', 'Search history cleared'))}
            />
            <HashtagsSection onHashtagClick={handleTrendClick} />
            <TrendingSection 
              activeTab={activeTab} 
              onTrendClick={handleTrendClick} 
              onPostClick={handleViewPost}
              searchQuery={query}
            />
          </>
        ) : !hasAnyResults ? (
          <div className="text-center py-12 px-4">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-[15px] mb-4">
              {t('search.noResults', { query })}
            </p>
            <Button
              onClick={() => setActiveTab('Web')}
              variant="outline"
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              Search the web for "{query}"
            </Button>
          </div>
        ) : (
          <div>
            {/* Ads removed - coming soon */}

            {/* AI Search Summary for Premium Users */}
            <AISearchSummary query={query} resultsCount={safeResults.length} />
            
            <div className="divide-y divide-border">
            {/* People Results */}
            {filteredResults.userResults.length > 0 && (
              <div>
                <h2 className="px-4 py-3 text-[20px] font-extrabold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {t('search.people')}
                </h2>
                <div className="divide-y divide-border">
                  {filteredResults.userResults.map((result) => (
                    <div 
                      key={result.id} 
                      className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleViewProfile(result.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={result.avatar_url || ''} alt={result.display_name} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {result.display_name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-0.5">
                            <span className="font-bold text-[15px] text-foreground truncate">
                              {result.display_name}
                            </span>
                            <PlatformVerifiedBadge isVerified={result.is_verified} isOrgVerified={result.is_organization_verified} size="sm" />
                          </div>
                          <p className="text-[15px] text-muted-foreground truncate">@{result.handle}</p>
                          {result.bio && (
                            <p className="text-[15px] text-foreground line-clamp-2 mt-1">{result.bio}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Groups & Channels Results */}
            {filteredResults.groupResults.length > 0 && (
              <div>
                <h2 className="px-4 py-3 text-[20px] font-extrabold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Communities
                </h2>
                <div className="divide-y divide-border">
                  {filteredResults.groupResults.map((result) => (
                    <div 
                      key={result.id} 
                      className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/chat/${result.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={result.avatar_url || ''} alt={result.name} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            <Users className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-[15px] text-foreground truncate">
                                {result.name || (result.is_channel ? 'Unnamed Channel' : 'Unnamed Group')}
                              </span>
                              {result.group_verified && <PlatformVerifiedBadge isVerified={true} size="sm" />}
                              {result.is_channel && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Channel
                                </span>
                              )}
                            </div>
                            {result.is_member ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/chat/${result.id}`);
                                }}
                                className="h-8 rounded-full text-sm font-bold"
                              >
                                Open
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinGroup(result.id);
                                }}
                                className="h-8 rounded-full text-sm font-bold"
                              >
                                {result.is_channel ? 'Subscribe' : 'Join'}
                              </Button>
                            )}
                          </div>
                          <p className="text-[13px] text-muted-foreground">
                            {result.member_count} {result.is_channel ? (result.member_count === 1 ? 'subscriber' : 'subscribers') : (result.member_count === 1 ? 'member' : 'members')}
                          </p>
                          {result.description && (
                            <p className="text-[15px] text-foreground line-clamp-2 mt-1">{result.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Results */}
            {filteredResults.postResults.length > 0 && (
              <div>
                <h2 className="px-4 py-3 text-[20px] font-extrabold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {t('search.posts')}
                </h2>
                <div className="divide-y divide-border">
                  {filteredResults.postResults.map((result) => (
                    <div
                      key={result.id}
                      className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleViewPost(result.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={result.author_profiles?.avatar_url || ''} alt={result.author_profiles?.display_name} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {result.author_profiles?.display_name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-[15px] text-foreground">
                              {result.author_profiles?.display_name}
                            </span>
                            <PlatformVerifiedBadge
                              isVerified={result.author_profiles?.is_verified}
                              isOrgVerified={result.author_profiles?.is_organization_verified}
                              size="sm"
                            />
                            <span className="text-[15px] text-muted-foreground">
                              @{result.author_profiles?.handle}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-[15px] text-muted-foreground">
                              {result.created_at ? new Date(result.created_at).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          <p className="text-[15px] text-foreground mt-1 leading-normal line-clamp-3 whitespace-pre-wrap">
                            {result.content}
                          </p>
                          {(result.post_images && result.post_images.length > 0) ? (
                            <div className={`mt-3 grid gap-0.5 rounded-2xl overflow-hidden border border-border ${result.post_images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {result.post_images.slice(0, 4).map((img, idx) => (
                                <div key={img.id} className="relative aspect-video">
                                  <img 
                                    src={img.image_url} 
                                    alt={`Post image ${idx + 1}`} 
                                    className="w-full h-full object-cover"
                                  />
                                  {result.post_images && result.post_images.length > 4 && idx === 3 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <span className="text-white font-bold text-lg">+{result.post_images.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : result.image_url ? (
                            <div className="mt-3 rounded-2xl overflow-hidden border border-border">
                              <img 
                                src={result.image_url} 
                                alt="Post image" 
                                className="w-full h-auto max-h-72 object-cover"
                              />
                            </div>
                          ) : null}
                          
                          {/* Post Interaction Icons */}
                          <PostInteractionButtons
                            postId={result.id}
                            initialLikeCount={result.like_count || 0}
                            initialReplyCount={result.reply_count || 0}
                            initialViewCount={result.view_count || 0}
                            initialIsLiked={result.is_liked || false}
                            className="mt-3"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Channel Messages Results - Premium Only */}
            {activeResultTab === 'Messages' && (
              <div>
                <h2 className="px-4 py-3 text-[20px] font-extrabold text-foreground flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary" />
                  Channel Messages
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-medium flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Premium
                  </span>
                </h2>
                
                {!isPremium ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-4">
                      <Crown className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Premium Feature</h3>
                    <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                      Search through channel messages is available exclusively for premium subscribers.
                    </p>
                    <Button 
                      onClick={() => navigate('/premium')}
                      className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-bold"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </div>
                ) : filteredResults.messageResults.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredResults.messageResults.map((result) => (
                      <div
                        key={result.id}
                        className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/chat/${result.chat_id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={result.chat_avatar_url || ''} alt={result.chat_name} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <Radio className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[15px] text-foreground truncate">
                                  {result.chat_name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Channel
                                </span>
                              </div>
                              <span className="text-[12px] text-muted-foreground flex-shrink-0">
                                {result.sent_at ? new Date(result.sent_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className="text-[14px] text-foreground mt-0.5 truncate">
                              {result.content && result.content.length > 60 
                                ? result.content.substring(0, 60) + '...' 
                                : result.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No channel messages found for "{query}"
                  </div>
                )}
              </div>
            )}

            {/* Show empty state for specific tabs */}
            {activeResultTab !== 'All' && activeResultTab !== 'Messages' && (
              <>
                {activeResultTab === 'People' && filteredResults.userResults.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No people found for "{query}"
                  </div>
                )}
                {activeResultTab === 'Communities' && filteredResults.groupResults.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No communities found for "{query}"
                  </div>
                )}
                {activeResultTab === 'Posts' && filteredResults.postResults.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No posts found for "{query}"
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
