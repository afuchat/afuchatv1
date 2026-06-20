import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ShieldCheck, Calendar, CheckCircle2, Code } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface VerifiedDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  isVerified: boolean;
  isOrgVerified: boolean;
  isDeveloper?: boolean;
  createdAt?: string;
  viewerIsVerified?: boolean;
}

export function VerifiedDetailsSheet({
  open,
  onOpenChange,
  userName,
  isVerified,
  isOrgVerified,
  isDeveloper,
  createdAt,
  viewerIsVerified = false,
}: VerifiedDetailsSheetProps) {
  const navigate = useNavigate();

  const handleGetVerified = () => {
    onOpenChange(false);
    navigate('/verification-request');
  };

  const getVerificationReason = () => {
    if (isDeveloper) {
      return "This account is verified because they are an official AfuChat Developer.";
    }
    if (isOrgVerified) {
      return "This account is verified because it's an official organization on AfuChat.";
    }
    return "This account is verified through premium subscription on AfuChat.";
  };

  const getAccountType = () => {
    if (isDeveloper) {
      return "This account has developer privileges and verified status.";
    }
    if (isOrgVerified) {
      return "This account is organization verified.";
    }
    return "This account is user verified.";
  };

  const getIcon = () => {
    if (isDeveloper) {
      return <Code className="w-7 h-7 text-emerald-500" />;
    }
    if (isOrgVerified) {
      return <ShieldCheck className="w-7 h-7 text-primary" />;
    }
    return <BadgeCheck className="w-7 h-7 text-primary" />;
  };

  const getSecondaryIcon = () => {
    if (isDeveloper) {
      return <Code className="w-6 h-6 text-muted-foreground" />;
    }
    if (isOrgVerified) {
      return <ShieldCheck className="w-6 h-6 text-muted-foreground" />;
    }
    return <BadgeCheck className="w-6 h-6 text-muted-foreground" />;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[70vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6 overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            {isDeveloper ? 'Developer Account' : 'Verified account'}
          </h2>
        </div>
          
          {/* Verification Info */}
          <div className="space-y-6">
            {/* Main verification reason */}
            <div className="flex gap-4 items-start">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mt-1 ${isDeveloper ? 'bg-emerald-500/10' : 'bg-primary/10'}`}>
                {getIcon()}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-base leading-relaxed text-foreground">
                  {getVerificationReason()}
                </p>
              </div>
            </div>

            {/* Account type */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center mt-1">
                {getSecondaryIcon()}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-base leading-relaxed text-foreground">
                  {getAccountType()}
                </p>
              </div>
            </div>

            {/* Developer benefits */}
            {isDeveloper && (
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mt-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-base leading-relaxed text-foreground">
                    Developers are trusted members who help build and improve AfuChat.
                  </p>
                </div>
              </div>
            )}

            {/* Joined date */}
            {createdAt && (
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center mt-1">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-base leading-relaxed text-foreground">
                    Joined {format(new Date(createdAt), "MMMM yyyy")}.
                  </p>
                </div>
              </div>
            )}

            {/* How to get verified section - Only show if viewer is not verified */}
            {!viewerIsVerified && !isDeveloper && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Want to get verified?</h3>
                
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Subscribe to premium to get instant verification</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Access exclusive features like Gift Marketplace and AI Chat</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Send Red Envelopes and create Stories & Moments</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Show your premium status with a crown badge on your profile</p>
                  </div>
                </div>

                <Button 
                  onClick={handleGetVerified}
                  className="w-full mt-4 h-12 font-semibold rounded-xl"
                  size="lg"
                >
                  Get Premium & Verified
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Subscribe to premium to get instant verification and access exclusive features
                </p>
              </div>
            )}
          </div>
      </SheetContent>
    </Sheet>
  );
}