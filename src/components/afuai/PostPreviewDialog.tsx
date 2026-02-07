import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Send, Edit3 } from 'lucide-react';

export interface PostAction {
  content: string;
  auto_publish?: boolean;
  type?: 'text' | 'image' | 'poll';
}

interface PostPreviewDialogProps {
  postAction: PostAction | null;
  onConfirm: (content: string) => void;
  onCancel: () => void;
}

export const PostPreviewDialog = ({ postAction, onConfirm, onCancel }: PostPreviewDialogProps) => {
  const [editedContent, setEditedContent] = useState(postAction?.content || '');
  const [isEditing, setIsEditing] = useState(false);

  if (!postAction) return null;

  return (
    <Dialog open={!!postAction} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md z-[300]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Post Preview
          </DialogTitle>
          <DialogDescription>Review your post before publishing to your feed.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            This will appear on your feed as your post
          </div>

          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[120px] text-sm"
              autoFocus
            />
          ) : (
            <div className="bg-muted/50 rounded-xl p-4 text-sm whitespace-pre-wrap border border-border/40">
              {editedContent || postAction.content}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />
            {isEditing ? 'Preview' : 'Edit'}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(editedContent || postAction.content)} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
