import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string; display_name: string; avatar_url: string } | null;
}

export const MusicShortCommentsSheet = ({
  shortId,
  isOpen,
  onClose,
}: {
  shortId: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchComments();
  }, [isOpen, shortId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('music_short_comments')
      .select('*, profiles:user_id(username, display_name, avatar_url)')
      .eq('short_id', shortId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setComments(data as any);
  };

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('music_short_comments').insert({
      short_id: shortId,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (error) {
      toast.error('Failed to comment');
    } else {
      setNewComment('');
      fetchComments();
    }
    setLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-sm">Comments</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 mt-3 max-h-[calc(60vh-120px)]">
          {comments.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No comments yet</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                {(c.profiles as any)?.display_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold">{(c.profiles as any)?.username || 'user'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {user && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="text-sm"
            />
            <Button size="icon" onClick={handleSubmit} disabled={loading || !newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
