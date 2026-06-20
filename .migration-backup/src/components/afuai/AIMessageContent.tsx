import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ExternalLink, Copy, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface AIMessageContentProps {
  content: string;
  isUser?: boolean;
}

// Platform routes mapped by keyword for natural language detection
const PLATFORM_ROUTES: Record<string, { path: string; label: string }> = {
  'wallet': { path: '/wallet', label: 'Wallet' },
  'premium': { path: '/premium', label: 'Premium' },
  'support': { path: '/support', label: 'Support' },
  'privacy policy': { path: '/privacy', label: 'Privacy Policy' },
  'privacy': { path: '/privacy', label: 'Privacy Policy' },
  'terms of use': { path: '/terms', label: 'Terms of Use' },
  'terms': { path: '/terms', label: 'Terms of Use' },
  'gifts': { path: '/gifts', label: 'Gifts' },
  'creator earnings': { path: '/creator-earnings', label: 'Creator Earnings' },
  'earnings': { path: '/creator-earnings', label: 'Creator Earnings' },
  'shop': { path: '/shop', label: 'Shop' },
  'games': { path: '/games', label: 'Games' },
  'feed': { path: '/feed', label: 'Feed' },
  'chats': { path: '/chats', label: 'Chats' },
  'search': { path: '/search', label: 'Search' },
  'notifications': { path: '/notifications', label: 'Notifications' },
  'afuai': { path: '/afuai', label: 'AfuAI' },
  'settings': { path: '/settings', label: 'Settings' },
  'edit profile': { path: '/edit-profile', label: 'Edit Profile' },
  'moments': { path: '/moments', label: 'Moments' },
  'marketplace': { path: '/marketplace', label: 'Marketplace' },
  'travel': { path: '/travel', label: 'Travel' },
  'events': { path: '/events', label: 'Events' },
  'rides': { path: '/rides', label: 'Rides' },
  'food delivery': { path: '/food-delivery', label: 'Food Delivery' },
  'bookings': { path: '/bookings', label: 'Bookings' },
  'afumail': { path: '/afumail', label: 'AfuMail' },
  'business dashboard': { path: '/business-dashboard', label: 'Business Dashboard' },
  'affiliate dashboard': { path: '/affiliate-dashboard', label: 'Affiliate Dashboard' },
  'affiliate request': { path: '/affiliate-request', label: 'Affiliate Request' },
  'verification request': { path: '/verification-request', label: 'Verification Request' },
  'qr code': { path: '/qr-code', label: 'QR Code' },
  'security': { path: '/security', label: 'Security' },
  'developer sdk': { path: '/developer-sdk', label: 'Developer SDK' },
  "what's new": { path: '/whats-new', label: "What's New" },
  'leaderboard': { path: '/leaderboard', label: 'Leaderboard' },
  'christmas gifts': { path: '/christmas-gifts', label: 'Christmas Gifts' },
  'home': { path: '/home', label: 'Home' },
};

// Slash-based route pattern for backward compat
const SLASH_ROUTES: Record<string, string> = {
  '/wallet': 'Wallet', '/premium': 'Premium', '/support': 'Support',
  '/privacy': 'Privacy Policy', '/terms': 'Terms of Use', '/gifts': 'Gifts',
  '/creator-earnings': 'Creator Earnings', '/shop': 'Shop', '/games': 'Games',
  '/feed': 'Feed', '/chats': 'Chats', '/search': 'Search', '/notifications': 'Notifications',
  '/afuai': 'AfuAI', '/settings': 'Settings', '/edit-profile': 'Edit Profile',
  '/moments': 'Moments', '/marketplace': 'Marketplace', '/travel': 'Travel',
  '/events': 'Events', '/rides': 'Rides', '/food-delivery': 'Food Delivery',
  '/bookings': 'Bookings', '/afumail': 'AfuMail', '/business-dashboard': 'Business Dashboard',
  '/affiliate-dashboard': 'Affiliate Dashboard', '/affiliate-request': 'Affiliate Request',
  '/verification-request': 'Verification Request', '/qr-code': 'QR Code',
  '/security': 'Security', '/developer-sdk': 'Developer SDK',
  '/whats-new': "What's New", '/leaderboard': 'Leaderboard',
  '/christmas-gifts': 'Christmas Gifts', '/home': 'Home',
};

// Pro navigation pill (rounded-full, refined spacing & hover for premium feel)
const NavPill: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-sm text-[13px] font-semibold transition-all mx-0.5"
  >
    {label}
    <ChevronRight className="h-3 w-3" />
  </Link>
);

