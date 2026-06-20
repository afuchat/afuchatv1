import { useState, useEffect } from 'react';
import { Hash, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface HashtagData {
  hashtag: string;
  count: number;
}

interface HashtagsSectionProps {
  onHashtagClick: (hashtag: string) => void;
}

export const HashtagsSection = ({ onHashtagClick }: HashtagsSectionProps) => {
  const [hashtags, setHashtags] = useState<HashtagData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        // Fetch recent posts to extract hashtags
        const { data: posts } = await supabase
          .from('posts')
          .select('content')
          .order('created_at', { ascending: false })
          .limit(500);

        if (posts) {
          const hashtagMap = new Map<string, number>();
          
          posts.forEach(post => {
            // Extract hashtags from content
            const matches = post.content.match(/#[\w\u0590-\u05ff\u0600-\u06ff]+/g);
            if (matches) {
              matches.forEach(tag => {
                const normalized = tag.toLowerCase();
                hashtagMap.set(normalized, (hashtagMap.get(normalized) || 0) + 1);
              });
            }
          });

          // Convert to array and sort by count
          const sortedHashtags = Array.from(hashtagMap.entries())
            .map(([hashtag, count]) => ({ hashtag: hashtag.replace('#', ''), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

          setHashtags(sortedHashtags);
        }
      } catch (error) {
        console.error('Error fetching hashtags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHashtags();
  }, []);

  if (loading || hashtags.length === 0) return null;

  return (
    <div className="border-b border-border py-4">
      <div className="px-4 flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm text-foreground">Trending Hashtags</h3>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-2 px-4 pb-2">
          {hashtags.map((tag, idx) => (
            <Button
              key={idx}
              variant="secondary"
              size="sm"
              className="flex-shrink-0 rounded-full text-sm gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => onHashtagClick(`#${tag.hashtag}`)}
            >
              <Hash className="h-3 w-3" />
              {tag.hashtag}
              <span className="text-xs opacity-70">({tag.count})</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
};
