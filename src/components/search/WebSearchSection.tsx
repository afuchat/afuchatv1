import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ExternalLink, Globe, Search, RefreshCw, ChevronRight,
  Sparkles, ArrowUpRight, Zap, AlertCircle, BookOpen, User,
  MapPin, Calendar, Building2, GraduationCap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { InAppBrowser } from './InAppBrowser';

interface WebSearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
    language?: string;
    sourceURL?: string;
    statusCode?: number;
  };
}

interface WikiProfile {
  name: string;
  subtitle?: string;
  image?: string;
  imageSource?: string;
  summary?: string;
  facts: { label: string; value: string }[];
  wikiUrl?: string;
}

interface WebSearchSectionProps {
  query: string;
}

// ─── Helpers ─────────────────────────────────────────────
function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

function getPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${u.hostname.replace('www.', '')}${path}`;
  } catch { return url; }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return ''; }
}

function extractFirstImage(markdown?: string): string | null {
  if (!markdown) return null;
  const match = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  return match?.[1] || null;
}

function extractSnippet(description?: string, markdown?: string, maxLen = 180): string {
  if (description && description.length > 20) return description.slice(0, maxLen);
  if (!markdown) return '';
  const clean = markdown
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[*_~`>]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return clean.slice(0, maxLen);
}

function getRelatedLinks(markdown?: string): { text: string; url: string }[] {
  if (!markdown) return [];
  const linkRegex = /\[([^\]]{3,60})\]\((https?:\/\/[^\s)]+)\)/g;
  const links: { text: string; url: string }[] = [];
  let match;
  while ((match = linkRegex.exec(markdown)) !== null && links.length < 4) {
    if (!match[1].startsWith('!') && match[1].length > 3) {
      links.push({ text: match[1], url: match[2] });
    }
  }
  return links;
}

