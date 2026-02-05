import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AIMessageContentProps {
  content: string;
  isUser?: boolean;
}

// Platform routes that should be converted to internal links
const PLATFORM_ROUTES: Record<string, string> = {
  '/wallet': 'Wallet',
  '/premium': 'Premium',
  '/support': 'Support',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Use',
  '/gifts': 'Gifts',
  '/creator-earnings': 'Creator Earnings',
  '/shop': 'Shop',
  '/games': 'Games',
  '/feed': 'Feed',
  '/chats': 'Chats',
  '/search': 'Search',
  '/notifications': 'Notifications',
  '/afuai': 'AfuAI',
  '/settings': 'Settings',
  '/edit-profile': 'Edit Profile',
  '/moments': 'Moments',
  '/marketplace': 'Marketplace',
  '/travel': 'Travel',
  '/events': 'Events',
  '/rides': 'Rides',
  '/food-delivery': 'Food Delivery',
  '/bookings': 'Bookings',
  '/afumail': 'AfuMail',
  '/business-dashboard': 'Business Dashboard',
  '/affiliate-dashboard': 'Affiliate Dashboard',
  '/affiliate-request': 'Affiliate Request',
  '/verification-request': 'Verification Request',
  '/qr-code': 'QR Code',
  '/security': 'Security',
  '/developer-sdk': 'Developer SDK',
  '/blog': 'Blog',
  '/whats-new': "What's New",
  '/leaderboard': 'Leaderboard',
  '/christmas-gifts': 'Christmas Gifts',
  '/home': 'Home',
};

// Convert route paths to clickable links
function convertRoutesToLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Match paths like /wallet, /creator-earnings, etc.
  const routePattern = /\/[a-z]+(?:-[a-z]+)*/gi;
  let match;
  
  while ((match = routePattern.exec(text)) !== null) {
    const path = match[0].toLowerCase();
    
    // Only convert known platform routes
    if (PLATFORM_ROUTES[path]) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add the link
      parts.push(
        <Link 
          key={`${path}-${match.index}`}
          to={path}
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 font-medium transition-colors"
        >
          {PLATFORM_ROUTES[path]}
        </Link>
      );
      
      lastIndex = match.index + match[0].length;
    }
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

// Syntax highlighting color map
const syntaxColors: Record<string, string> = {
  keyword: 'text-purple-400',
  string: 'text-green-400',
  number: 'text-orange-400',
  comment: 'text-gray-500',
  function: 'text-blue-400',
  variable: 'text-cyan-400',
  operator: 'text-pink-400',
  property: 'text-yellow-400',
  bracket: 'text-gray-400',
  type: 'text-emerald-400',
};

