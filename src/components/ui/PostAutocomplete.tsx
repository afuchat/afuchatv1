import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface UserSuggestion {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

interface HashtagSuggestion {
  hashtag: string;
  count: number;
}

interface PostAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const PostAutocomplete: React.FC<PostAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  className,
  textareaRef: externalRef,
}) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'mention' | 'hashtag' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(0);
  
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Detect @ or # triggers
  const detectTrigger = useCallback((text: string, position: number) => {
    // Find the word being typed at cursor position
    const textBeforeCursor = text.slice(0, position);
    
    // Find the last @ or # before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    // Determine which trigger is more recent
    const triggerIndex = Math.max(lastAtIndex, lastHashIndex);
    
    if (triggerIndex === -1) {
      return null;
    }
    
    // Check if there's a space between trigger and cursor
    const textAfterTrigger = textBeforeCursor.slice(triggerIndex + 1);
    if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) {
      return null;
    }
    
    // Check if trigger is at start or preceded by space/newline
    if (triggerIndex > 0) {
      const charBefore = textBeforeCursor[triggerIndex - 1];
      if (charBefore !== ' ' && charBefore !== '\n') {
        return null;
      }
    }
    
    const type = triggerIndex === lastAtIndex ? 'mention' : 'hashtag';
    const term = textAfterTrigger;
    
    return { type, term, triggerIndex };
  }, []);

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(newPosition);
    
    const trigger = detectTrigger(newValue, newPosition);
    
    if (trigger) {
      setSuggestionType(trigger.type as 'mention' | 'hashtag');
      setSearchTerm(trigger.term);
      setTriggerPosition(trigger.triggerIndex);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestionType(null);
      setSearchTerm('');
    }
  };

  // Fetch user suggestions
  useEffect(() => {
    if (suggestionType !== 'mention' || !showSuggestions) return;
    
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select('id, handle, display_name, avatar_url')
          .not('handle', 'is', null)
          .limit(8);
        
        if (searchTerm) {
          query = query.or(`handle.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`);
        }
        
        const { data } = await query;
        setUserSuggestions(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchUsers, 150);
    return () => clearTimeout(debounce);
  }, [searchTerm, suggestionType, showSuggestions]);

  // Fetch hashtag suggestions
  useEffect(() => {
    if (suggestionType !== 'hashtag' || !showSuggestions) return;
    
    const fetchHashtags = async () => {
      setIsLoading(true);
      try {
        // Get hashtags from posts (include posts where is_blocked is false or null)
        const { data } = await supabase
          .from('posts')
          .select('content')
          .ilike('content', `%#%`)
          .or('is_blocked.is.null,is_blocked.eq.false')
          .limit(100);
        
        if (data) {
          const hashtagCounts = new Map<string, number>();
          const regex = /#([a-zA-Z0-9_]+)/g;
          
          data.forEach(post => {
            const matches = post.content.matchAll(regex);
            for (const match of matches) {
              const tag = match[1].toLowerCase();
              if (!searchTerm || tag.startsWith(searchTerm.toLowerCase())) {
                hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
              }
            }
          });
          
          const suggestions = Array.from(hashtagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([hashtag, count]) => ({ hashtag, count }));
          
          setHashtagSuggestions(suggestions);
        }
      } catch (error) {
        console.error('Error fetching hashtags:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchHashtags, 150);
    return () => clearTimeout(debounce);
  }, [searchTerm, suggestionType, showSuggestions]);

  // Handle suggestion selection
  const selectSuggestion = useCallback((suggestion: string) => {
    const beforeTrigger = value.slice(0, triggerPosition);
    const afterCursor = value.slice(cursorPosition);
    const triggerChar = suggestionType === 'mention' ? '@' : '#';
    
    const newValue = `${beforeTrigger}${triggerChar}${suggestion} ${afterCursor}`;
    onChange(newValue);
    
    setShowSuggestions(false);
    setSuggestionType(null);
    setSearchTerm('');
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = beforeTrigger.length + suggestion.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  }, [value, triggerPosition, cursorPosition, suggestionType, onChange, textareaRef]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;
    
    const suggestions = suggestionType === 'mention' 
      ? userSuggestions 
      : hashtagSuggestions;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          const selected = suggestions[selectedIndex];
          if (suggestionType === 'mention') {
            selectSuggestion((selected as UserSuggestion).handle);
          } else {
            selectSuggestion((selected as HashtagSuggestion).hashtag);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = suggestionType === 'mention' ? userSuggestions : hashtagSuggestions;

  return (
    <div ref={containerRef} className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "min-h-[120px] text-lg border-0 shadow-none resize-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground/50 w-full bg-transparent focus:outline-none",
          className
        )}
        style={{
          WebkitUserSelect: 'text',
          userSelect: 'text'
        }}
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <ScrollArea className="max-h-[280px]">
            {suggestionType === 'mention' ? (
              // User mentions
              <div className="py-1">
                {userSuggestions.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => selectSuggestion(user.handle)}
                    className={cn(
                      "w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left",
                      index === selectedIndex && "bg-accent/50"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.display_name?.charAt(0).toUpperCase() || '@'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.handle}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              // Hashtag suggestions
              <div className="py-1">
                {hashtagSuggestions.map((tag, index) => (
                  <button
                    key={tag.hashtag}
                    type="button"
                    onClick={() => selectSuggestion(tag.hashtag)}
                    className={cn(
                      "w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors text-left",
                      index === selectedIndex && "bg-accent/50"
                    )}
                  >
                    <span className="font-medium text-primary">#{tag.hashtag}</span>
                    <span className="text-xs text-muted-foreground">{tag.count} posts</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
