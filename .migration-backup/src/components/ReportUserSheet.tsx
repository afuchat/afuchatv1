import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetClose,
  SheetDescription 
} from '@/components/ui/sheet';
import { Flag, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReportUserSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Fake account, suspicious activity, or promotional content' },
  { value: 'harassment', label: 'Harassment or Bullying', description: 'Targeted harassment, threats, or intimidation' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Hateful conduct based on race, religion, gender, etc.' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { value: 'scam', label: 'Scam or Fraud', description: 'Attempting to deceive or steal from others' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Adult content or other inappropriate material' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' }
];

const ReportUserSheet = ({ isOpen, onClose, userId, userName }: ReportUserSheetProps) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!selectedReason || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: userId,
          reason: selectedReason,
          additional_info: additionalInfo || null,
        });

      if (error) throw error;

      toast.success('Report submitted', {
        description: 'Thank you for helping keep our community safe.',
      });
      onClose();
      setSelectedReason('');
      setAdditionalInfo('');
    } catch (error) {
      console.error('Error reporting user:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[80vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6 overflow-y-auto"
      >
        <SheetHeader className="text-left space-y-3 mb-6">
          <SheetTitle className="text-2xl font-bold">Report @{userName}</SheetTitle>
          <SheetDescription className="text-sm">
            Help us understand what's wrong with this account. Your report is anonymous.
          </SheetDescription>
        </SheetHeader>

        <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3 mb-6">
          {REPORT_REASONS.map((reason) => (
            <div
              key={reason.value}
              className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                selectedReason === reason.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setSelectedReason(reason.value)}
            >
              <RadioGroupItem value={reason.value} id={reason.value} className="mt-1" />
              <Label htmlFor={reason.value} className="cursor-pointer flex-1">
                <div className="font-semibold text-foreground">{reason.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{reason.description}</div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {selectedReason && (
          <div className="mb-6">
            <Label className="text-sm font-medium mb-2 block">Additional details (optional)</Label>
            <Textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Provide any additional context that might help us review this report..."
              className="min-h-[100px] resize-none"
            />
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleReport}
            disabled={!selectedReason || isSubmitting}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold h-12 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>

          <SheetClose asChild>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReportUserSheet;
