import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { categorizeContent, ContentCategory } from '@/lib/contentCategorization';

// Engagement weights (raw score formula: likes*W_LIKE + comments*W_COMMENT + views*W_VIEW)
const ENGAGEMENT_WEIGHTS = {
  like: 3,
  comment: 5,
  repost: 4,
  view: 0.1,
} as const;

// Interaction learning weights (how much each action updates user interest model)
const INTERACTION_WEIGHTS = {
  like: 3,
  comment: 5,
  view: 1,
  share: 4,
  follow: 10,
};

// Scoring point caps per dimension
const SCORE_CAPS = {
  engagement: 30,       // up from 10 — engagement is now the dominant signal
  recency: 15,          // time freshness
  categoryMatch: 20,    // content-category alignment
  profileInterest: 25,  // onboarding interest alignment
  authorAffinity: 15,   // affinity for known authors
  verifiedBoost: 5,     // blue-check bonus
  trending: 20,         // velocity bonus for rapidly rising posts
  diversity: -15,       // same-author repetition penalty
  random: 8,            // reduced randomness — let signal dominate
};

// Recency half-life: score halves every N hours
const RECENCY_HALF_LIFE_HOURS = 36;

// Trending detection: posts that gained significant engagement within this window are boosted
const TRENDING_WINDOW_HOURS = 6;

// Map onboarding interests to content categories
const INTEREST_TO_CATEGORY_MAP: Record<string, ContentCategory[]> = {
  art: ['lifestyle', 'entertainment'],
  music: ['entertainment'],
  gaming: ['technology', 'entertainment'],
  reading: ['lifestyle', 'news'],
  movies: ['entertainment'],
  food: ['lifestyle'],
  travel: ['lifestyle'],
  fitness: ['sports', 'lifestyle'],
  tech: ['technology', 'business'],
};

interface UserInterests {
  categories: Record<ContentCategory, number>;
  authors: Record<string, number>;
  hashtags: Record<string, number>;
  profileInterests: string[];
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
    profileInterestBoost: number;
    trendingBoost: number;
    unlikedBoost: number;
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
  profileInterests: [],
  lastUpdated: Date.now(),
};

const getCacheKey = (userId: string) => `userFeedInterests:${userId}`;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Compute a Wilson score lower bound for engagement confidence.
 * Posts with many interactions get a tighter estimate; posts with few get penalized.
 * Returns a value in [0, 1].
 */
function wilsonEngagementScore(positiveEvents: number, totalImpressions: number): number {
  if (totalImpressions === 0) return 0;
  const z = 1.645; // 95% confidence
  const p = positiveEvents / totalImpressions;
  const n = totalImpressions;
  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const denominator = 1 + (z * z) / n;
  return Math.max(0, numerator / denominator);
}

/**
 * Engagement score formula:
 * raw = likes * 3 + comments * 5 + reposts * 4 + views * 0.1
 * Normalized with log scale so viral posts don't dominate infinitely.
 * Wilson confidence applied to anchor sparse-data posts lower.
 * Returns 0-30 points.
 */
function computeEngagementScore(
  likeCount: number,
  replyCount: number,
  viewCount: number,
  repostCount: number = 0,
): number {
  const rawScore =
    likeCount * ENGAGEMENT_WEIGHTS.like +
    replyCount * ENGAGEMENT_WEIGHTS.comment +
    repostCount * ENGAGEMENT_WEIGHTS.repost +
    viewCount * ENGAGEMENT_WEIGHTS.view;

  // Log-scale normalization so a post with 1000 likes isn't astronomically ahead of 100
  const logNormalized = rawScore > 0 ? Math.log1p(rawScore) / Math.log1p(1000) : 0;

  // Wilson confidence: penalize posts with very few impressions
  const positiveSignals = likeCount + replyCount + repostCount;
  const totalSignals = Math.max(viewCount, positiveSignals * 10, 1);
  const confidence = wilsonEngagementScore(positiveSignals, totalSignals);

  // Blend log-normalized score with confidence
  const blended = logNormalized * 0.7 + confidence * 0.3;

  return Math.min(blended * SCORE_CAPS.engagement, SCORE_CAPS.engagement);
}

/**
 * Recency score with exponential half-life decay.
 * A post loses half its recency score every RECENCY_HALF_LIFE_HOURS hours.
 * Returns 0-15 points.
 */
