import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Reply, Pencil, Trash2, Copy, Crown, Flag, ChevronDown, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';
import ReportMessageSheet from './ReportMessageSheet';
import { motion, AnimatePresence } from 'framer-motion';
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

interface MessageActionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  isOwn: boolean;
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onEdit: (newContent: string) => void;
  onDelete: () => void;
}

const REACTIONS = ['👎', '🔥', '❤️', '👍', '🥰', '👋', '😁'];

export const MessageActionsMenu = ({
  open,
  onOpenChange,
  message,
  isOwn,
  onReply,
  onReaction,
  onEdit,
  onDelete,
}: MessageActionsMenuProps) => {
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);

  // Reset editing state when menu closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditContent('');
    }
  }, [open]);

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

  const time = new Date(message.sent_at).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 z-[100]"
              onClick={() => onOpenChange(false)}
            />
            
            {/* Floating Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[101] max-w-sm mx-auto"
            >
              <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
                {isEditing ? (
                  <div className="p-4 space-y-3">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Edit your message..."
                      className="h-11"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-10 rounded-xl"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-10 rounded-xl"
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim() || editContent === message.encrypted_content}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Reactions Row */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
                      <div className="flex items-center gap-1">
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="h-10 w-10 flex items-center justify-center text-2xl hover:scale-125 transition-transform active:scale-95"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <button 
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-muted"
                        onClick={() => onOpenChange(false)}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Message Preview */}
                    <div className="px-3 py-2 border-b border-border/30 bg-muted/30">
                      <p className="text-sm text-foreground line-clamp-1">
                        {isVoice ? '🎤 Voice message' : message.encrypted_content}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground">read at {time}</span>
                      </div>
                    </div>

                    {/* Actions List */}
                    <div className="py-1">
                      <button
                        onClick={handleReply}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <Reply className="h-5 w-5 text-muted-foreground" />
                        <span className="text-foreground">Reply</span>
                      </button>

                      <button
                        onClick={handleCopy}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <Copy className="h-5 w-5 text-muted-foreground" />
                        <span className="text-foreground">Copy</span>
                      </button>

                      {canEdit && (
                        <button
                          onClick={handleStartEdit}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          <Pencil className="h-5 w-5 text-muted-foreground" />
                          <span className="text-foreground flex-1 text-left">Edit</span>
                          {!isPremium && (
                            <Badge variant="secondary" className="gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 text-xs">
                              <Crown className="h-2.5 w-2.5" />
                              Premium
                            </Badge>
                          )}
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={handleDelete}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                          <span className="text-destructive">Delete</span>
                        </button>
                      )}

                      {!isOwn && (
                        <button
                          onClick={() => {
                            onOpenChange(false);
                            setShowReportSheet(true);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          <Flag className="h-5 w-5 text-destructive" />
                          <span className="text-destructive">Report</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