// ─── Wikipedia Profile Extraction ────────────────────────
function extractWikiProfile(results: WebSearchResult[]): WikiProfile | null {
  const wikiResult = results.find(r => r.url?.includes('wikipedia.org'));
  if (!wikiResult?.markdown) return null;

  const md = wikiResult.markdown;
  const lines = md.split('\n').filter(l => l.trim());

  // Extract name from first heading or title
  let name = '';
  const headingMatch = md.match(/^#\s+(.+)/m);
  if (headingMatch) {
    name = headingMatch[1].replace(/\[([^\]]+)\]\(.*?\)/g, '$1').replace(/[*_]/g, '').trim();
  } else if (wikiResult.title) {
    name = wikiResult.title.replace(/ - Wikipedia.*$/i, '').trim();
  }
  if (!name) return null;

  // Extract image
  const image = wikiResult.metadata?.ogImage || extractFirstImage(md);

  // Extract summary - first substantial paragraph
  const cleanLines = lines
    .filter(l => !l.startsWith('#') && !l.startsWith('!') && !l.startsWith('|') && l.length > 60)
    .map(l => l.replace(/\[([^\]]+)\]\(.*?\)/g, '$1').replace(/[*_~`]/g, '').trim());
  const summary = cleanLines[0] || '';

  // Extract facts from infobox-like patterns
  const facts: { label: string; value: string }[] = [];
  const factPatterns = [
    { regex: /\*\*Born\*\*[:\s]*(.+)/i, label: 'Born' },
    { regex: /\*\*Died\*\*[:\s]*(.+)/i, label: 'Died' },
    { regex: /\*\*Nationality\*\*[:\s]*(.+)/i, label: 'Nationality' },
    { regex: /\*\*Occupation\*\*[:\s]*(.+)/i, label: 'Occupation' },
    { regex: /\*\*Known for\*\*[:\s]*(.+)/i, label: 'Known for' },
    { regex: /\*\*Founded\*\*[:\s]*(.+)/i, label: 'Founded' },
    { regex: /\*\*Headquarters\*\*[:\s]*(.+)/i, label: 'Headquarters' },
    { regex: /\*\*CEO\*\*[:\s]*(.+)/i, label: 'CEO' },
    { regex: /\*\*Education\*\*[:\s]*(.+)/i, label: 'Education' },
    { regex: /\*\*Spouse\*\*[:\s]*(.+)/i, label: 'Spouse' },
    { regex: /\*\*Children\*\*[:\s]*(.+)/i, label: 'Children' },
    { regex: /\*\*Net worth\*\*[:\s]*(.+)/i, label: 'Net worth' },
    { regex: /\*\*Height\*\*[:\s]*(.+)/i, label: 'Height' },
    { regex: /\*\*Type\*\*[:\s]*(.+)/i, label: 'Type' },
    { regex: /\*\*Industry\*\*[:\s]*(.+)/i, label: 'Industry' },
    { regex: /\*\*Revenue\*\*[:\s]*(.+)/i, label: 'Revenue' },
    { regex: /\*\*Website\*\*[:\s]*(.+)/i, label: 'Website' },
    { regex: /\*\*Population\*\*[:\s]*(.+)/i, label: 'Population' },
    { regex: /\*\*Area\*\*[:\s]*(.+)/i, label: 'Area' },
    { regex: /\*\*Capital\*\*[:\s]*(.+)/i, label: 'Capital' },
  ];

  // Also try table row patterns: | Label | Value |
  const tableRowRegex = /\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*([^|]+)\s*\|/g;
  let tableMatch;
  while ((tableMatch = tableRowRegex.exec(md)) !== null && facts.length < 10) {
    const label = tableMatch[1].trim();
    const value = tableMatch[2].replace(/\[([^\]]+)\]\(.*?\)/g, '$1').replace(/[*_]/g, '').trim();
    if (label.length > 2 && label.length < 30 && value.length > 1 && value !== '---' && !label.includes('---')) {
      facts.push({ label, value: value.slice(0, 100) });
    }
  }

  for (const pattern of factPatterns) {
    const match = md.match(pattern.regex);
    if (match && !facts.find(f => f.label === pattern.label)) {
      const value = match[1].replace(/\[([^\]]+)\]\(.*?\)/g, '$1').replace(/[*_]/g, '').trim();
      if (value.length > 1) facts.push({ label: pattern.label, value: value.slice(0, 100) });
    }
  }

  // Extract subtitle from description or first line
  let subtitle = '';
  if (wikiResult.description) {
    subtitle = wikiResult.description.split('.')[0];
  }

  if (!summary && facts.length === 0) return null;

  return {
    name,
    subtitle: subtitle || undefined,
    image: image || undefined,
    imageSource: image ? getDomain(wikiResult.url) : undefined,
    summary: summary || undefined,
    facts,
    wikiUrl: wikiResult.url,
  };
}

// ─── Wikipedia Knowledge Panel ───────────────────────────
const WikiKnowledgePanel = ({ profile, onOpenUrl }: { profile: WikiProfile; onOpenUrl: (url: string, title?: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const visibleFacts = expanded ? profile.facts : profile.facts.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-5 rounded-2xl bg-card border border-border overflow-hidden"
    >
      {/* Header with image */}
      {profile.image && (
        <div className="relative h-52 overflow-hidden bg-muted">
          <img
            src={profile.image}
            alt={profile.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-xl font-bold text-white leading-tight">{profile.name}</h2>
            {profile.subtitle && (
              <p className="text-[13px] text-white/75 mt-0.5">{profile.subtitle}</p>
            )}
          </div>
          {profile.imageSource && (
            <span className="absolute bottom-3 right-3 text-[10px] text-white/50 bg-black/30 px-1.5 py-0.5 rounded">
              Source: {profile.imageSource}
            </span>
          )}
        </div>
      )}

      {/* Name if no image */}
      {!profile.image && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{profile.name}</h2>
              {profile.subtitle && (
                <p className="text-[12px] text-muted-foreground">{profile.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {profile.summary && (
        <div className="px-4 pt-3 pb-2">
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-4">
            {profile.summary}
          </p>
          {profile.wikiUrl && (
            <button
              className="text-[12px] text-primary font-medium mt-1 hover:underline inline-flex items-center gap-0.5"
              onClick={() => onOpenUrl(profile.wikiUrl!, profile.name + ' - Wikipedia')}
            >
              Wikipedia <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Quick Facts */}
      {profile.facts.length > 0 && (
        <div className="mx-4 mt-2 mb-3 rounded-xl bg-muted/40 border border-border/50 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="text-[13px] font-semibold text-foreground">Quick facts</span>
            {profile.facts.length > 4 && (
              expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div className="px-4 pb-3 space-y-2.5">
            {visibleFacts.map((fact, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[12px] font-semibold text-foreground min-w-[80px] flex-shrink-0">{fact.label}</span>
                <span className="text-[12px] text-muted-foreground leading-relaxed">{fact.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Featured Result Card ────────────────────────────────
const FeaturedResultCard = ({ result, onClick }: { result: WebSearchResult; onClick: () => void }) => {
  const imageUrl = result.metadata?.ogImage || extractFirstImage(result.markdown);
  const snippet = extractSnippet(result.description, result.markdown, 220);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-card border border-border overflow-hidden cursor-pointer group hover:shadow-soft-lg transition-all duration-200"
      onClick={onClick}
    >
      {imageUrl && (
        <div className="relative h-44 overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={result.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-2 mb-1">
              <img src={getFaviconUrl(result.url)} alt="" className="h-4 w-4 rounded-sm" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <span className="text-[11px] text-white/80 font-medium">{getDomain(result.url)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="p-4">
        {!imageUrl && (
          <div className="flex items-center gap-2 mb-2">
            <img src={getFaviconUrl(result.url)} alt="" className="h-4 w-4 rounded-sm" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-[11px] text-muted-foreground font-medium truncate">{getPath(result.url)}</span>
          </div>
        )}
        <h3 className="font-bold text-[15px] leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
          {result.title || getDomain(result.url)}
        </h3>
        {snippet && (
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3">{snippet}</p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Standard Result Card ────────────────────────────────
const ResultCard = ({ result, index, onClick, onOpenUrl }: { result: WebSearchResult; index: number; onClick: () => void; onOpenUrl: (url: string, title?: string) => void }) => {
  const imageUrl = result.metadata?.ogImage || extractFirstImage(result.markdown);
  const snippet = extractSnippet(result.description, result.markdown);
  const siteLinks = getRelatedLinks(result.markdown);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3 py-4 px-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <img src={getFaviconUrl(result.url)} alt="" className="h-4 w-4 rounded-sm flex-shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-[12px] text-muted-foreground truncate">{getPath(result.url)}</span>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          <h3 className="font-semibold text-[15px] leading-snug text-primary group-hover:underline decoration-primary/40 underline-offset-2 line-clamp-2 mb-1">
            {result.title || getDomain(result.url)}
          </h3>
          {snippet && (
            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{snippet}</p>
          )}
          {siteLinks.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {siteLinks.map((link, i) => (
                <button
                  key={i}
                  className="text-[12px] text-primary/80 hover:text-primary hover:underline flex items-center gap-0.5"
                  onClick={(e) => { e.stopPropagation(); onOpenUrl(link.url, link.text); }}
                >
                  <ChevronRight className="h-3 w-3" />
                  {link.text}
                </button>
              ))}
            </div>
          )}
        </div>
        {imageUrl && (
          <div className="flex-shrink-0 w-[100px] h-[72px] rounded-xl overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Quick Answer Box ────────────────────────────────────
const QuickAnswerBox = ({ query, markdown }: { query: string; markdown?: string }) => {
  if (!markdown || markdown.length < 100) return null;
  const lines = markdown.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('!') && l.length > 40);
  const answer = lines[0]?.replace(/\[([^\]]+)\]\(.*?\)/g, '$1').replace(/[*_~`]/g, '').trim();
  if (!answer || answer.length < 50) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-1 mb-4 p-4 rounded-2xl bg-primary/[0.04] border border-primary/10"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
          <Zap className="h-3 w-3 text-primary" />
        </div>
        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Quick Answer</span>
      </div>
      <p className="text-[14px] text-foreground leading-relaxed line-clamp-4">{answer}</p>
    </motion.div>
  );
};

