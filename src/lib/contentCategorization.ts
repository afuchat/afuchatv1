// Content Categorization Algorithm
// Uses weighted keyword matching, pattern detection, and entity recognition

export type ContentCategory = 'news' | 'sports' | 'entertainment' | 'technology' | 'politics' | 'business' | 'lifestyle' | 'general';

// Media/Content Type Detection
export type MediaType = 'text' | 'image' | 'video' | 'gif' | 'link' | 'poll' | 'mixed';

export interface ContentTypeInfo {
  mediaType: MediaType;
  hasImages: boolean;
  hasVideo: boolean;
  hasGif: boolean;
  hasLink: boolean;
  hasPoll: boolean;
  imageCount: number;
  linkCount: number;
  textLength: number;
  isTextOnly: boolean;
  isMediaHeavy: boolean;
}

interface CategoryRule {
  keywords: string[];
  phrases: string[];
  patterns: RegExp[];
  weight: number;
}

interface CategoryScore {
  category: ContentCategory;
  score: number;
  confidence: number;
}

// Detect media type from post content and metadata
export function detectContentType(post: {
  content?: string;
  image_url?: string | null;
  video_url?: string | null;
  post_images?: { id: string; image_url: string }[];
  poll_id?: string | null;
}): ContentTypeInfo {
  const content = post.content || '';
  
  // Count images
  const imageCount = (post.post_images?.length || 0) + (post.image_url ? 1 : 0);
  const hasImages = imageCount > 0;
  
  // Check for video
  const hasVideo = !!(post.video_url) || 
    /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(content) ||
    /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)/i.test(content);
  
  // Check for GIF
  const hasGif = /\.gif(\?|$)/i.test(content) || 
    /\.gif(\?|$)/i.test(post.image_url || '') ||
    /(giphy\.com|tenor\.com)/i.test(content);
  
  // Check for links
  const linkMatches = content.match(/https?:\/\/[^\s]+/gi) || [];
  const linkCount = linkMatches.length;
  const hasLink = linkCount > 0;
  
  // Check for poll
  const hasPoll = !!post.poll_id;
  
  // Text analysis
  const textLength = content.replace(/https?:\/\/[^\s]+/gi, '').trim().length;
  const isTextOnly = !hasImages && !hasVideo && !hasGif && !hasPoll && textLength > 0;
  const isMediaHeavy = hasImages || hasVideo || hasGif;
  
  // Determine primary media type
  let mediaType: MediaType = 'text';
  if (hasVideo) {
    mediaType = 'video';
  } else if (hasGif) {
    mediaType = 'gif';
  } else if (hasImages && imageCount > 0) {
    mediaType = 'image';
  } else if (hasLink && textLength < 100) {
    mediaType = 'link';
  } else if (hasPoll) {
    mediaType = 'poll';
  } else if ((hasImages || hasLink) && textLength > 50) {
    mediaType = 'mixed';
  }
  
  return {
    mediaType,
    hasImages,
    hasVideo,
    hasGif,
    hasLink,
    hasPoll,
    imageCount,
    linkCount,
    textLength,
    isTextOnly,
    isMediaHeavy,
  };
}

// Filter posts by media type
export function filterByMediaType<T extends {
  content?: string;
  image_url?: string | null;
  video_url?: string | null;
  post_images?: { id: string; image_url: string }[];
  poll_id?: string | null;
}>(posts: T[], mediaType: MediaType | 'all'): T[] {
  if (mediaType === 'all') return posts;
  
  return posts.filter(post => {
    const info = detectContentType(post);
    
    switch (mediaType) {
      case 'image':
        return info.hasImages && !info.hasVideo;
      case 'video':
        return info.hasVideo;
      case 'gif':
        return info.hasGif;
      case 'link':
        return info.hasLink && !info.hasImages && !info.hasVideo;
      case 'text':
        return info.isTextOnly;
      case 'poll':
        return info.hasPoll;
      case 'mixed':
        return info.mediaType === 'mixed';
      default:
        return true;
    }
  });
}

// Get media type label for display
export function getMediaTypeLabel(mediaType: MediaType): string {
  const labels: Record<MediaType, string> = {
    text: 'Text',
    image: 'Photos',
    video: 'Videos',
    gif: 'GIFs',
    link: 'Links',
    poll: 'Polls',
    mixed: 'Mixed',
  };
  return labels[mediaType] || 'All';
}

