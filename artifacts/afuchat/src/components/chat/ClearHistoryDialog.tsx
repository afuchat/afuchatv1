import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ClearHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteForBoth: boolean) => void;
  isOneOnOne: boolean;
}

export const ClearHistoryDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isOneOnOne,
}: ClearHistoryDialogProps) => {
  const [deleteForBoth, setDeleteForBoth] = useState(false);

  const handleConfirm = () => {
    onConfirm(deleteForBoth);
    setDeleteForBoth(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete all messages in this chat. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {isOneOnOne && (
          <div className="flex items-center justify-between py-3 px-1 border-t border-border">
            <Label htmlFor="delete-both" className="text-sm font-medium cursor-pointer">
              Also delete for other user
            </Label>
            <Switch
              id="delete-both"
              checked={deleteForBoth}
              onCheckedChange={setDeleteForBoth}
            />
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Clear History
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
