import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/hooks/useFeed';
import PostCard from '@/components/feed/PostCard';
import { StoriesBar } from '@/components/feed/StoriesBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, RefreshCw, Pencil, TrendingUp, Users, Sparkles, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import NewPostModal from '@/components/ui/NewPostModal';
import { SEOHead } from '@/components/SEOHead';
import { motion, AnimatePresence } from 'framer-motion';

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
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        {tab === 'following'
          ? <Users className="h-8 w-8 text-primary" />
          : <Sparkles className="h-8 w-8 text-primary" />}
      </div>
      <h3 className="font-bold text-lg text-foreground mb-2">
        {tab === 'following' ? 'No posts yet' : 'Nothing here yet'}
      </h3>
      <p className="text-muted-foreground text-sm mb-6">
        {tab === 'following' ? 'Follow people to see their posts here.' : 'Check back soon for posts.'}
      </p>
      {tab === 'following' && (
        <button
          onClick={() => navigate('/search')}
          className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
        >
          Find people to follow
        </button>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-card border border-border/40 rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="flex gap-2">
                <div className="h-3.5 bg-muted rounded-full w-28" />
                <div className="h-3.5 bg-muted rounded-full w-16" />
              </div>
              <div className="h-3.5 bg-muted rounded-full w-full" />
              <div className="h-3.5 bg-muted rounded-full w-4/5" />
              {i % 2 === 0 && <div className="h-3.5 bg-muted rounded-full w-3/5" />}
              <div className="h-8 bg-muted/50 rounded-xl w-full mt-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FeedTab>('for-you');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const { data: myProfile } = useMyProfile(user?.id);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const latestPostId = useRef<string | null>(null);
  const feedTopRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useFeed(tab);

  const posts = (data?.pages.flat() ?? []).filter(p => !deletedIds.has(p.id));

  // Track the latest post id to detect new posts
  useEffect(() => {
    if (posts.length > 0 && !latestPostId.current) {
      latestPostId.current = posts[0].id;
    }
  }, [posts]);

  // Real-time notification for new posts (for-you tab only)
  useEffect(() => {
    if (tab !== 'for-you') return;
    const channel = (supabase as any)
      .channel('new-posts-notification')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: "visibility=eq.public",
      }, (payload: any) => {
        if (payload.new?.id !== latestPostId.current) {
          setNewPostsAvailable(true);
        }
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [tab]);

  const handleRefreshNew = useCallback(() => {
    setNewPostsAvailable(false);
    latestPostId.current = null;
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    refetch();
    feedTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [queryClient, refetch]);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || isFetchingNextPage) return;
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
        },
        { rootMargin: '400px' }
      );
      observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="Home Feed"
        description="Your AfuChat social feed — posts, stories, and updates from people you follow."
        url="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'AfuChat Home Feed',
          description: 'Real-time social feed.',
          url: 'https://afuchat.com/',
        }}
      />

      {/* Stories */}
      <div ref={feedTopRef} className="px-4 pt-3 pb-2 border-b border-border/30">
        <StoriesBar />
      </div>

      {/* Create post bar */}
      {user && (
        <div className="px-4 py-3 border-b border-border/30">
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-muted/20 transition-all group"
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-purple-500/10 border border-primary/20"
        >
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
        </motion.div>
      )}

      {/* Feed tabs */}
      <div className="flex border-b border-border/40 sticky top-14 md:top-0 bg-background/95 backdrop-blur-sm z-10">
        {(['for-you', 'following'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-colors relative',
              tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              {t === 'for-you'
                ? <TrendingUp className="h-3.5 w-3.5" />
                : <Users className="h-3.5 w-3.5" />}
              {t === 'for-you' ? 'For You' : 'Following'}
            </span>
            {tab === t && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* New posts notification */}
      <AnimatePresence>
        {newPostsAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -16, height: 0 }}
            className="overflow-hidden"
          >
            <button
              onClick={handleRefreshNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 border-b border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
            >
              <ArrowUp className="h-4 w-4" />
              New posts available — tap to refresh
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed content */}
      <div className="flex flex-col flex-1">
        {isLoading && <FeedSkeleton />}

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
            <AnimatePresence initial={false}>
              {posts.map(post => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <PostCard
                    post={post}
                    onDeleted={id => setDeletedIds(prev => new Set([...prev, id]))}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Load more sentinel */}
        <div ref={loadMoreRef} className="py-6 flex justify-center">
          {isFetchingNextPage && (
            <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-muted-foreground text-xs py-2">You're all caught up ✓</p>
          )}
        </div>
      </div>

      {/* Floating compose button (mobile) */}
      {user && (
        <button
          onClick={() => setIsPostModalOpen(true)}
          className="fixed bottom-20 right-4 md:hidden h-14 w-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center z-30"
          aria-label="Create post"
        >
          <Pencil className="h-5 w-5" />
        </button>
      )}

      {isPostModalOpen && (
        <NewPostModal
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['feed'] });
          }}
        />
      )}
    </div>
  );
}