// Category definitions with keywords, phrases, and patterns
const CATEGORY_RULES: Record<ContentCategory, CategoryRule> = {
  news: {
    keywords: [
      'breaking', 'headline', 'report', 'update', 'announce', 'official', 'latest',
      'develop', 'alert', 'urgent', 'confirm', 'statement', 'press', 'media',
      'source', 'exclusive', 'investigation', 'incident', 'crisis', 'emergency'
    ],
    phrases: [
      'breaking news', 'just in', 'developing story', 'according to sources',
      'officials say', 'reports indicate', 'confirmed that', 'announced today',
      'in a statement', 'press release', 'news update', 'latest development'
    ],
    patterns: [
      /breaking:/i,
      /\b(cnn|bbc|reuters|ap news|fox news|msnbc)\b/i,
      /\b(just in|developing)\b/i,
      /\breport(s|ed|ing)?\b/i
    ],
    weight: 1.2
  },
  sports: {
    keywords: [
      'game', 'match', 'team', 'player', 'score', 'win', 'championship', 'league',
      'football', 'basketball', 'soccer', 'tennis', 'cricket', 'baseball', 'hockey',
      'golf', 'racing', 'athlete', 'coach', 'season', 'tournament', 'final',
      'playoff', 'goal', 'touchdown', 'slam dunk', 'home run', 'trophy', 'medal',
      'olympic', 'fifa', 'nba', 'nfl', 'mlb', 'uefa', 'espn', 'stadium', 'arena'
    ],
    phrases: [
      'world cup', 'super bowl', 'champions league', 'grand slam', 'world series',
      'scored a goal', 'won the match', 'set a record', 'made history',
      'defeated', 'beat', 'playoffs', 'final score', 'injury update'
    ],
    patterns: [
      /\b\d+-\d+\b.*\b(win|loss|score|beat|defeated)\b/i,
      /\b(vs\.?|versus)\b/i,
      /\b(halftime|overtime|extra time)\b/i,
      /\b(mvp|goat)\b/i,
      /\b(premier league|la liga|serie a|bundesliga|ligue 1)\b/i
    ],
    weight: 1.3
  },
  entertainment: {
    keywords: [
      'movie', 'film', 'music', 'celebrity', 'song', 'concert', 'album', 'star',
      'show', 'tv', 'series', 'actor', 'actress', 'singer', 'award', 'grammy',
      'oscar', 'emmy', 'billboard', 'netflix', 'disney', 'marvel', 'hollywood',
      'premiere', 'release', 'trailer', 'episode', 'season', 'streaming',
      'podcast', 'viral', 'trending', 'tiktok', 'instagram', 'youtube'
    ],
    phrases: [
      'box office', 'red carpet', 'new album', 'music video', 'tv show',
      'award show', 'number one', 'chart topping', 'binge watch', 'season finale',
      'new release', 'coming soon', 'fan favorite', 'celebrity news'
    ],
    patterns: [
      /\b(starring|directed by|produced by)\b/i,
      /\b(out now|drops today|releases)\b/i,
      /\b(fans|stans)\b/i,
      /\b(spoiler|recap)\b/i,
      /\b(emmy|grammy|oscar|tony|golden globe)\b/i
    ],
    weight: 1.2
  },
  technology: {
    keywords: [
      'tech', 'software', 'hardware', 'app', 'device', 'ai', 'artificial intelligence',
      'machine learning', 'startup', 'innovation', 'digital', 'cyber', 'data',
      'cloud', 'blockchain', 'crypto', 'bitcoin', 'ethereum', 'programming',
      'developer', 'coding', 'api', 'smartphone', 'laptop', 'gadget', 'robot',
      'automation', 'algorithm', 'silicon valley', 'apple', 'google', 'microsoft',
      'amazon', 'meta', 'tesla', 'openai', 'chatgpt'
    ],
    phrases: [
      'artificial intelligence', 'machine learning', 'virtual reality',
      'augmented reality', 'internet of things', 'big data', 'quantum computing',
      'self driving', 'electric vehicle', 'tech giant', 'startup funding',
      'product launch', 'software update', 'security breach', 'data privacy'
    ],
    patterns: [
      /\b(ios|android|windows|macos|linux)\b/i,
      /\b(iphone|pixel|galaxy|macbook)\b/i,
      /\b(version \d+|\d+\.\d+(\.\d+)?)\b/i,
      /\b(api|sdk|gpu|cpu|ram|ssd)\b/i,
      /\b(saas|paas|iaas)\b/i
    ],
    weight: 1.3
  },
  politics: {
    keywords: [
      'government', 'president', 'minister', 'congress', 'senate', 'parliament',
      'election', 'vote', 'campaign', 'policy', 'law', 'legislation', 'democrat',
      'republican', 'liberal', 'conservative', 'political', 'administration',
      'diplomatic', 'treaty', 'sanction', 'constitution', 'amendment', 'bill',
      'supreme court', 'white house', 'capitol', 'nato', 'un', 'eu'
    ],
    phrases: [
      'breaking news', 'election results', 'press conference', 'executive order',
      'foreign policy', 'trade deal', 'peace talks', 'summit meeting',
      'campaign trail', 'polling data', 'swing state', 'political party'
    ],
    patterns: [
      /\b(president|prime minister|chancellor|senator|congressman)\s+\w+/i,
      /\b(white house|capitol hill|downing street)\b/i,
      /\b(democrat|republican|gop|dnc|rnc)\b/i,
      /\b(left wing|right wing|bipartisan)\b/i
    ],
    weight: 1.4
  },
  business: {
    keywords: [
      'market', 'stock', 'invest', 'company', 'ceo', 'profit', 'revenue',
      'earnings', 'quarter', 'shares', 'trading', 'finance', 'economy',
      'inflation', 'interest rate', 'fed', 'bank', 'merger', 'acquisition',
      'ipo', 'nasdaq', 'dow jones', 's&p', 'wall street', 'entrepreneur'
    ],
    phrases: [
      'stock market', 'earnings report', 'quarterly results', 'market cap',
      'initial public offering', 'mergers and acquisitions', 'venture capital',
      'interest rates', 'economic growth', 'supply chain', 'consumer spending'
    ],
    patterns: [
      /\$\d+(\.\d+)?[BMK]?/i,
      /\b\d+(\.\d+)?%\s*(up|down|increase|decrease|growth|decline)\b/i,
      /\b(nyse|nasdaq|ftse|nikkei)\b/i,
      /\b(q[1-4]|fy\d{2,4})\b/i
    ],
    weight: 1.2
  },
  lifestyle: {
    keywords: [
      'health', 'fitness', 'diet', 'food', 'recipe', 'travel', 'vacation',
      'fashion', 'style', 'beauty', 'wellness', 'yoga', 'meditation',
      'relationship', 'family', 'parenting', 'home', 'decor', 'diy',
      'hobby', 'garden', 'pet', 'self care', 'mindfulness'
    ],
    phrases: [
      'how to', 'tips for', 'best way', 'top 10', 'must try', 'life hack',
      'healthy living', 'work life balance', 'mental health', 'self improvement',
      'travel guide', 'recipe of', 'fashion trend', 'beauty tips'
    ],
    patterns: [
      /\b(recipe|how to|diy|tutorial)\b/i,
      /\b\d+\s*(tips|ways|steps|reasons)\b/i,
      /\b(best|top|ultimate)\s+\d*\s*(guide|list|tips)\b/i
    ],
    weight: 1.0
  },
  general: {
    keywords: [],
    phrases: [],
    patterns: [],
    weight: 0.5
  }
};

