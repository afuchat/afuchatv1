import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { categorizeContent, ContentCategory } from '@/lib/contentCategorization';

// User interaction weights for scoring
const INTERACTION_WEIGHTS = {
  like: 3,
  comment: 5,
  view: 1,
  share: 4,
  follow: 10,
};

// Decay factor for time-based relevance (posts older than this lose relevance)
const TIME_DECAY_HOURS = 72;

interface UserInterests {
  categories: Record<ContentCategory, number>;
  authors: Record<string, number>;
  hashtags: Record<string, number>;
  lastUpdated: number;
}

interface PostScore {
  postId: string;
  score: number;
  factors: {
    categoryMatch: number;
    authorAffinity: number;
    engagementScore: number;
    recencyScore: number;
    verifiedBoost: number;
    diversityPenalty: number;
    randomFactor: number;
  };
}

const DEFAULT_INTERESTS: UserInterests = {
  categories: {
    news: 1,
    sports: 1,
    entertainment: 1,
    technology: 1,
    politics: 1,
    business: 1,
    lifestyle: 1,
    general: 1,
  },
  authors: {},
  hashtags: {},
  lastUpdated: Date.now(),
};

const getCacheKey = (userId: string) => `userFeedInterests:${userId}`;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function useFeedAlgorithm() {
  const { user } = useAuth();

  const [interests, setInterests] = useState<UserInterests>(() => ({
    ...DEFAULT_INTERESTS,
    // Force first-time learning per user unless we restore from cache
    lastUpdated: 0,
  }));

  const [isLoading, setIsLoading] = useState(false);
  const recentlyShownAuthors = useRef<Set<string>>(new Set());

  // Load cached interests per-user whenever the user changes
  useEffect(() => {
    if (!user) {
      setInterests({ ...DEFAULT_INTERESTS, lastUpdated: 0 });
      return;
    }

    try {
      const cached = localStorage.getItem(getCacheKey(user.id));
      if (cached) {
        const parsed = JSON.parse(cached) as UserInterests;
        // If cache is fresh, restore; otherwise keep lastUpdated=0 to trigger re-learn
        if (parsed?.lastUpdated && Date.now() - parsed.lastUpdated < CACHE_TTL) {
          setInterests(parsed);
          return;
        }
      }
    } catch (e) {
      console.debug('Failed to parse cached interests');
    }

    setInterests({ ...DEFAULT_INTERESTS, lastUpdated: 0 });
  }, [user]);

  // Learn from user's past interactions
  const learnUserInterests = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch user's recent interactions in parallel
      const [likesData, repliesData, viewsData, followsData] = await Promise.all([
        // Likes from last 30 days
        supabase
          .from('post_acknowledgments')
          .select(`
            post_id,
            created_at,
            posts(content, author_id, profiles(is_verified, is_organization_verified))
          `)
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Comments from last 30 days
        supabase
          .from('post_replies')
          .select(`
            post_id,
            created_at,
            posts(content, author_id)
          `)
          .eq('author_id', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(50),
        
        // Post views from last 14 days
        supabase
          .from('post_views')
          .select(`
            post_id,
            viewed_at,
            posts(content, author_id)
          `)
          .eq('viewer_id', user.id)
          .gte('viewed_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('viewed_at', { ascending: false })
          .limit(200),
        
        // Who user follows
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .limit(200),
      ]);

      const newInterests: UserInterests = {
        categories: { ...DEFAULT_INTERESTS.categories },
        authors: {},
        hashtags: {},
        lastUpdated: Date.now(),
      };

      // Process likes
      (likesData.data || []).forEach((like: any) => {
        if (like.posts?.content) {
          const categories = categorizeContent(like.posts.content);
          categories.forEach(cat => {
            newInterests.categories[cat.category] = 
              (newInterests.categories[cat.category] || 0) + (INTERACTION_WEIGHTS.like * cat.confidence / 100);
          });
          
          // Extract hashtags
          const hashtags = like.posts.content.match(/#\w+/g) || [];
          hashtags.forEach((tag: string) => {
            newInterests.hashtags[tag.toLowerCase()] = 
              (newInterests.hashtags[tag.toLowerCase()] || 0) + INTERACTION_WEIGHTS.like;
          });
        }
        if (like.posts?.author_id) {
          newInterests.authors[like.posts.author_id] = 
            (newInterests.authors[like.posts.author_id] || 0) + INTERACTION_WEIGHTS.like;
        }
      });

      // Process comments
      (repliesData.data || []).forEach((reply: any) => {
        if (reply.posts?.content) {
          const categories = categorizeContent(reply.posts.content);
          categories.forEach(cat => {
            newInterests.categories[cat.category] = 
              (newInterests.categories[cat.category] || 0) + (INTERACTION_WEIGHTS.comment * cat.confidence / 100);
          });
        }
        if (reply.posts?.author_id) {
          newInterests.authors[reply.posts.author_id] = 
            (newInterests.authors[reply.posts.author_id] || 0) + INTERACTION_WEIGHTS.comment;
        }
      });

      // Process views (lower weight)
      (viewsData.data || []).forEach((view: any) => {
        if (view.posts?.content) {
          const categories = categorizeContent(view.posts.content);
          categories.forEach(cat => {
            newInterests.categories[cat.category] = 
              (newInterests.categories[cat.category] || 0) + (INTERACTION_WEIGHTS.view * cat.confidence / 100);
          });
        }
      });

      // Process follows (highest weight for authors)
      (followsData.data || []).forEach((follow: any) => {
        if (follow.following_id) {
          newInterests.authors[follow.following_id] = 
            (newInterests.authors[follow.following_id] || 0) + INTERACTION_WEIGHTS.follow;
        }
      });

      // Normalize category scores
      const maxCategoryScore = Math.max(...Object.values(newInterests.categories));
      if (maxCategoryScore > 0) {
        Object.keys(newInterests.categories).forEach((cat) => {
          newInterests.categories[cat as ContentCategory] = 
            (newInterests.categories[cat as ContentCategory] / maxCategoryScore) * 10;
        });
      }

      setInterests(newInterests);
      if (user) {
        localStorage.setItem(getCacheKey(user.id), JSON.stringify(newInterests));
      }
    } catch (error) {
      console.error('Failed to learn user interests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Calculate post score based on user interests
  const scorePost = useCallback((post: {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    view_count: number;
    profiles: {
      is_verified: boolean;
      is_organization_verified: boolean;
    };
  }, randomSeed: number): PostScore => {
    const factors = {
      categoryMatch: 0,
      authorAffinity: 0,
      engagementScore: 0,
      recencyScore: 0,
      verifiedBoost: 0,
      diversityPenalty: 0,
      randomFactor: 0,
    };

    // 1. Category match score (0-25 points)
    const categories = categorizeContent(post.content);
    categories.forEach(cat => {
      const userInterest = interests.categories[cat.category] || 1;
      factors.categoryMatch += (cat.confidence / 100) * userInterest * 2.5;
    });
    factors.categoryMatch = Math.min(factors.categoryMatch, 25);

    // 2. Author affinity (0-20 points)
    const authorScore = interests.authors[post.author_id] || 0;
    factors.authorAffinity = Math.min(authorScore * 2, 20);

    // 3. Engagement score (0-15 points)
    const engagementRatio = (post.like_count * 2 + post.reply_count * 3) / Math.max(post.view_count, 1);
    factors.engagementScore = Math.min(engagementRatio * 75, 15);

    // 4. Recency score (0-10 points) - reduced to allow more mixing
    const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    factors.recencyScore = Math.max(0, 10 * Math.exp(-ageHours / TIME_DECAY_HOURS));

    // 5. Verified boost (0-5 points)
    if (post.profiles.is_verified || post.profiles.is_organization_verified) {
      factors.verifiedBoost = 5;
    }

    // 6. Diversity penalty - reduce score if we've shown this author recently
    if (recentlyShownAuthors.current.has(post.author_id)) {
      factors.diversityPenalty = -15;
    }

    // 7. Random factor for variety (0-25 points) - ensures posts aren't always in same order
    // Use post id hash combined with seed for consistent-per-session but varied ordering
    const postHash = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    factors.randomFactor = ((postHash * randomSeed) % 100) / 4; // 0-25 points

    // Calculate final score
    const score = Object.values(factors).reduce((sum, val) => sum + val, 0);

    return {
      postId: post.id,
      score: Math.max(0, score),
      factors,
    };
  }, [interests]);

  // Sort posts by personalized score with variety
  const sortPosts = useCallback(<T extends {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    view_count: number;
    profiles: {
      is_verified: boolean;
      is_organization_verified: boolean;
    };
  }>(posts: T[]): T[] => {
    // Reset recently shown authors for new sort
    recentlyShownAuthors.current.clear();

    // Generate fresh random seed on each sort for variety
    // This ensures users see different post orderings each time they refresh
    const sessionSeed = Math.floor(Math.random() * 1000) + 1;

    // Score all posts with randomization
    const scoredPosts = posts.map(post => ({
      post,
      ...scorePost(post, sessionSeed),
    }));

    // Sort by score descending
    scoredPosts.sort((a, b) => b.score - a.score);

    // Apply diversity: limit consecutive posts from same author
    const result: T[] = [];
    const authorPositions = new Map<string, number[]>();
    const minGapBetweenSameAuthor = 4;

    for (const { post } of scoredPosts) {
      const positions = authorPositions.get(post.author_id) || [];
      const lastPosition = positions[positions.length - 1];
      
      // Check if we can add this post at current position
      if (lastPosition === undefined || result.length - lastPosition >= minGapBetweenSameAuthor) {
        result.push(post);
        positions.push(result.length - 1);
        authorPositions.set(post.author_id, positions);
        recentlyShownAuthors.current.add(post.author_id);
      }
    }

    // Add remaining posts that were skipped due to diversity rules
    for (const { post } of scoredPosts) {
      if (!result.find(p => p.id === post.id)) {
        result.push(post);
      }
    }

    return result;
  }, [scorePost, user]);

  // Record an interaction for learning
  const recordInteraction = useCallback((
    type: 'like' | 'comment' | 'view' | 'share',
    postContent: string,
    authorId: string
  ) => {
    setInterests(prev => {
      const weight = INTERACTION_WEIGHTS[type];
      const newInterests = { ...prev };
      
      // Update category scores
      const categories = categorizeContent(postContent);
      categories.forEach(cat => {
        newInterests.categories[cat.category] = 
          (newInterests.categories[cat.category] || 0) + (weight * cat.confidence / 100);
      });

      // Update author affinity
      newInterests.authors[authorId] = 
        (newInterests.authors[authorId] || 0) + weight;

      // Update hashtags
      const hashtags = postContent.match(/#\w+/g) || [];
      hashtags.forEach((tag: string) => {
        newInterests.hashtags[tag.toLowerCase()] = 
          (newInterests.hashtags[tag.toLowerCase()] || 0) + weight;
      });

      newInterests.lastUpdated = Date.now();
      
      // Debounced save to localStorage
      setTimeout(() => {
        if (user) {
          localStorage.setItem(getCacheKey(user.id), JSON.stringify(newInterests));
        }
      }, 1000);

      return newInterests;
    });
  }, []);

  // Learn interests on mount if user is logged in
  useEffect(() => {
    // If we don't have fresh cached interests for this user, learn immediately
    if (user && (interests.lastUpdated === 0 || Date.now() - interests.lastUpdated > CACHE_TTL)) {
      learnUserInterests();
    }
  }, [user, interests.lastUpdated, learnUserInterests]);

  return {
    sortPosts,
    recordInteraction,
    learnUserInterests,
    interests,
    isLoading,
  };
}
