import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SwipeableSheet, SwipeableSheetContent } from '@/components/ui/swipeable-sheet';
import { UserX, Flag, Loader2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ReportUserSheet from './ReportUserSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userHandle: string;
  isBlocked?: boolean;
  onBlockChange?: (blocked: boolean) => void;
}

const UserActionsSheet = ({ 
  isOpen, 
  onClose, 
  userId, 
  userName, 
  userHandle,
  isBlocked = false,
  onBlockChange 
}: UserActionsSheetProps) => {
  const { user } = useAuth();
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBlock = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
        });

      if (error) throw error;

      toast.success(`@${userHandle} blocked`, {
        description: 'They can no longer see your posts or message you.',
      });
      onBlockChange?.(true);
      setShowBlockConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblock = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      toast.success(`@${userHandle} unblocked`);
      onBlockChange?.(false);
      setShowUnblockConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <SwipeableSheet
        open={isOpen}
        onOpenChange={onClose}
        title={`@${userHandle}`}
        snapPoints={[0.35, 1]}
      >
        <SwipeableSheetContent className="space-y-2">
          {isBlocked ? (
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base rounded-xl font-medium gap-3"
              onClick={() => setShowUnblockConfirm(true)}
            >
              <UserCheck className="h-5 w-5 text-muted-foreground" />
              Unblock User
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base rounded-xl font-medium gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowBlockConfirm(true)}
            >
              <UserX className="h-5 w-5" />
              Block User
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full justify-start h-12 text-base rounded-xl font-medium gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              onClose();
              setShowReportSheet(true);
            }}
          >
            <Flag className="h-5 w-5" />
            Report Account
          </Button>

          <Button
            variant="ghost"
            className="w-full h-12 rounded-xl font-medium mt-4"
            onClick={onClose}
          >
            Cancel
          </Button>
        </SwipeableSheetContent>
      </SwipeableSheet>

      <ReportUserSheet
        isOpen={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        userId={userId}
        userName={userHandle}
      />

      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Block @{userHandle}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to see your posts, send you messages, or interact with your content. You can unblock them later from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockConfirm} onOpenChange={setShowUnblockConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock @{userHandle}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be able to see your posts, send you messages, and interact with your content again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnblock}
              disabled={isProcessing}
              className="rounded-xl"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserActionsSheet;