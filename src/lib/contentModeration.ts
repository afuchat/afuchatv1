/**
 * Advanced AI-based Content Moderation System
 * Only allows Telegram links and AfuChat links
 * All other external links are blocked
 */

// Allowed domain patterns
const ALLOWED_DOMAINS = [
  // Telegram domains
  't.me',
  'telegram.me',
  'telegram.org',
  'telesco.pe',
  // AfuChat domains
  'afuchat.com',
  'www.afuchat.com',
  'app.afuchat.com',
];

// URL regex pattern to match URLs in text
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/[^\s<>"{}|\\^`\[\]]*)?)/gi;

export interface LinkValidationResult {
  isValid: boolean;
  allowedLinks: string[];
  blockedLinks: string[];
  message?: string;
}

export interface ContentModerationResult {
  isApproved: boolean;
  sanitizedContent: string;
  linkValidation: LinkValidationResult;
  warnings: string[];
}

/**
 * Extracts the domain from a URL
 */
function extractDomain(url: string): string {
  try {
    // Add protocol if missing for URL parsing
    let urlToParse = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlToParse = `https://${url}`;
    }
    
    const parsed = new URL(urlToParse);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    // Fallback regex extraction for malformed URLs
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s:]+)/i);
    return match ? match[1].toLowerCase() : '';
  }
}

/**
 * Checks if a domain is in the allowed list
 */
function isDomainAllowed(domain: string): boolean {
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
  
  return ALLOWED_DOMAINS.some(allowed => {
    const cleanAllowed = allowed.toLowerCase().replace(/^www\./, '');
    // Exact match or subdomain match
    return cleanDomain === cleanAllowed || cleanDomain.endsWith(`.${cleanAllowed}`);
  });
}

/**
 * Checks if a URL is a Telegram link
 */
export function isTelegramLink(url: string): boolean {
  const domain = extractDomain(url);
  return domain === 't.me' || 
         domain === 'telegram.me' || 
         domain === 'telegram.org' ||
         domain === 'telesco.pe' ||
         domain.endsWith('.t.me') ||
         domain.endsWith('.telegram.me') ||
         domain.endsWith('.telegram.org');
}

/**
 * Checks if a URL is an AfuChat link
 */
export function isAfuChatLink(url: string): boolean {
  const domain = extractDomain(url);
  return domain === 'afuchat.com' || 
         domain.endsWith('.afuchat.com');
}

/**
 * Checks if a URL is allowed (Telegram or AfuChat)
 */
export function isAllowedLink(url: string): boolean {
  return isTelegramLink(url) || isAfuChatLink(url);
}

/**
 * Extracts all URLs from text content
 */
export function extractAllUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  
  // Normalize and deduplicate URLs
  const urls = matches.map(url => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  });
  
  return [...new Set(urls)];
}

/**
 * Validates all links in the content
 */
export function validateLinks(content: string): LinkValidationResult {
  const urls = extractAllUrls(content);
  const allowedLinks: string[] = [];
  const blockedLinks: string[] = [];
  
  for (const url of urls) {
    if (isAllowedLink(url)) {
      allowedLinks.push(url);
    } else {
      blockedLinks.push(url);
    }
  }
  
  const isValid = blockedLinks.length === 0;
  let message: string | undefined;
  
  if (!isValid) {
    message = `External links are not allowed. Only Telegram and AfuChat links are permitted. Blocked: ${blockedLinks.join(', ')}`;
  }
  
  return {
    isValid,
    allowedLinks,
    blockedLinks,
    message,
  };
}

/**
 * Removes blocked links from content (optional sanitization)
 */
export function removeBlockedLinks(content: string): string {
  const urls = extractAllUrls(content);
  let sanitized = content;
  
  for (const url of urls) {
    if (!isAllowedLink(url)) {
      // Remove the URL from content
      sanitized = sanitized.replace(new RegExp(escapeRegex(url), 'gi'), '[link removed]');
    }
  }
  
  return sanitized;
}

/**
 * Helper to escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Full content moderation check
 */
export function moderateContent(content: string): ContentModerationResult {
  const warnings: string[] = [];
  const linkValidation = validateLinks(content);
  
  // Check for blocked links
  if (!linkValidation.isValid) {
    warnings.push(linkValidation.message || 'Content contains blocked links');
  }
  
  // Check for suspicious patterns (potential link obfuscation)
  const obfuscationPatterns = [
    /\b(dot|d0t|\.)\s*(com|org|net|io|co)\b/gi, // "dot com" style
    /\b(at|@)\s*[a-zA-Z]+\s*(dot|\.)\s*(com|org|net)\b/gi, // "at example dot com"
  ];
  
  for (const pattern of obfuscationPatterns) {
    if (pattern.test(content)) {
      warnings.push('Content may contain obfuscated links');
      break;
    }
  }
  
  const isApproved = linkValidation.isValid;
  
  return {
    isApproved,
    sanitizedContent: isApproved ? content : removeBlockedLinks(content),
    linkValidation,
    warnings,
  };
}

/**
 * Get allowed links for preview fetching
 * Only returns Telegram and AfuChat links that should be previewed
 */
export function getPreviewableLinks(content: string): string[] {
  const urls = extractAllUrls(content);
  return urls.filter(url => isAllowedLink(url));
}

/**
 * Checks if content should be allowed to post
 * Returns an error message if not allowed, null if allowed
 */
export function checkContentAllowed(content: string): string | null {
  const validation = validateLinks(content);
  
  if (!validation.isValid) {
    const blockedCount = validation.blockedLinks.length;
    return `Your post contains ${blockedCount} external link${blockedCount > 1 ? 's' : ''} that ${blockedCount > 1 ? 'are' : 'is'} not allowed. Only Telegram and AfuChat links are permitted.`;
  }
  
  return null;
}
