import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Shield, ExternalLink, FileText } from 'lucide-react';

interface MiniAppTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  appId: string;
  developerEmail?: string;
  privacyUrl?: string;
  termsUrl?: string;
  onAccept: () => void;
}

const ACCEPTED_APPS_KEY = 'afuchat_accepted_mini_apps';

export const getAcceptedApps = (): Set<string> => {
  try {
    const stored = localStorage.getItem(ACCEPTED_APPS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Error reading accepted apps:', e);
  }
  return new Set();
};

export const markAppAsAccepted = (appId: string) => {
  try {
    const accepted = getAcceptedApps();
    accepted.add(appId);
    localStorage.setItem(ACCEPTED_APPS_KEY, JSON.stringify([...accepted]));
  } catch (e) {
    console.error('Error saving accepted app:', e);
  }
};

export const hasAcceptedApp = (appId: string): boolean => {
  return getAcceptedApps().has(appId);
};

export const MiniAppTermsDialog = ({
  open,
  onOpenChange,
  appName,
  appId,
  developerEmail,
  privacyUrl,
  termsUrl,
  onAccept,
}: MiniAppTermsDialogProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      markAppAsAccepted(appId);
      onAccept();
      // Dialog closes automatically and app opens immediately
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 p-0">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base">Before you continue</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Review the terms for <strong>{appName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Quick Links - No cards, just clean links */}
          <div className="space-y-2">
            {termsUrl && (
              <a
                href={termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                Terms of Service
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {privacyUrl && (
              <a
                href={privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Shield className="h-4 w-4" />
                Privacy Policy
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              AfuChat Mini Apps Terms
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Compact Safety Notice */}
          <p className="text-xs text-muted-foreground">
            This app is provided by a third-party developer. Use at your own discretion.
          </p>

          {/* Accept Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="accept-terms"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
            />
            <label htmlFor="accept-terms" className="text-xs cursor-pointer">
              I agree to the terms and privacy policy
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" disabled={!accepted} onClick={handleAccept}>
              Open App
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
