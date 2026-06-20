import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Mail } from 'lucide-react';

interface AfuMailTermsDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AfuMailTermsDialog({ open, onAccept, onDecline }: AfuMailTermsDialogProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            AfuMail Experimental Service
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                AfuMail is currently an <strong>experimental service</strong>. Features may change or be unavailable at times.
              </p>
            </div>
            
            <div className="space-y-2 text-sm">
              <p>By using AfuMail, you agree to the following:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>This service is in beta and may have bugs or interruptions</li>
                <li>Your email address will be <strong>yourhandle@afuchat.com</strong></li>
                <li>Only users with @afuchat.com email can use this service</li>
                <li>Report any issues to <a href="mailto:support@afuchat.com" className="text-primary underline font-medium">support@afuchat.com</a></li>
              </ul>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox 
                id="accept-terms" 
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked === true)}
              />
              <label 
                htmlFor="accept-terms" 
                className="text-sm cursor-pointer leading-tight"
              >
                I understand this is an experimental service and agree to the terms above
              </label>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDecline}>
            Cancel
          </Button>
          <Button onClick={onAccept} disabled={!accepted}>
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
