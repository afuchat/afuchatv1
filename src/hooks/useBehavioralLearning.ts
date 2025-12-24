import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MediaType, detectContentType } from '@/lib/contentCategorization';

// Types for behavioral tracking
interface ContentInteraction {
  contentId: string;
  contentType: 'post' | 'profile' | 'hashtag' | 'category';
  action: 'click' | 'view' | 'scroll_past' | 'swipe_away' | 'long_press' | 'share' | 'like' | 'comment';
  dwellTime: number; // milliseconds
  scrollDepth: number; // 0-100 percentage
  timestamp: number;
  metadata?: {
    authorId?: string;
    category?: string;
    hashtags?: string[];
    hasMedia?: boolean;
    mediaType?: MediaType;
    contentLength?: number;
    imageCount?: number;
  };
}

interface UserPreferences {
  // Content type preferences (0-1 scale)
  contentTypes: {
    text: number;
    image: number;
    video: number;
    link: number;
    gif: number;
    poll: number;
    mixed: number;
  };
  
  // Category affinities
  categories: Record<string, number>;
  
  // Author affinities
  authors: Record<string, number>;
  
  // Hashtag interests
  hashtags: Record<string, number>;
  
  // Media preferences (learned from what user engages with)
  mediaPreferences: {
    prefersImages: number; // 0-1 scale
    prefersVideo: number;
    prefersTextOnly: number;
    prefersLinks: number;
    avgImageEngagement: number;
    avgTextEngagement: number;
  };
  
  // Behavioral patterns
  patterns: {
    avgDwellTime: number;
    preferredContentLength: 'short' | 'medium' | 'long';
    activeHours: number[]; // hours of day (0-23) when most active
    engagementRate: number; // likes + comments / views
  };
  
  // Time-based decay factor
  lastUpdated: number;
}

interface BehavioralState {
  preferences: UserPreferences;
  recentInteractions: ContentInteraction[];
  sessionStartTime: number;
}

const STORAGE_KEY = 'userBehavioralData';
const MAX_INTERACTIONS = 500;
const DECAY_RATE = 0.95; // Daily decay rate for older preferences
const DWELL_THRESHOLD_MS = 2000; // 2 seconds to count as meaningful view

// Default preferences for new users
const getDefaultPreferences = (): UserPreferences => ({
  contentTypes: { text: 0.5, image: 0.5, video: 0.5, link: 0.5, gif: 0.5, poll: 0.5, mixed: 0.5 },
  categories: {},
  authors: {},
  hashtags: {},
  mediaPreferences: {
    prefersImages: 0.5,
    prefersVideo: 0.5,
    prefersTextOnly: 0.5,
    prefersLinks: 0.5,
    avgImageEngagement: 0.5,
    avgTextEngagement: 0.5,
  },
  patterns: {
    avgDwellTime: 3000,
    preferredContentLength: 'medium',
    activeHours: [],
    engagementRate: 0.1,
  },
  lastUpdated: Date.now(),
});

