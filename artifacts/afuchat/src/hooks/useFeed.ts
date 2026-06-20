import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 15;

export type FeedPost = {
  id: string;
  author_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  repost_count: number;
  view_count: number;
  created_at: string;
  post_type: string | null;
  is_article: boolean | null;
  article_title: string | null;
  profiles: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_organization_verified: boolean;
    platinum_until: string | null;
  } | null;
};

const SELECT_FIELDS = `
  id, author_id, content, image_url, video_url,
  like_count, comment_count, share_count, repost_count, view_count,
  created_at, post_type, is_article, article_title,
  profiles!author_id(
    display_name, handle, avatar_url, is_verified,
    is_organization_verified, platinum_until
  )
`.trim();

export function useFeed(tab: 'for-you' | 'following' = 'for-you') {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['feed', tab, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = (supabase as any)
        .from('posts')
        .select(SELECT_FIELDS)
        .neq('is_blocked', true)
        .not('content', 'is', null)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (tab === 'following' && user) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .limit(500);

        const followingIds = follows?.map((f) => f.following_id) ?? [];
        if (followingIds.length > 0) {
          query = query.in('author_id', followingIds);
        } else {
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as FeedPost[];
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE ? pages.length : undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useUserProfile(userId?: string) {
  return useInfiniteQuery({
    queryKey: ['profile-posts', userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return [];
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('posts')
        .select(SELECT_FIELDS)
        .eq('author_id', userId)
        .is('is_blocked', null)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as unknown as FeedPost[];
    },
    getNextPageParam: (last, pages) =>
      last.length === PAGE_SIZE ? pages.length : undefined,
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
