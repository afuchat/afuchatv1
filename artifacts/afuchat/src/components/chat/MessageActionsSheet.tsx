import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Smile, Reply, Pencil, Trash2, Copy, Crown, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';
import ReportMessageSheet from './ReportMessageSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  encrypted_content: string;
  audio_url?: string;
  attachment_url?: string;
  sender_id: string;
  sent_at: string;
}

interface MessageActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  isOwn: boolean;
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onEdit: (newContent: string) => void;
  onDelete: () => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

export const MessageActionsSheet = ({
  open,
  onOpenChange,
  message,
  isOwn,
  onReply,
  onReaction,
  onEdit,
  onDelete,
}: MessageActionsSheetProps) => {
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);

  if (!message) return null;

  const isVoice = !!message.audio_url;
  const hasAttachment = !!message.attachment_url;
  const canEdit = isOwn && !isVoice && !hasAttachment && 
    (Date.now() - new Date(message.sent_at).getTime()) < 15 * 60 * 1000;
  const canDelete = isOwn;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.encrypted_content);
    toast.success('Message copied');
    onOpenChange(false);
  };

  const handleReply = () => {
    onReply();
    onOpenChange(false);
  };

  const handleReaction = (emoji: string) => {
    onReaction(emoji);
    onOpenChange(false);
  };

  const handleStartEdit = () => {
    if (!isPremium) {
      toast.error('Editing messages is a premium feature', {
        action: {
          label: 'Upgrade',
          onClick: () => navigate('/premium'),
        },
      });
      return;
    }
    setEditContent(message.encrypted_content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.encrypted_content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
    onOpenChange(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl h-auto max-h-[60vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-t border-border/50 p-6">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl font-bold">Message Actions</SheetTitle>
          </SheetHeader>

          {isEditing ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Edit message</label>
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Edit your message..."
                  className="h-12"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || editContent === message.encrypted_content}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              {/* Reactions Section */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Smile className="h-4 w-4" />
                  React to message
                </p>
                <div className="flex flex-wrap gap-2">
                  {REACTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="outline"
                      className="h-12 w-12 text-xl p-0 rounded-xl hover:scale-110 transition-transform"
                      onClick={() => handleReaction(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions Section */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Actions</p>
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    className="h-12 justify-start gap-3 rounded-xl"
                    onClick={handleReply}
                  >
                    <Reply className="h-5 w-5" />
                    Reply
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 justify-start gap-3 rounded-xl"
                    onClick={handleCopy}
                  >
                    <Copy className="h-5 w-5" />
                    Copy Text
                  </Button>

                  {canEdit && (
                    <Button
                      variant="outline"
                      className="h-12 justify-start gap-3 rounded-xl"
                      onClick={handleStartEdit}
                    >
                      <Pencil className="h-5 w-5" />
                      <span className="flex-1 text-left">Edit Message</span>
                      {!isPremium && (
                        <Badge variant="secondary" className="gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
                          <Crown className="h-3 w-3" />
                          Premium
                        </Badge>
                      )}
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      variant="outline"
                      className="h-12 justify-start gap-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-5 w-5" />
                      Delete Message
                    </Button>
                  )}

                  {!isOwn && (
                    <Button
                      variant="outline"
                      className="h-12 justify-start gap-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => {
                        onOpenChange(false);
                        setShowReportSheet(true);
                      }}
                    >
                      <Flag className="h-5 w-5" />
                      Report Message
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {message && (
        <ReportMessageSheet
          isOpen={showReportSheet}
          onClose={() => setShowReportSheet(false)}
          messageId={message.id}
          messageContent={message.encrypted_content}
        />
      )}
    </>
  );
};
