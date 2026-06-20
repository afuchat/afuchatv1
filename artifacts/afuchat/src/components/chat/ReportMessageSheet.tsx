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
import { Flag } from 'lucide-react';
import { ButtonLoader } from '@/components/ui/CustomLoader';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReportMessageSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Suspicious links or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Targeted harassment or bullying' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Hateful or discriminatory content' },
  { value: 'threats', label: 'Threats or Violence', description: 'Violent threats or dangerous content' },
  { value: 'scam', label: 'Scam', description: 'Attempting to deceive or steal' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Adult or explicit material' },
  { value: 'other', label: 'Other', description: 'Something else' }
];

const ReportMessageSheet = ({ isOpen, onClose, messageId, messageContent }: ReportMessageSheetProps) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!selectedReason || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('message_reports')
        .insert({
          reporter_id: user.id,
          message_id: messageId,
          reason: selectedReason,
          message_content: messageContent,
        });

      if (error) throw error;

      toast.success('Message reported', {
        description: 'Thank you for helping keep our community safe.',
      });
      onClose();
      setSelectedReason('');
    } catch (error) {
      console.error('Error reporting message:', error);
      toast.error('Failed to report message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[75vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6 overflow-y-auto"
      >
        <SheetHeader className="text-left space-y-3 mb-6">
          <SheetTitle className="text-2xl font-bold">Report Message</SheetTitle>
          <SheetDescription className="text-sm">
            Help us understand what's wrong with this message. Your report is anonymous.
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
              <RadioGroupItem value={reason.value} id={`msg-${reason.value}`} className="mt-1" />
              <Label htmlFor={`msg-${reason.value}`} className="cursor-pointer flex-1">
                <div className="font-semibold text-foreground">{reason.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{reason.description}</div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="space-y-3">
          <Button
            onClick={handleReport}
            disabled={!selectedReason || isSubmitting}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold h-12 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <ButtonLoader className="mr-2" />
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

export default ReportMessageSheet;
