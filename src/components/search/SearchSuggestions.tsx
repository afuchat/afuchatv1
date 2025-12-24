import { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Hash, TrendingUp, Clock, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Suggestion {
  type: 'user' | 'hashtag' | 'trending' | 'recent' | 'query';
  id: string;
  text: string;
  subtext?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isOrgVerified?: boolean;
  count?: number;
}

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: Suggestion) => void;
  recentSearches?: string[];
  isVisible: boolean;
}

const SuggestionIcon = ({ type }: { type: Suggestion['type'] }) => {
  switch (type) {
    case 'user':
      return <User className="h-4 w-4 text-muted-foreground" />;
    case 'hashtag':
      return <Hash className="h-4 w-4 text-primary" />;
    case 'trending':
      return <TrendingUp className="h-4 w-4 text-orange-500" />;
    case 'recent':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'query':
      return <Search className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
};

export const SearchSuggestions = memo(function SearchSuggestions({
  query,
  onSelect,
  recentSearches = [],
  isVisible,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 150);

  useEffect(() => {
    if (!isVisible) return;

    const fetchSuggestions = async () => {
      const trimmedQuery = debouncedQuery.trim().toLowerCase();
      
      // If no query, show recent searches
      if (!trimmedQuery) {
        const recentSuggestions: Suggestion[] = recentSearches.slice(0, 5).map((search, idx) => ({
          type: 'recent',
          id: `recent-${idx}`,
          text: search,
        }));
        setSuggestions(recentSuggestions);
        return;
      }

      setLoading(true);

      try {
        const allSuggestions: Suggestion[] = [];

        // Check if query starts with # for hashtag search
        if (trimmedQuery.startsWith('#')) {
          const hashtagQuery = trimmedQuery.slice(1);
          if (hashtagQuery.length >= 1) {
            // Search for hashtags in posts
            const { data: hashtagPosts } = await supabase
              .from('posts')
              .select('content')
              .ilike('content', `%#${hashtagQuery}%`)
              .limit(50);

            // Extract and count hashtags
            const hashtagCounts = new Map<string, number>();
            hashtagPosts?.forEach((post) => {
              const matches = post.content.match(/#[\w\u0590-\u05ff\u0600-\u06ff]+/gi);
              matches?.forEach((tag: string) => {
                const normalized = tag.toLowerCase();
                if (normalized.includes(hashtagQuery)) {
                  hashtagCounts.set(normalized, (hashtagCounts.get(normalized) || 0) + 1);
                }
              });
            });

            // Convert to suggestions and sort by count
            const hashtagSuggestions = Array.from(hashtagCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([tag, count]) => ({
                type: 'hashtag' as const,
                id: tag,
                text: tag,
                count,
                subtext: `${count} posts`,
              }));

            allSuggestions.push(...hashtagSuggestions);
          }
        } else {
          // Parallel fetch for users and trending topics
          const [usersResponse, trendingResponse, hashtagsResponse] = await Promise.all([
            // Fetch matching users
            supabase
              .from('profiles')
              .select('id, display_name, handle, avatar_url, is_verified, is_organization_verified')
              .or(`display_name.ilike.%${trimmedQuery}%,handle.ilike.%${trimmedQuery}%`)
              .eq('is_warned', false)
              .limit(5),
            
            // Fetch trending topics that match
            supabase
              .rpc('get_trending_topics', { hours_ago: 24, num_topics: 20 }),
            
            // Search for hashtags
            supabase
              .from('posts')
              .select('content')
              .ilike('content', `%#${trimmedQuery}%`)
              .limit(30),
          ]);

          // Add user suggestions
          if (usersResponse.data) {
            const userSuggestions: Suggestion[] = usersResponse.data.map((user) => ({
              type: 'user',
              id: user.id,
              text: user.display_name || user.handle,
              subtext: `@${user.handle}`,
              avatarUrl: user.avatar_url,
              isVerified: user.is_verified,
              isOrgVerified: user.is_organization_verified,
            }));
            allSuggestions.push(...userSuggestions);
          }

          // Add matching trending topics
          if (trendingResponse.data) {
            const matchingTrends = (trendingResponse.data as any[])
              .filter((t) => t.topic.toLowerCase().includes(trimmedQuery))
              .slice(0, 3)
              .map((t) => ({
                type: 'trending' as const,
                id: `trending-${t.topic}`,
                text: t.topic,
                subtext: `${t.post_count} posts`,
                count: t.post_count,
              }));
            allSuggestions.push(...matchingTrends);
          }

          // Add hashtag suggestions
          if (hashtagsResponse.data) {
            const hashtagCounts = new Map<string, number>();
            hashtagsResponse.data.forEach((post) => {
              const matches = post.content.match(/#[\w\u0590-\u05ff\u0600-\u06ff]+/gi);
              matches?.forEach((tag: string) => {
                const normalized = tag.toLowerCase();
                if (normalized.includes(trimmedQuery)) {
                  hashtagCounts.set(normalized, (hashtagCounts.get(normalized) || 0) + 1);
                }
              });
            });

            const hashtagSuggestions = Array.from(hashtagCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([tag, count]) => ({
                type: 'hashtag' as const,
                id: tag,
                text: tag,
                count,
                subtext: `${count} posts`,
              }));
            allSuggestions.push(...hashtagSuggestions);
          }

          // Add the query itself as a suggestion
          allSuggestions.push({
            type: 'query',
            id: 'query-search',
            text: trimmedQuery,
            subtext: 'Search for this',
          });
        }

        setSuggestions(allSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        // On error, just show the query as a suggestion
        setSuggestions([{
          type: 'query',
          id: 'query-search',
          text: trimmedQuery,
          subtext: 'Search for this',
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, isVisible, recentSearches]);

  if (!isVisible) return null;

  if (loading && suggestions.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg mt-1 z-50 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg mt-1 z-50 overflow-hidden max-h-[400px] overflow-y-auto">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion.type === 'user' && suggestion.avatarUrl ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={suggestion.avatarUrl} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {suggestion.text?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <SuggestionIcon type={suggestion.type} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground truncate">
                {suggestion.text}
              </span>
              {suggestion.isVerified && (
                <svg viewBox="0 0 22 22" className="h-4 w-4 fill-primary flex-shrink-0">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
              {suggestion.isOrgVerified && (
                <svg viewBox="0 0 22 22" className="h-4 w-4 fill-yellow-500 flex-shrink-0">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
            </div>
            {suggestion.subtext && (
              <span className="text-sm text-muted-foreground truncate block">
                {suggestion.subtext}
              </span>
            )}
          </div>
          {suggestion.type === 'trending' && (
            <span className="text-xs text-orange-500 font-medium">Trending</span>
          )}
        </button>
      ))}
    </div>
  );
});

export default SearchSuggestions;
