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
import { AlertTriangle, XCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  planName: string;
  expiresAt: string;
  isChangingPlan?: boolean;
  newPlanName?: string;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  planName,
  expiresAt,
  isChangingPlan = false,
  newPlanName
}: CancelSubscriptionDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setAcknowledged(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>
              {isChangingPlan ? 'Change Subscription Plan' : 'Cancel Subscription'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {isChangingPlan
                  ? `You are about to cancel your current ${planName} plan and switch to ${newPlanName}.`
                  : `You are about to cancel your ${planName} subscription.`}
              </p>
              
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium text-destructive">
                    No refunds will be issued for the remaining time on your subscription.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Your current plan was set to expire on {formatDate(expiresAt)}. You will lose all remaining days.
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="acknowledge"
                  className="text-sm leading-tight cursor-pointer select-none"
                >
                  I understand that I will not receive a refund for the unused portion of my subscription.
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!acknowledged || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : isChangingPlan ? (
              'Cancel & Switch Plan'
            ) : (
              'Cancel Subscription'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