// Calculate score for a single category
function calculateCategoryScore(content: string, category: ContentCategory): number {
  const rules = CATEGORY_RULES[category];
  if (!rules) return 0;

  const lowerContent = content.toLowerCase();
  let score = 0;

  // Keyword matching (1 point each)
  for (const keyword of rules.keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      score += matches.length;
    }
  }

  // Phrase matching (3 points each - more specific)
  for (const phrase of rules.phrases) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      score += 3;
    }
  }

  // Pattern matching (2 points each)
  for (const pattern of rules.patterns) {
    if (pattern.test(content)) {
      score += 2;
    }
  }

  // Apply category weight
  return score * rules.weight;
}

// Main categorization function
export function categorizeContent(content: string): CategoryScore[] {
  if (!content || content.trim().length === 0) {
    return [{ category: 'general', score: 0, confidence: 0 }];
  }

  const scores: CategoryScore[] = [];
  let totalScore = 0;

  // Calculate scores for all categories
  for (const category of Object.keys(CATEGORY_RULES) as ContentCategory[]) {
    if (category === 'general') continue;
    
    const score = calculateCategoryScore(content, category);
    if (score > 0) {
      scores.push({ category, score, confidence: 0 });
      totalScore += score;
    }
  }

  // If no matches, return general
  if (scores.length === 0 || totalScore === 0) {
    return [{ category: 'general', score: 0, confidence: 100 }];
  }

  // Calculate confidence percentages
  for (const item of scores) {
    item.confidence = Math.round((item.score / totalScore) * 100);
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

// Get primary category with minimum confidence threshold
export function getPrimaryCategory(content: string, minConfidence: number = 30): ContentCategory {
  const scores = categorizeContent(content);
  
  if (scores.length === 0 || scores[0].confidence < minConfidence) {
    return 'general';
  }
  
  return scores[0].category;
}

// Check if content belongs to a specific category
export function belongsToCategory(content: string, category: ContentCategory, minConfidence: number = 25): boolean {
  const scores = categorizeContent(content);
  const categoryScore = scores.find(s => s.category === category);
  
  return categoryScore ? categoryScore.confidence >= minConfidence : false;
}

// Get all categories a post belongs to (above threshold)
export function getPostCategories(content: string, minConfidence: number = 20): ContentCategory[] {
  const scores = categorizeContent(content);
  return scores
    .filter(s => s.confidence >= minConfidence)
    .map(s => s.category);
}

// Map UI tab names to categories
export function mapTabToCategory(tab: string): ContentCategory | null {
  const mapping: Record<string, ContentCategory> = {
    'News': 'news',
    'Sports': 'sports',
    'Entertainment': 'entertainment',
    'Technology': 'technology',
    'Politics': 'politics',
    'Business': 'business',
    'Lifestyle': 'lifestyle',
  };
  
  return mapping[tab] || null;
}

// Filter posts by category
export function filterPostsByCategory<T extends { content: string }>(
  posts: T[],
  category: ContentCategory,
  minConfidence: number = 20
): T[] {
  if (category === 'general') return posts;
  
  return posts.filter(post => belongsToCategory(post.content, category, minConfidence));
}
