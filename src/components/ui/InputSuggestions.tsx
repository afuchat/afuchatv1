import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Hash, AtSign, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useDebounce } from '@/hooks/useDebounce';

interface Suggestion {
  type: 'hashtag' | 'user';
  value: string;
  displayText: string;
  avatar?: string | null;
  isVerified?: boolean;
  isOrgVerified?: boolean;
}

interface InputSuggestionsProps {
  text: string;
  cursorPosition: number;
  onSelect: (suggestion: Suggestion, startIndex: number, endIndex: number) => void;
  containerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

export const InputSuggestions = ({
  text,
  cursorPosition,
  onSelect,
  containerRef,
  className,
}: InputSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [triggerInfo, setTriggerInfo] = useState<{
    type: 'hashtag' | 'user' | null;
    query: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(triggerInfo?.query || '', 200);

  // Detect trigger character and extract query
  useEffect(() => {
    if (!text || cursorPosition === 0) {
      setTriggerInfo(null);
      setSuggestions([]);
      return;
    }

    // Look backwards from cursor to find trigger character
    let triggerIndex = -1;
    let triggerType: 'hashtag' | 'user' | null = null;
    
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = text[i];
      
      // Stop if we hit a space or newline before finding trigger
      if (char === ' ' || char === '\n') {
        break;
      }
      
      if (char === '#') {
        triggerType = 'hashtag';
        triggerIndex = i;
        break;
      }
      
      if (char === '@') {
        triggerType = 'user';
        triggerIndex = i;
        break;
      }
    }

    if (triggerIndex === -1 || !triggerType) {
      setTriggerInfo(null);
      setSuggestions([]);
      return;
    }

    // Extract the query after the trigger character
    const query = text.slice(triggerIndex + 1, cursorPosition);
    
    // Only show suggestions if query is valid (no spaces, reasonable length)
    if (query.includes(' ') || query.length > 30) {
      setTriggerInfo(null);
      setSuggestions([]);
      return;
    }

    setTriggerInfo({
      type: triggerType,
      query,
      startIndex: triggerIndex,
      endIndex: cursorPosition,
    });
    setActiveIndex(0);
  }, [text, cursorPosition]);

  // Fetch suggestions based on debounced query
  useEffect(() => {
    if (!triggerInfo || !debouncedQuery) {
      if (triggerInfo?.query === '') {
        // Show popular/recent suggestions when trigger is typed but no query yet
        fetchDefaultSuggestions(triggerInfo?.type || null);
      } else {
        setSuggestions([]);
      }
      return;
    }

    fetchSuggestions(triggerInfo.type, debouncedQuery);
  }, [debouncedQuery, triggerInfo?.type]);

  const fetchDefaultSuggestions = async (type: 'hashtag' | 'user' | null) => {
    if (!type) return;
    
    setLoading(true);
    try {
      if (type === 'hashtag') {
        // Fetch popular hashtags
        const { data } = await supabase
          .from('posts')
          .select('content')
          .not('content', 'is', null)
          .limit(100);

        if (data) {
          const hashtagCounts: Record<string, number> = {};
          data.forEach(post => {
            const hashtags = post.content?.match(/#\w+/g) || [];
            hashtags.forEach((tag: string) => {
              const normalized = tag.toLowerCase();
              hashtagCounts[normalized] = (hashtagCounts[normalized] || 0) + 1;
            });
          });

          const sortedTags = Object.entries(hashtagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([tag]) => ({
              type: 'hashtag' as const,
              value: tag.slice(1),
              displayText: tag,
            }));

          setSuggestions(sortedTags);
        }
      } else if (type === 'user') {
        // Fetch suggested users (verified users first)
        const { data } = await supabase
          .from('profiles')
          .select('id, handle, display_name, avatar_url, is_verified, is_organization_verified')
          .not('handle', 'is', null)
          .order('is_verified', { ascending: false })
          .limit(8);

        if (data) {
          setSuggestions(data.map(user => ({
            type: 'user' as const,
            value: user.handle,
            displayText: user.display_name || user.handle,
            avatar: user.avatar_url,
            isVerified: user.is_verified,
            isOrgVerified: user.is_organization_verified,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching default suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (type: 'hashtag' | 'user' | null, query: string) => {
    if (!type || !query) return;

    setLoading(true);
    try {
      if (type === 'hashtag') {
        // Search for hashtags in posts
        const { data } = await supabase
          .from('posts')
          .select('content')
          .ilike('content', `%#${query}%`)
          .limit(50);

        if (data) {
          const hashtagCounts: Record<string, number> = {};
          const lowerQuery = query.toLowerCase();
          
          data.forEach(post => {
            const hashtags = post.content?.match(/#\w+/g) || [];
            hashtags.forEach((tag: string) => {
              const normalized = tag.toLowerCase();
              if (normalized.slice(1).startsWith(lowerQuery)) {
                hashtagCounts[normalized] = (hashtagCounts[normalized] || 0) + 1;
              }
            });
          });

          const sortedTags = Object.entries(hashtagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([tag]) => ({
              type: 'hashtag' as const,
              value: tag.slice(1),
              displayText: tag,
            }));

          setSuggestions(sortedTags);
        }
      } else if (type === 'user') {
        // Search for users by handle or display name
        const { data } = await supabase
          .from('profiles')
          .select('id, handle, display_name, avatar_url, is_verified, is_organization_verified')
          .not('handle', 'is', null)
          .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
          .order('is_verified', { ascending: false })
          .limit(8);

        if (data) {
          setSuggestions(data.map(user => ({
            type: 'user' as const,
            value: user.handle,
            displayText: user.display_name || user.handle,
            avatar: user.avatar_url,
            isVerified: user.is_verified,
            isOrgVerified: user.is_organization_verified,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = useCallback((suggestion: Suggestion) => {
    if (!triggerInfo) return;
    onSelect(suggestion, triggerInfo.startIndex, triggerInfo.endIndex);
    setSuggestions([]);
    setTriggerInfo(null);
  }, [triggerInfo, onSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle keyboard when we have suggestions AND a valid trigger
    if (suggestions.length === 0 || !triggerInfo) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Tab') {
      // Only Tab selects from suggestions, not Enter (so Enter can still submit)
      if (suggestions[activeIndex]) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setSuggestions([]);
      setTriggerInfo(null);
    }
  }, [suggestions, activeIndex, handleSelect, triggerInfo]);

  // Attach keyboard listener to the input element when possible (avoid global listeners)
  useEffect(() => {
    if (suggestions.length === 0 || !triggerInfo) return;

    const target = containerRef?.current || document;
    target.addEventListener('keydown', handleKeyDown as EventListener);
    return () => target.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [suggestions.length, handleKeyDown, containerRef, triggerInfo]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div
      ref={suggestionsRef}
      className={cn(
        "absolute z-[100] w-full max-w-sm bg-background border border-border/60 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm",
        className
      )}
    >
      {loading && suggestions.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto py-2">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.type}-${suggestion.value}`}>
              <button
                type="button"
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  index === activeIndex ? "bg-primary/10" : "hover:bg-muted/60"
                )}
              >
                {suggestion.type === 'hashtag' ? (
                  <>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary truncate">
                      {suggestion.displayText}
                    </span>
                  </>
                ) : (
                  <>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={suggestion.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {suggestion.displayText.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">
                          {suggestion.displayText}
                        </span>
                        {(suggestion.isVerified || suggestion.isOrgVerified) && (
                          <VerifiedBadge 
                            isVerified={suggestion.isVerified} 
                            isOrgVerified={suggestion.isOrgVerified} 
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        @{suggestion.value}
                      </span>
                    </div>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Hook to manage cursor position in textarea
export const useCursorPosition = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [cursorPosition, setCursorPosition] = useState(0);

  const updateCursorPosition = useCallback(() => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart || 0);
    }
  }, [textareaRef]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const events = ['keyup', 'click', 'input'];
    events.forEach(event => textarea.addEventListener(event, updateCursorPosition));
    
    return () => {
      events.forEach(event => textarea.removeEventListener(event, updateCursorPosition));
    };
  }, [textareaRef, updateCursorPosition]);

  return cursorPosition;
};