export function useBehavioralLearning() {
  const { user } = useAuth();
  const [state, setState] = useState<BehavioralState>(() => {
    const storageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          sessionStartTime: Date.now(),
        };
      } catch {
        return {
          preferences: getDefaultPreferences(),
          recentInteractions: [],
          sessionStartTime: Date.now(),
        };
      }
    }
    return {
      preferences: getDefaultPreferences(),
      recentInteractions: [],
      sessionStartTime: Date.now(),
    };
  });

  // Tracking refs for dwell time
  const activeContentRef = useRef<{ id: string; startTime: number } | null>(null);
  const scrollPositionRef = useRef<number>(0);

  // Save state to localStorage
  const saveState = useCallback((newState: BehavioralState) => {
    const storageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(newState));
  }, [user?.id]);

  // Apply time-based decay to preferences
  const applyDecay = useCallback((preferences: UserPreferences): UserPreferences => {
    const daysSinceUpdate = (Date.now() - preferences.lastUpdated) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 1) return preferences;

    const decayFactor = Math.pow(DECAY_RATE, daysSinceUpdate);
    
    const decayRecord = (record: Record<string, number>) => {
      const decayed: Record<string, number> = {};
      for (const [key, value] of Object.entries(record)) {
        const newValue = value * decayFactor;
        if (newValue > 0.01) { // Keep only meaningful values
          decayed[key] = newValue;
        }
      }
      return decayed;
    };

    return {
      ...preferences,
      categories: decayRecord(preferences.categories),
      authors: decayRecord(preferences.authors),
      hashtags: decayRecord(preferences.hashtags),
      lastUpdated: Date.now(),
    };
  }, []);

  // Record a content interaction
  const recordInteraction = useCallback((interaction: Omit<ContentInteraction, 'timestamp'>) => {
    const fullInteraction: ContentInteraction = {
      ...interaction,
      timestamp: Date.now(),
    };

    setState(prev => {
      const newInteractions = [fullInteraction, ...prev.recentInteractions].slice(0, MAX_INTERACTIONS);
      const newPreferences = updatePreferences(prev.preferences, fullInteraction);
      
      const newState = {
        ...prev,
        preferences: newPreferences,
        recentInteractions: newInteractions,
      };
      
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  // Update preferences based on interaction
  const updatePreferences = (prefs: UserPreferences, interaction: ContentInteraction): UserPreferences => {
    const updated = { ...prefs, lastUpdated: Date.now() };
    const weight = calculateInteractionWeight(interaction);

    // Update author affinity
    if (interaction.metadata?.authorId) {
      updated.authors = {
        ...updated.authors,
        [interaction.metadata.authorId]: (updated.authors[interaction.metadata.authorId] || 0) + weight,
      };
    }

    // Update category affinity
    if (interaction.metadata?.category) {
      updated.categories = {
        ...updated.categories,
        [interaction.metadata.category]: (updated.categories[interaction.metadata.category] || 0) + weight,
      };
    }

    // Update hashtag interests
    if (interaction.metadata?.hashtags) {
      for (const tag of interaction.metadata.hashtags) {
        updated.hashtags = {
          ...updated.hashtags,
          [tag]: (updated.hashtags[tag] || 0) + weight * 0.5,
        };
      }
    }

    // Update content type preferences based on media type
    if (interaction.metadata?.mediaType) {
      const mediaType = interaction.metadata.mediaType;
      updated.contentTypes = {
        ...updated.contentTypes,
        [mediaType]: Math.min(1, (updated.contentTypes[mediaType as keyof typeof updated.contentTypes] || 0.5) + weight * 0.1),
      };
      
      // Update media preferences
      if (mediaType === 'image' || mediaType === 'video' || mediaType === 'gif') {
        updated.mediaPreferences.prefersImages = Math.min(1, updated.mediaPreferences.prefersImages + weight * 0.05);
        updated.mediaPreferences.avgImageEngagement = updated.mediaPreferences.avgImageEngagement * 0.9 + weight * 0.1;
      } else if (mediaType === 'text') {
        updated.mediaPreferences.prefersTextOnly = Math.min(1, updated.mediaPreferences.prefersTextOnly + weight * 0.05);
        updated.mediaPreferences.avgTextEngagement = updated.mediaPreferences.avgTextEngagement * 0.9 + weight * 0.1;
      } else if (mediaType === 'link') {
        updated.mediaPreferences.prefersLinks = Math.min(1, updated.mediaPreferences.prefersLinks + weight * 0.05);
      }
    } else if (interaction.metadata?.hasMedia !== undefined) {
      const typeKey = interaction.metadata.hasMedia ? 'image' : 'text';
      updated.contentTypes = {
        ...updated.contentTypes,
        [typeKey]: Math.min(1, updated.contentTypes[typeKey] + weight * 0.1),
      };
    }

    // Update behavioral patterns
    if (interaction.dwellTime > 0) {
      const currentAvg = updated.patterns.avgDwellTime;
      updated.patterns.avgDwellTime = currentAvg * 0.9 + interaction.dwellTime * 0.1;
    }

    // Track active hours
    const currentHour = new Date().getHours();
    if (!updated.patterns.activeHours.includes(currentHour)) {
      updated.patterns.activeHours = [...updated.patterns.activeHours, currentHour].slice(-10);
    }

    // Normalize values to prevent unbounded growth
    updated.authors = normalizeScores(updated.authors, 100);
    updated.categories = normalizeScores(updated.categories, 50);
    updated.hashtags = normalizeScores(updated.hashtags, 50);

    return updated;
  };

  // Calculate weight based on interaction type and engagement
  const calculateInteractionWeight = (interaction: ContentInteraction): number => {
    let weight = 0;

    // Base weight by action type
    switch (interaction.action) {
      case 'like': weight = 3; break;
      case 'comment': weight = 5; break;
      case 'share': weight = 4; break;
      case 'click': weight = 2; break;
      case 'long_press': weight = 1.5; break;
      case 'view': weight = 1; break;
      case 'scroll_past': weight = -0.5; break;
      case 'swipe_away': weight = -1; break;
      default: weight = 0.5;
    }

    // Boost by dwell time (longer engagement = more interest)
    if (interaction.dwellTime > DWELL_THRESHOLD_MS) {
      const dwellBoost = Math.min(2, interaction.dwellTime / 10000); // Max 2x boost at 10s
      weight *= (1 + dwellBoost);
    }

    // Boost by scroll depth (reading full content = more interest)
    if (interaction.scrollDepth > 50) {
      weight *= 1 + (interaction.scrollDepth / 200); // Up to 1.5x boost at 100%
    }

    return weight;
  };

  // Normalize scores to prevent unbounded growth
  const normalizeScores = (scores: Record<string, number>, maxSum: number): Record<string, number> => {
    const entries = Object.entries(scores);
    if (entries.length === 0) return scores;

    const sum = entries.reduce((acc, [, v]) => acc + Math.abs(v), 0);
    if (sum <= maxSum) return scores;

    const factor = maxSum / sum;
    const normalized: Record<string, number> = {};
    for (const [key, value] of entries) {
      normalized[key] = value * factor;
    }
    return normalized;
  };

  // Start tracking content view (call when content becomes visible)
  const startContentView = useCallback((contentId: string) => {
    activeContentRef.current = { id: contentId, startTime: Date.now() };
  }, []);

  // End tracking content view (call when content leaves viewport)
  const endContentView = useCallback((contentId: string, metadata?: ContentInteraction['metadata']) => {
    if (activeContentRef.current?.id === contentId) {
      const dwellTime = Date.now() - activeContentRef.current.startTime;
      
      if (dwellTime >= DWELL_THRESHOLD_MS) {
        recordInteraction({
          contentId,
          contentType: 'post',
          action: 'view',
          dwellTime,
          scrollDepth: scrollPositionRef.current,
          metadata,
        });
      }
      
      activeContentRef.current = null;
    }
  }, [recordInteraction]);

  // Track scroll position for scroll depth calculation
  const updateScrollPosition = useCallback((position: number) => {
    scrollPositionRef.current = position;
  }, []);

  // Score content based on user preferences
  const scoreContent = useCallback((content: {
    id: string;
    authorId: string;
    category?: string;
    hashtags?: string[];
    hasMedia?: boolean;
    contentLength?: number;
    engagementScore?: number;
    recencyScore?: number;
  }): number => {
    const prefs = applyDecay(state.preferences);
    let score = 50; // Base score

    // Author affinity (0-30 points)
    const authorScore = prefs.authors[content.authorId] || 0;
    score += Math.min(30, authorScore * 3);

    // Category match (0-20 points)
    if (content.category) {
      const categoryScore = prefs.categories[content.category] || 0;
      score += Math.min(20, categoryScore * 2);
    }

    // Hashtag match (0-15 points)
    if (content.hashtags) {
      let hashtagScore = 0;
      for (const tag of content.hashtags) {
        hashtagScore += prefs.hashtags[tag] || 0;
      }
      score += Math.min(15, hashtagScore);
    }

    // Content type preference (0-10 points)
    const typeKey = content.hasMedia ? 'image' : 'text';
    score += prefs.contentTypes[typeKey] * 10;

    // Engagement score boost (0-15 points)
    if (content.engagementScore) {
      score += Math.min(15, content.engagementScore * 0.5);
    }

    // Recency boost (0-10 points)
    if (content.recencyScore) {
      score += Math.min(10, content.recencyScore);
    }

    // Add randomness for exploration (±5 points)
    score += (Math.random() - 0.5) * 10;

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, score));
  }, [state.preferences, applyDecay]);

  // Sort posts by personalized score
  const sortByPreference = useCallback(<T extends { id: string; author_id: string; content?: string; image_url?: string | null; likes_count?: number; view_count?: number; created_at?: string }>(
    posts: T[]
  ): T[] => {
    const scored = posts.map(post => {
      // Extract hashtags from content
      const hashtags = post.content?.match(/#\w+/g)?.map(h => h.toLowerCase()) || [];
      
      // Calculate engagement score
      const engagementScore = ((post.likes_count || 0) * 2 + (post.view_count || 0) * 0.1);
      
      // Calculate recency score (newer = higher)
      const ageMs = Date.now() - new Date(post.created_at || Date.now()).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 10 - ageHours / 24); // Full score for <24h old
      
      const score = scoreContent({
        id: post.id,
        authorId: post.author_id,
        hashtags,
        hasMedia: !!post.image_url,
        contentLength: post.content?.length,
        engagementScore,
        recencyScore,
      });
      
      return { post, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // Apply diversity: don't show too many posts from same author consecutively
    const diversified: T[] = [];
    const recentAuthors: string[] = [];
    const remaining = [...scored];
    
    while (remaining.length > 0 && diversified.length < posts.length) {
      // Find next post that's not from a recent author
      let nextIndex = remaining.findIndex(
        item => !recentAuthors.slice(-2).includes(item.post.author_id)
      );
      
      // If all remaining are from recent authors, just take the top one
      if (nextIndex === -1) nextIndex = 0;
      
      const next = remaining.splice(nextIndex, 1)[0];
      diversified.push(next.post);
      recentAuthors.push(next.post.author_id);
    }
    
    return diversified;
  }, [scoreContent]);

  // Get exploration recommendations (content outside user's usual preferences)
  const getExplorationItems = useCallback((allContentIds: string[], count: number = 3): string[] => {
    const prefs = state.preferences;
    const interactedIds = new Set(state.recentInteractions.map(i => i.contentId));
    
    // Filter out already interacted content
    const unexplored = allContentIds.filter(id => !interactedIds.has(id));
    
    // Randomly select some for exploration
    const shuffled = unexplored.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [state]);

  // Reset user preferences (for testing or user request)
  const resetPreferences = useCallback(() => {
    const newState = {
      preferences: getDefaultPreferences(),
      recentInteractions: [],
      sessionStartTime: Date.now(),
    };
    setState(newState);
    saveState(newState);
  }, [saveState]);

  return {
    preferences: state.preferences,
    recordInteraction,
    startContentView,
    endContentView,
    updateScrollPosition,
    scoreContent,
    sortByPreference,
    getExplorationItems,
    resetPreferences,
  };
}

export type { ContentInteraction, UserPreferences };
