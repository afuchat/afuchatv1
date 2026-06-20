import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, ShieldCheck, BadgeCheck, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface AffiliateDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  businessName: string;
  affiliatedDate: string;
  businessLogo?: string;
  viewerIsVerified?: boolean;
}

export function AffiliateDetailsSheet({
  open,
  onOpenChange,
  userName,
  businessName,
  affiliatedDate,
  businessLogo,
  viewerIsVerified = false,
}: AffiliateDetailsSheetProps) {
  const navigate = useNavigate();

  const handleGetVerified = () => {
    onOpenChange(false);
    navigate('/verification-request');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[70vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6 overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Verified account</h2>
        </div>
          
          {/* Verification Info */}
          <div className="space-y-6">
            {/* Main verification reason */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary fill-current">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="flex-1 pt-1">
                <p className="text-base leading-relaxed text-foreground">
                  This account is verified because it's an affiliate of{" "}
                  <span className="text-primary font-medium">@{businessName}</span> on AfuChat.
                </p>
              </div>
            </div>

            {/* Business affiliation */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-muted mt-1">
                {businessLogo ? (
                  <img 
                    src={businessLogo} 
                    alt={businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-base leading-relaxed text-foreground">
                  This account is affiliated with{" "}
                  <span className="text-primary font-medium">{businessName}</span>.
                </p>
              </div>
            </div>

            {/* Affiliation date */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center mt-1">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-base leading-relaxed text-foreground">
                  Verified since {format(new Date(affiliatedDate), "MMMM yyyy")}.
                </p>
              </div>
            </div>

            {/* How to get verified section - Only show if viewer is not verified */}
            {!viewerIsVerified && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Want to get verified?</h3>
                
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Be an active and notable member of the AfuChat community</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Have a complete profile with authentic information</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Businesses and influencers with established presence can apply</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                    <p>Provide supporting documents (business registration, social media links, etc.)</p>
                  </div>
                </div>

                <Button 
                  onClick={handleGetVerified}
                  className="w-full mt-4 h-12 font-semibold rounded-xl"
                  size="lg"
                >
                  Get Verified
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Applications are reviewed by our team. Processing may take 3-5 business days.
                </p>
              </div>
            )}
          </div>
      </SheetContent>
    </Sheet>
  );
}
