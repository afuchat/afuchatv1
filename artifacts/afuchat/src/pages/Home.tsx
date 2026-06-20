import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/hooks/useFeed';
import PostCard from '@/components/feed/PostCard';
import { StoriesBar } from '@/components/feed/StoriesBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, RefreshCw, Pencil, TrendingUp, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import NewPostModal from '@/components/ui/NewPostModal';
import { SEOHead } from '@/components/SEOHead';

type FeedTab = 'for-you' | 'following';

function useMyProfile(userId?: string) {
  return useQuery({
    queryKey: ['my-profile-home', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, handle, avatar_url')
        .eq('id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

function EmptyFeed({ tab }: { tab: FeedTab }) {
  const navigate = useNavigate();
  if (tab === 'following') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">No posts yet</h3>
        <p className="text-muted-foreground text-sm mb-6">Follow people to see their posts here.</p>
        <button
          onClick={() => navigate('/search')}
          className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
        >
          Find people to follow
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-bold text-lg text-foreground mb-2">Nothing here yet</h3>
      <p className="text-muted-foreground text-sm">Check back soon for posts.</p>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeedTab>('for-you');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const { data: myProfile } = useMyProfile(user?.id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useFeed(tab);

  const posts = data?.pages.flat() ?? [];

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || isFetchingNextPage) return;
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
        },
        { rootMargin: '300px' }
      );
      observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="Home Feed"
        description="Your AfuChat social feed — posts, stories, and updates from people you follow. Discover trending content, send gifts, and connect with the world."
        url="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'AfuChat Home Feed',
          description: 'Real-time social feed with posts, stories, gifts, and AI-powered content discovery.',
          url: 'https://afuchat.com/',
        }}
      />
      {/* Stories */}
      <div className="px-4 pt-3 pb-2 border-b border-border/30">
        <StoriesBar />
      </div>

      {/* Create post bar (authenticated) */}
      {user && (
        <div className="px-4 py-3 border-b border-border/30">
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/20 transition-all group"
          >
            <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-background">
              <AvatarImage src={myProfile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {(myProfile?.display_name || user?.email || 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-left text-muted-foreground text-sm">What's on your mind?</span>
            <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Pencil className="h-3.5 w-3.5 text-primary" />
            </div>
          </button>
        </div>
      )}

      {/* Guest banner */}
      {!user && (
        <div className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-purple-500/10 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-primary/15 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Welcome to AfuChat</p>
              <p className="text-muted-foreground text-xs">Sign in to join the conversation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/auth/signup')}
              className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              Create Account
            </button>
            <button
              onClick={() => navigate('/auth/signin')}
              className="flex-1 py-2 text-sm font-medium border border-primary/30 text-primary rounded-xl hover:bg-primary/10 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      )}

      {/* Feed tabs */}
      <div className="flex border-b border-border/50 sticky top-14 md:top-0 bg-background/95 backdrop-blur-sm z-10">
        {(['for-you', 'following'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-colors relative',
              tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              {t === 'for-you' ? <TrendingUp className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {t === 'for-you' ? 'For You' : 'Following'}
            </span>
            {tab === t && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Feed content */}
      <div className="flex flex-col flex-1">
        {isLoading && (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/5" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-16 px-6 text-center">
            <p className="text-muted-foreground text-sm mb-4">Couldn't load posts</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && posts.length === 0 && <EmptyFeed tab={tab} />}

        {!isLoading && posts.length > 0 && (
          <div className="flex flex-col gap-2 p-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        <div ref={loadMoreRef} className="py-6 flex justify-center">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-primary/50" />}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-muted-foreground text-xs">You're all caught up ✓</p>
          )}
        </div>
      </div>

      {isPostModalOpen && (
        <NewPostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
      )}
    </div>
  );
}
