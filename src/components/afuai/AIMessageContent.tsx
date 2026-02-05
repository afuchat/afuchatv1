import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

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
  '/profile': 'Profile',
  '/moments': 'Moments',
  '/mini-programs': 'Mini Programs',
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
          // Style code
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono">{children}</code>;
            }
            return <code className={cn("block p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto", className)}>{children}</code>;
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
