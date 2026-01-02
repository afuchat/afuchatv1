import React from 'react';

/**
 * Parses text with rich formatting markers and returns formatted JSX
 * Supported formats:
 * - *text* for bold
 * - _text_ for italic
 * - ~text~ for strikethrough
 * - `text` for code/monospace
 */
export const parseRichText = (text: string): React.ReactNode => {
  if (!text || typeof text !== 'string') return text;

  // Twitter/X style formatting: **bold**, _italic_, ~~strikethrough~~, `code`
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, wrapper: (content: string, key: number) => <strong key={key} className="font-bold">{content}</strong> },
    { regex: /_([^_]+)_/g, wrapper: (content: string, key: number) => <em key={key} className="italic">{content}</em> },
    { regex: /~~([^~]+)~~/g, wrapper: (content: string, key: number) => <span key={key} className="line-through">{content}</span> },
    { regex: /`([^`]+)`/g, wrapper: (content: string, key: number) => <code key={key} className="px-1 py-0.5 bg-muted rounded text-sm font-mono">{content}</code> },
  ];

  let result: React.ReactNode[] = [text];
  let keyCounter = 0;

  patterns.forEach(({ regex, wrapper }) => {
    const newResult: React.ReactNode[] = [];
    
    result.forEach((part) => {
      if (typeof part !== 'string') {
        newResult.push(part);
        return;
      }

      let lastIndex = 0;
      const matches = Array.from(part.matchAll(regex));

      if (matches.length === 0) {
        newResult.push(part);
        return;
      }

      matches.forEach((match) => {
        const matchIndex = match.index!;
        const fullMatch = match[0];
        const content = match[1];

        if (matchIndex > lastIndex) {
          newResult.push(part.substring(lastIndex, matchIndex));
        }

        newResult.push(wrapper(content, keyCounter++));
        lastIndex = matchIndex + fullMatch.length;
      });

      if (lastIndex < part.length) {
        newResult.push(part.substring(lastIndex));
      }
    });

    result = newResult;
  });

  return <>{result}</>;
};

/**
 * Combines rich text parsing with other content parsing (mentions, hashtags, links)
 */
export const parseRichContent = (
  content: string,
  options?: {
    onMentionClick?: (handle: string) => void;
    onHashtagClick?: (hashtag: string) => void;
  }
): React.ReactNode => {
  if (!content || typeof content !== 'string') return content;

  // First apply rich text formatting
  const richFormatted = parseRichText(content);
  
  return richFormatted;
};
