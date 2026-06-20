import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SwipeableSheet, SwipeableSheetContent, SwipeableSheetFooter } from '@/components/ui/swipeable-sheet';
import { Flag } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ReportPostSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
  isReporting?: boolean;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Suspicious links, fake engagement, or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Targeted harassment or bullying' },
  { value: 'hate', label: 'Hate Speech', description: 'Hateful conduct or discriminatory content' },
  { value: 'violence', label: 'Violence', description: 'Violent or graphic content' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Adult content or other inappropriate material' },
  { value: 'other', label: 'Other', description: 'Something else' }
];

const ReportPostSheet = ({ isOpen, onClose, onReport, isReporting = false }: ReportPostSheetProps) => {
  const [selectedReason, setSelectedReason] = useState('');

  const handleReport = () => {
    if (!selectedReason) return;
    onReport(selectedReason);
    onClose();
    setSelectedReason('');
  };

  return (
    <SwipeableSheet
      open={isOpen}
      onOpenChange={onClose}
      title="Report Post"
      description="Help us understand what's happening with this post. Your report is anonymous."
    >
      <SwipeableSheetContent>
        <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
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
      </SwipeableSheetContent>

      <SwipeableSheetFooter>
        <div className="space-y-3">
          <Button
            onClick={handleReport}
            disabled={!selectedReason || isReporting}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold h-12 rounded-xl"
          >
            {isReporting ? (
              'Reporting...'
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl font-semibold"
            disabled={isReporting}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </SwipeableSheetFooter>
    </SwipeableSheet>
  );
};

export default ReportPostSheet;