// Simple syntax highlighter
function highlightCode(code: string, language?: string): React.ReactNode[] {
  const lines = code.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Keywords for various languages
    const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|default|async|await|try|catch|throw|new|class|extends|implements|interface|type|enum|public|private|protected|static|readonly|abstract|as|typeof|instanceof|in|of|true|false|null|undefined|void|never|any|string|number|boolean|object|symbol|bigint|unknown)\b/g;
    const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
    const numbers = /\b(\d+\.?\d*)\b/g;
    const functions = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g;
    const properties = /\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const brackets = /([{}[\]()])/g;
    const operators = /([+\-*/%=<>!&|^~?:]+)/g;
    const types = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
    
    let result = line;
    const spans: { start: number; end: number; className: string; content: string }[] = [];
    
    // Match and store positions
    let match;
    
    // Comments first (highest priority)
    while ((match = comments.exec(line)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: syntaxColors.comment, content: match[0] });
    }
    
    // Strings
    while ((match = strings.exec(line)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: syntaxColors.string, content: match[0] });
    }
    
    // Keywords
    while ((match = keywords.exec(line)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: syntaxColors.keyword, content: match[0] });
    }
    
    // Numbers
    while ((match = numbers.exec(line)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: syntaxColors.number, content: match[1] });
    }
    
    // Functions
    while ((match = functions.exec(line)) !== null) {
      spans.push({ start: match.index, end: match.index + match[1].length, className: syntaxColors.function, content: match[1] });
    }
    
    // Types (PascalCase)
    while ((match = types.exec(line)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: syntaxColors.type, content: match[0] });
    }
    
    // Sort spans by start position, prioritizing longer matches
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    
    // Remove overlapping spans
    const filteredSpans: typeof spans = [];
    let lastEnd = 0;
    for (const span of spans) {
      if (span.start >= lastEnd) {
        filteredSpans.push(span);
        lastEnd = span.end;
      }
    }
    
    // Build the highlighted line
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    for (const span of filteredSpans) {
      if (span.start > currentIndex) {
        parts.push(<span key={`text-${lineIndex}-${currentIndex}`}>{line.slice(currentIndex, span.start)}</span>);
      }
      parts.push(
        <span key={`span-${lineIndex}-${span.start}`} className={span.className}>
          {span.content}
        </span>
      );
      currentIndex = span.end;
    }
    
    if (currentIndex < line.length) {
      parts.push(<span key={`text-${lineIndex}-end`}>{line.slice(currentIndex)}</span>);
    }
    
    return (
      <div key={lineIndex} className="min-h-[1.25rem]">
        {parts.length > 0 ? parts : line || ' '}
      </div>
    );
  });
}

// Code block with copy button
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  }, [code]);
  
  return (
    <div className="relative group my-3">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 rounded-t-lg border-b border-zinc-700">
        <span className="text-xs font-mono text-zinc-400 uppercase">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content with syntax highlighting */}
      <div className="bg-zinc-950 rounded-b-lg p-4 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed text-zinc-100">
          {highlightCode(code, language)}
        </pre>
      </div>
    </div>
  );
};

const AIMessageContent: React.FC<AIMessageContentProps> = ({ content, isUser }) => {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5">
      <ReactMarkdown
        components={{
          // Custom paragraph to handle route links
          p: ({ children }) => {
            const processChildren = (child: React.ReactNode): React.ReactNode => {
              if (typeof child === 'string') {
                return convertRoutesToLinks(child);
              }
              return child;
            };
            
            return (
              <p className="text-[15px] leading-relaxed">
                {React.Children.map(children, processChildren)}
              </p>
            );
          },
          // Style headings
          h1: ({ children }) => <h1 className="text-lg font-bold text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-foreground">{children}</h3>,
          // Style lists
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
          li: ({ children }) => {
            const processChildren = (child: React.ReactNode): React.ReactNode => {
              if (typeof child === 'string') {
                return convertRoutesToLinks(child);
              }
              return child;
            };
            return <li className="text-[15px]">{React.Children.map(children, processChildren)}</li>;
          },
          // Style bold/strong
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          // Style italic/emphasis
          em: ({ children }) => <em className="italic">{children}</em>,
          // Code blocks with syntax highlighting and copy button
          pre: ({ children }) => {
            // Extract code content from the pre > code structure
            const codeElement = React.Children.toArray(children).find(
              (child): child is React.ReactElement => 
                React.isValidElement(child) && child.type === 'code'
            );
            
            if (codeElement) {
              const className = codeElement.props.className || '';
              const language = className.replace('language-', '');
              const codeContent = String(codeElement.props.children || '').trim();
              
              return <CodeBlock code={codeContent} language={language} />;
            }
            
            return <pre className="bg-zinc-950 rounded-lg p-4 overflow-x-auto">{children}</pre>;
          },
          // Inline code
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            // Block code is handled by pre
            return <code className={className}>{children}</code>;
          },
          // Style blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Style links
          a: ({ href, children }) => {
            const isExternal = href?.startsWith('http');
            if (isExternal) {
              return (
                <a 
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
                >
                  {children}
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            }
            return (
              <Link 
                to={href || '#'}
                className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
              >
                {children}
              </Link>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default AIMessageContent;