function computeRecencyScore(createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const halfLifeDecay = Math.exp(-Math.LN2 * (ageHours / RECENCY_HALF_LIFE_HOURS));
  return Math.max(0, halfLifeDecay * SCORE_CAPS.recency);
}

/**
 * Trending boost: posts that are recent AND have high engagement relative to their age
 * get an extra boost. This surfaces breaking/viral content fast.
 * Returns 0-20 points.
 */
function computeTrendingBoost(
  createdAt: string,
  likeCount: number,
  replyCount: number,
  viewCount: number,
): number {
  const ageHours = Math.max(0.25, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  if (ageHours > TRENDING_WINDOW_HOURS) return 0;

  // Velocity = engagement events per hour since posting
  const engagementTotal = likeCount + replyCount * 2;
  const velocity = engagementTotal / ageHours;

  // Normalize: consider 50 engagement events/hour as "very trending"
  const normalizedVelocity = Math.min(velocity / 50, 1);
  return normalizedVelocity * SCORE_CAPS.trending;
}

export function useFeedAlgorithm() {
  const { user } = useAuth();

  const [interests, setInterests] = useState<UserInterests>(() => ({
    ...DEFAULT_INTERESTS,
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

  // Learn from user's past interactions and profile interests
  const learnUserInterests = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [likesData, repliesData, viewsData, followsData, profileData] = await Promise.all([
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

        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .limit(200),

        supabase
          .from('profiles')
          .select('interests')
          .eq('id', user.id)
          .single(),
      ]);

      const profileInterests: string[] = (profileData.data?.interests as string[]) || [];

      const newInterests: UserInterests = {
        categories: { ...DEFAULT_INTERESTS.categories },
        authors: {},
        hashtags: {},
        profileInterests,
        lastUpdated: Date.now(),
      };

      // Strong boost for user's selected onboarding interests
      const PROFILE_INTEREST_BOOST = 15;
      profileInterests.forEach((interest) => {
        const mappedCategories = INTEREST_TO_CATEGORY_MAP[interest];
        if (mappedCategories) {
          mappedCategories.forEach((category) => {
            newInterests.categories[category] =
              (newInterests.categories[category] || 0) + PROFILE_INTEREST_BOOST;
          });
        }
      });

      // Process likes
      (likesData.data || []).forEach((like: any) => {
        if (like.posts?.content) {
          const categories = categorizeContent(like.posts.content);
          categories.forEach(cat => {
            newInterests.categories[cat.category] =
              (newInterests.categories[cat.category] || 0) + (INTERACTION_WEIGHTS.like * cat.confidence / 100);
          });
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

      // Process follows (highest author weight)
      (followsData.data || []).forEach((follow: any) => {
        if (follow.following_id) {
          newInterests.authors[follow.following_id] =
            (newInterests.authors[follow.following_id] || 0) + INTERACTION_WEIGHTS.follow;
        }
      });

      // Normalize category scores to 0-10
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

  // Score a single post using the engagement-first algorithm
  const scorePost = useCallback((post: {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    view_count: number;
    has_liked?: boolean;
    profiles: {
      is_verified: boolean | null;
      is_organization_verified: boolean | null;
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
      profileInterestBoost: 0,
      trendingBoost: 0,
      unlikedBoost: 0,
    };

    // 1. ENGAGEMENT SCORE (0-30 pts) — primary ranking signal
    //    Formula: likes*3 + comments*5 + reposts*4 + views*0.1, log-normalized + Wilson confidence
    factors.engagementScore = computeEngagementScore(
      post.like_count,
      post.reply_count,
      post.view_count,
    );

    // 2. TRENDING BOOST (0-20 pts) — extra boost for posts rapidly gaining engagement
    factors.trendingBoost = computeTrendingBoost(
      post.created_at,
      post.like_count,
      post.reply_count,
      post.view_count,
    );

    // 3. RECENCY SCORE (0-15 pts) — exponential half-life decay
    factors.recencyScore = computeRecencyScore(post.created_at);

    // 4. CATEGORY MATCH (0-20 pts) — content-category alignment with user model
    const categories = categorizeContent(post.content);
    categories.forEach(cat => {
      const userInterest = interests.categories[cat.category] || 1;
      factors.categoryMatch += (cat.confidence / 100) * userInterest * 2;
    });
    factors.categoryMatch = Math.min(factors.categoryMatch, SCORE_CAPS.categoryMatch);

    // 5. PROFILE INTEREST BOOST (0-25 pts) — onboarding interest alignment
    if (interests.profileInterests.length > 0) {
      categories.forEach(cat => {
        for (const [interest, mappedCategories] of Object.entries(INTEREST_TO_CATEGORY_MAP)) {
          if (interests.profileInterests.includes(interest) && mappedCategories.includes(cat.category)) {
            factors.profileInterestBoost += (cat.confidence / 100) * 25;
            break;
          }
        }
      });
      factors.profileInterestBoost = Math.min(factors.profileInterestBoost, SCORE_CAPS.profileInterest);
    }

    // 6. AUTHOR AFFINITY (0-15 pts) — prefer authors user has interacted with
    const authorScore = interests.authors[post.author_id] || 0;
    factors.authorAffinity = Math.min(authorScore * 1.5, SCORE_CAPS.authorAffinity);

    // 7. VERIFIED BOOST (0-5 pts)
    if (post.profiles.is_verified || post.profiles.is_organization_verified) {
      factors.verifiedBoost = SCORE_CAPS.verifiedBoost;
    }

    // 8. UNLIKED BOOST — show fresh content the user hasn't engaged with
    if (!post.has_liked) {
      factors.unlikedBoost = 10;
    }

    // 9. DIVERSITY PENALTY — reduce score if we've shown this author recently
    if (recentlyShownAuthors.current.has(post.author_id)) {
      factors.diversityPenalty = SCORE_CAPS.diversity; // negative
    }

    // 10. RANDOM FACTOR (0-8 pts) — reduced: let engagement signal dominate
    const postHash = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    factors.randomFactor = ((postHash * randomSeed) % 100) / (100 / SCORE_CAPS.random);

    const score = Object.values(factors).reduce((sum, val) => sum + val, 0);

    return {
      postId: post.id,
      score: Math.max(0, score),
      factors,
    };
  }, [interests]);

  // Sort posts by engagement-first personalized score with diversity
  const sortPosts = useCallback(<T extends {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    view_count: number;
    has_liked?: boolean;
    profiles: {
      is_verified: boolean | null;
      is_organization_verified: boolean | null;
    };
  }>(posts: T[]): T[] => {
    recentlyShownAuthors.current.clear();

    const sessionSeed = Math.floor(Math.random() * 1000) + 1;

    const scoredPosts = posts.map(post => ({
      post,
      ...scorePost(post, sessionSeed),
    }));

    // Sort by score descending (engagement-first)
    scoredPosts.sort((a, b) => b.score - a.score);

    // Apply diversity: spread posts from the same author
    const result: T[] = [];
    const authorPositions = new Map<string, number[]>();
    const minGapBetweenSameAuthor = 4;

    for (const { post } of scoredPosts) {
      const positions = authorPositions.get(post.author_id) || [];
      const lastPosition = positions[positions.length - 1];

      if (lastPosition === undefined || result.length - lastPosition >= minGapBetweenSameAuthor) {
        result.push(post);
        positions.push(result.length - 1);
        authorPositions.set(post.author_id, positions);
        recentlyShownAuthors.current.add(post.author_id);
      }
    }

    // Append any posts skipped due to diversity rules
    for (const { post } of scoredPosts) {
      if (!result.find(p => p.id === post.id)) {
        result.push(post);
      }
    }

    return result;
  }, [scorePost]);

  // Record an interaction for real-time interest learning
  const recordInteraction = useCallback((
    type: 'like' | 'comment' | 'view' | 'share',
    postContent: string,
    authorId: string
  ) => {
    setInterests(prev => {
      const weight = INTERACTION_WEIGHTS[type];
      const newInterests = { ...prev };

      const categories = categorizeContent(postContent);
      categories.forEach(cat => {
        newInterests.categories[cat.category] =
          (newInterests.categories[cat.category] || 0) + (weight * cat.confidence / 100);
      });

      newInterests.authors[authorId] =
        (newInterests.authors[authorId] || 0) + weight;

      const hashtags = postContent.match(/#\w+/g) || [];
      hashtags.forEach((tag: string) => {
        newInterests.hashtags[tag.toLowerCase()] =
          (newInterests.hashtags[tag.toLowerCase()] || 0) + weight;
      });

      newInterests.lastUpdated = Date.now();

      setTimeout(() => {
        if (user) {
          localStorage.setItem(getCacheKey(user.id), JSON.stringify(newInterests));
        }
      }, 1000);

      return newInterests;
    });
  }, [user]);

  // Learn interests on mount / when user changes
  useEffect(() => {
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
