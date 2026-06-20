import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profiles: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
};

function useStories() {
  return useQuery({
    queryKey: ['stories-bar'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('stories')
        .select(`
          id, user_id, media_url, media_type, created_at,
          profiles!user_id(display_name, handle, avatar_url, is_verified)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const seen = new Set<string>();
      return (data ?? []).filter((s: Story) => {
        if (seen.has(s.user_id)) return false;
        seen.add(s.user_id);
        return true;
      }) as Story[];
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
  });
}

export function StoriesBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: stories = [], isLoading } = useStories();

  if (isLoading) {
    return (
      <div className="flex gap-3 px-1 pb-1 overflow-x-auto no-scrollbar">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-10 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-1 pb-1 overflow-x-auto no-scrollbar">
      {user && (
        <button
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          onClick={() => navigate('/moments')}
          aria-label="Add story"
        >
          <div className="relative h-14 w-14 rounded-full ring-2 ring-border group-hover:ring-primary/50 transition-all overflow-hidden bg-muted flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
              <Plus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground truncate w-14 text-center">Your Story</span>
        </button>
      )}

      {stories.map((story) => {
        const p = story.profiles;
        const name = p?.display_name ?? 'User';
        return (
          <Link
            key={story.id}
            to={`/moments`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            <div className={cn(
              "p-[2px] rounded-full",
              "bg-gradient-to-tr from-primary via-primary/70 to-purple-500"
            )}>
              <div className="p-[2px] rounded-full bg-background">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={p?.avatar_url ?? undefined} alt={name} loading="lazy" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="text-[11px] text-foreground/80 truncate w-14 text-center">
              {name.split(' ')[0]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