// Convert both slash routes, natural language keywords, AND @usernames to clickable links
function convertRoutesToLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let keyCounter = 0;

  // First pass: convert slash-based routes like /wallet
  const slashPattern = /\/[a-z]+(?:-[a-z]+)*/gi;
  let processed = '';
  let lastIndex = 0;
  let match;
  while ((match = slashPattern.exec(text)) !== null) {
    const path = match[0].toLowerCase();
    if (SLASH_ROUTES[path]) {
      processed += text.substring(lastIndex, match.index);
      processed += `[[NAV:${path}:${SLASH_ROUTES[path]}]]`;
      lastIndex = match.index + match[0].length;
    }
  }
  processed += text.substring(lastIndex);

  // NEW: @username mentions (prioritized before keywords – links to clean /profile/{username} route)
  // Protected against emails, code, and existing markers. Usernames 3-30 alphanumeric + underscore.
  const mentionPattern = /(?<!\[\[NAV:[^\]]*)(?<!\w)@([a-zA-Z0-9_]{3,30})(?!\w)(?![^\[]*\]\])/gi;
  processed = processed.replace(mentionPattern, `[[NAV:/profile/$1:@$1]]`);

  // Second pass: convert keyword-based mentions (sorted by length desc to match longest first)
  const sortedKeywords = Object.keys(PLATFORM_ROUTES).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeywords) {
    const route = PLATFORM_ROUTES[keyword];
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[\\[NAV:[^\\]]*)(\\b${escapedKeyword}\\b)(?![^\\[]*\\]\\])`, 'gi');
    processed = processed.replace(regex, `[[NAV:${route.path}:${route.label}]]`);
  }

  // Third pass: convert all [[NAV:...]] markers to React elements
  const markerPattern = /\[\[NAV:([^:]+):([^\]]+)\]\]/g;
  lastIndex = 0;
  while ((match = markerPattern.exec(processed)) !== null) {
    if (match.index > lastIndex) {
      parts.push(processed.substring(lastIndex, match.index));
    }
    parts.push(<NavPill key={`nav-${keyCounter++}`} to={match[1]} label={match[2]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < processed.length) {
    parts.push(processed.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Code block with copy button (unchanged – already premium)
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [code]);
  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 rounded-t-lg border-b border-zinc-700">
        <span className="text-xs font-mono text-zinc-400 uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
        >
          {copied ? (
            <><Check className="h-3.5 w-3.5 text-green-400" /><span>Copied!</span></>
          ) : (
            <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
          )}
        </button>
      </div>
      <div className="bg-zinc-950 rounded-b-lg p-4 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed text-zinc-100">{code}</pre>
      </div>
    </div>
  );
};

const AIMessageContent: React.FC<AIMessageContentProps> = ({ content, isUser }) => {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0">
      <ReactMarkdown
        components={{
          p: ({ children }) => {
            const processChildren = (child: React.ReactNode): React.ReactNode => {
              if (typeof child === 'string') return convertRoutesToLinks(child);
              return child;
            };
            return (
              <p className="text-[13.5px] leading-[1.65] text-foreground/90">
                {React.Children.map(children, processChildren)}
              </p>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-[17px] font-black text-foreground tracking-tight border-b border-border/30 pb-1.5 mb-3 mt-4">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15.5px] font-bold text-foreground tracking-tight mt-4 mb-2 flex items-center gap-1.5">
              <span className="w-1 h-4 bg-primary rounded-full inline-block" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14.5px] font-bold text-foreground mt-3 mb-1.5">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-2 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2 ml-1">{children}</ol>
          ),
          li: ({ children }) => {
            const processChildren = (child: React.ReactNode): React.ReactNode => {
              if (typeof child === 'string') return convertRoutesToLinks(child);
              return child;
            };
            return (
              <li className="text-[13.5px] leading-[1.6] flex items-start gap-1.5">
                <span className="mt-[7px] w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                <span className="flex-1">{React.Children.map(children, processChildren)}</span>
              </li>
            );
          },
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
          pre: ({ children }) => {
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
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[13px] font-mono font-medium">
                  {children}
                </code>
              );
            }
            return <code className={className}>{children}</code>;
          },
          // NEW: Premium image rendering (rounded, bordered, subtle shadow)
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="my-4 rounded-2xl max-w-full h-auto border border-border/50 shadow-sm"
            />
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary/50 bg-primary/5 pl-4 py-2 pr-3 rounded-r-lg italic text-foreground/80 my-3">
              {children}
            </blockquote>
          ),
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
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold"
              >
                {children}
                <ChevronRight className="h-3 w-3" />
              </Link>
            );
          },
          hr: () => <hr className="border-border/40 my-4" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-muted/50 text-left text-xs font-bold text-foreground uppercase tracking-wide border-b border-border/50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-[13px] border-b border-border/30">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default AIMessageContent;
