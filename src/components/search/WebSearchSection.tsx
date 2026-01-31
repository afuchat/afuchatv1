import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Globe, Search, RefreshCw } from 'lucide-react';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { toast } from 'sonner';

interface WebSearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

interface WebSearchSectionProps {
  query: string;
}

export const WebSearchSection = ({ query }: WebSearchSectionProps) => {
  const [results, setResults] = useState<WebSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await firecrawlApi.search(query, {
        limit: 10,
        scrapeOptions: { formats: ['markdown'] }
      });
      
      if (response.success && response.data) {
        setResults(response.data);
        setHasSearched(true);
      } else {
        setError(response.error || 'Failed to search the web');
      }
    } catch (err) {
      console.error('Web search error:', err);
      setError('Failed to perform web search');
      toast.error('Web search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim()) {
      performSearch();
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [query]);

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Globe className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Search the Web</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Enter a search term above to find results from across the internet powered by Google.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Search className="h-4 w-4 animate-pulse" />
          Searching the web for "{query}"...
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Globe className="h-16 w-16 text-destructive/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Search Failed</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
        <Button onClick={performSearch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Search className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          No web results found for "{query}". Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {results.length} web results for "{query}"
        </p>
        <Button onClick={performSearch} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {results.map((result, index) => (
        <Card 
          key={index} 
          className="overflow-hidden hover:bg-muted/30 transition-colors cursor-pointer group"
          onClick={() => openInNewTab(result.url)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground truncate">
                    {getDomain(result.url)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <h3 className="font-semibold text-primary group-hover:underline line-clamp-2 mb-1">
                  {result.title || getDomain(result.url)}
                </h3>
                
                {result.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {result.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <div className="pt-4 text-center">
        <Button
          variant="outline"
          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')}
          className="gap-2"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Search on Google
        </Button>
      </div>
    </div>
  );
};
