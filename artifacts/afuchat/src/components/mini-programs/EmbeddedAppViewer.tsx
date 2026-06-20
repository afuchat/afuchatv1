import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  MoreVertical,
  Share2,
  Flag,
  X,
  FileText,
  Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MiniAppTermsDialog, hasAcceptedApp } from './MiniAppTermsDialog';

interface AppInfo {
  name: string;
  description?: string;
  icon_url?: string;
  category?: string;
  rating?: number;
  install_count?: number;
  screenshots?: string[];
  features?: string;
  developer_name?: string;
}

interface EmbeddedAppViewerProps {
  appName: string;
  appUrl: string;
  appIcon?: string;
  appId?: string;
  developerEmail?: string;
  privacyUrl?: string;
  termsUrl?: string;
  isBuiltIn?: boolean;
  appInfo?: AppInfo;
  onClose: () => void;
  onShowAbout?: () => void;
}

export const EmbeddedAppViewer = ({ 
  appName, 
  appUrl, 
  appIcon,
  appId,
  developerEmail,
  privacyUrl,
  termsUrl,
  isBuiltIn = false,
  appInfo,
  onClose,
  onShowAbout
}: EmbeddedAppViewerProps) => {
  const [key, setKey] = useState(0);
  
  // Check if user has already accepted terms for this app
  const appIdentifier = appId || appUrl;
  const needsTermsAcceptance = !isBuiltIn && !hasAcceptedApp(appIdentifier);
  const [showTermsDialog, setShowTermsDialog] = useState(needsTermsAcceptance);
  const [termsAccepted, setTermsAccepted] = useState(!needsTermsAcceptance);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: appName,
          text: `Check out ${appName} on AfuChat!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReport = () => {
    toast.info('Report submitted');
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTermsDialog(false);
  };

  const handleTermsCancel = () => {
    setShowTermsDialog(false);
    onClose();
  };

  // Check if URL is relative (internal route) or absolute (external URL)
  const isRelativeUrl = appUrl.startsWith('/');
  const fullUrl = isRelativeUrl ? `${window.location.origin}${appUrl}` : appUrl;

  return (
    <>
      {/* Terms Dialog for third-party apps */}
      <MiniAppTermsDialog
        open={showTermsDialog}
        onOpenChange={(open) => {
          if (!open && !termsAccepted) {
            onClose();
          }
          setShowTermsDialog(open);
        }}
        appName={appName}
        appId={appIdentifier}
        developerEmail={developerEmail}
        privacyUrl={privacyUrl}
        termsUrl={termsUrl}
        onAccept={handleTermsAccept}
      />

      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/95 backdrop-blur-lg safe-area-top">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {appIcon && (
              <img 
                src={appIcon} 
                alt={appName} 
                className="h-8 w-8 rounded-lg shrink-0"
              />
            )}
            
            <div className="min-w-0 flex-1">
              <h1 className="font-medium text-sm truncate">{appName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* About option */}
                {onShowAbout && (
                  <DropdownMenuItem onClick={onShowAbout}>
                    <Info className="h-4 w-4 mr-2" />
                    About
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => window.open('/terms', '_blank')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Terms
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleReport} className="text-destructive">
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Embedded iframe - loads in background, no loading overlay */}
        {termsAccepted && (
          <iframe
            key={key}
            src={fullUrl}
            className="flex-1 w-full border-0"
            title={appName}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="camera; microphone; geolocation; payment"
          />
        )}
      </div>
    </>
  );
};