// ─── Loading Skeleton ────────────────────────────────────
const SearchSkeleton = ({ query }: { query: string }) => (
  <div className="px-4 py-4 space-y-5">
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
        <Search className="h-3 w-3 text-primary animate-pulse" />
      </div>
      <span>Searching for <strong className="text-foreground">"{query}"</strong></span>
    </div>
    {/* Knowledge panel skeleton */}
    <div className="rounded-2xl border border-border overflow-hidden">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
    {[1, 2, 3].map(i => (
      <div key={i} className="flex gap-3 py-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
        <Skeleton className="h-[72px] w-[100px] rounded-xl flex-shrink-0" />
      </div>
    ))}
  </div>
);

// ─── Empty State ─────────────────────────────────────────
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
    <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
      <Globe className="h-9 w-9 text-muted-foreground/40" />
    </div>
    <h3 className="text-lg font-bold text-foreground mb-1.5">Search the Web</h3>
    <p className="text-[13px] text-muted-foreground max-w-[260px] leading-relaxed">
      Type a query above to discover results from across the internet.
    </p>
  </div>
);

// ─── Main Component ──────────────────────────────────────
export const WebSearchSection = ({ query }: WebSearchSectionProps) => {
  const [results, setResults] = useState<WebSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTime, setSearchTime] = useState<number>(0);
  const lastQueryRef = useRef('');
  const searchingRef = useRef(false);

  // Stable search function - no deps so reference never changes
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchingRef.current) return;
    searchingRef.current = true;
    setLoading(true);
    setError(null);
    const start = Date.now();

    try {
      const response = await firecrawlApi.search(searchQuery, {
        limit: 12,
        scrapeOptions: { formats: ['markdown'] },
      });

      if (response.success && response.data) {
        setResults(response.data);
        setHasSearched(true);
        setSearchTime((Date.now() - start) / 1000);
      } else {
        setError(response.error || 'Failed to search the web');
      }
    } catch (err) {
      console.error('Web search error:', err);
      setError('Failed to perform web search');
    } finally {
      setLoading(false);
      searchingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed && trimmed !== lastQueryRef.current) {
      lastQueryRef.current = trimmed;
      performSearch(trimmed);
    } else if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      lastQueryRef.current = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Extract Wikipedia knowledge panel
  const wikiProfile = useMemo(() => extractWikiProfile(results), [results]);

  // Filter out the wiki result from main list if we have a panel
  const displayResults = useMemo(() => {
    if (!wikiProfile) return results;
    return results.filter(r => !r.url?.includes('wikipedia.org'));
  }, [results, wikiProfile]);

  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [browserTitle, setBrowserTitle] = useState<string | undefined>();

  const openUrl = (url: string, title?: string) => {
    setBrowserUrl(url);
    setBrowserTitle(title);
  };

  if (!query.trim()) return <EmptyState />;
  if (loading) return <SearchSkeleton query={query} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-destructive/60" />
        </div>
        <h3 className="text-base font-semibold mb-1">Search Failed</h3>
        <p className="text-[13px] text-muted-foreground max-w-[260px] mb-4">{error}</p>
        <Button onClick={() => performSearch(query)} variant="outline" size="sm" className="rounded-full gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
          <Search className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold mb-1">No Results</h3>
        <p className="text-[13px] text-muted-foreground max-w-[260px]">
          Nothing found for "{query}". Try different keywords.
        </p>
      </div>
    );
  }

  const [featured, ...rest] = displayResults;

  return (
    <>
      <ScrollArea className="h-full">
        <div className="px-4 pt-3 pb-6">
          {/* Search meta */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] text-muted-foreground">
              About {results.length} results ({searchTime.toFixed(2)}s)
            </p>
            <Button
              onClick={() => {
                lastQueryRef.current = '';
                performSearch(query);
              }}
              variant="ghost"
              size="sm"
              className="h-7 text-[12px] gap-1 text-muted-foreground"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>

          {/* Wikipedia Knowledge Panel */}
          {wikiProfile && <WikiKnowledgePanel profile={wikiProfile} />}

          {/* Quick answer from first result */}
          {!wikiProfile && featured && <QuickAnswerBox query={query} markdown={featured.markdown} />}

          {/* Featured result */}
          {featured && (
            <div className="mb-4">
              <FeaturedResultCard result={featured} onClick={() => openUrl(featured.url, featured.title)} />
            </div>
          )}

          {/* Remaining results */}
          <div className="divide-y divide-border/60">
            {rest.map((result, i) => (
              <ResultCard key={result.url + i} result={result} index={i} onClick={() => openUrl(result.url, result.title)} onOpenUrl={openUrl} />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* In-App Browser Overlay */}
      <AnimatePresence>
        {browserUrl && (
          <InAppBrowser
            url={browserUrl}
            title={browserTitle}
            onClose={() => setBrowserUrl(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
