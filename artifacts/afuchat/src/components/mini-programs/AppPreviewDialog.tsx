import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Star, Download, ExternalLink, Play, User, Calendar, Shield, MoreVertical, Package, Globe, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Local storage key for tracking downloaded APKs
const DOWNLOADED_APPS_KEY = 'afuchat_downloaded_apps';

const getDownloadedApps = (): Set<string> => {
  try {
    const stored = localStorage.getItem(DOWNLOADED_APPS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const markAppAsDownloaded = (appId: string) => {
  const apps = getDownloadedApps();
  apps.add(appId);
  localStorage.setItem(DOWNLOADED_APPS_KEY, JSON.stringify([...apps]));
};

const isAppDownloaded = (appId: string): boolean => {
  return getDownloadedApps().has(appId);
};

interface AppPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    category: string;
    url?: string | null;
    rating: number;
    install_count: number;
    screenshots?: string[];
    features?: string;
    created_at?: string;
    app_type?: string;
    apk_url?: string | null;
    profiles?: {
      display_name: string;
    };
  } | null;
  onOpen: () => void;
}

export const AppPreviewDialog = ({ open, onOpenChange, app, onOpen }: AppPreviewDialogProps) => {
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if app is already downloaded when dialog opens
  useEffect(() => {
    if (app?.id) {
      setIsInstalled(isAppDownloaded(app.id));
    }
  }, [app?.id, open]);

  if (!app) return null;

  const screenshots = app.screenshots || [];
  const featuresList = app.features?.split('\n').filter(f => f.trim()) || [];

  // Handle "Open" for already downloaded APK apps
  const handleOpenInstalledApp = () => {
    toast.success(`Opening ${app.name}...`, {
      description: 'The app should launch on your device. If not, check your app drawer.',
    });
    onOpenChange(false);
  };

  // Internal APK download handler - stores file in browser and marks as installed
  const handleDownloadApk = async () => {
    if (!app.apk_url) {
      toast.error('APK file not available');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadComplete(false);

    try {
      // Fetch the APK file
      const response = await fetch(app.apk_url);

      if (!response.ok) {
        throw new Error('Failed to download APK');
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Simulate progress while downloading
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => Math.min(prev + 5, 90));
      }, 200);

      const blob = await response.blob();
      clearInterval(progressInterval);
      setDownloadProgress(100);

      // Create download link for internal browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${app.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mark app as downloaded/installed
      markAppAsDownloaded(app.id);
      setIsInstalled(true);
      setDownloadComplete(true);

      toast.success(`${app.name} downloaded successfully!`, {
        description: 'Open your Downloads folder to install the app.',
      });

      // Reset download state after delay
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadComplete(false);
      }, 2000);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download APK. Please try again.');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-4">
            <DialogHeader className="pb-4">
              <div className="flex items-start gap-4">
                {/* App Icon */}
                <div className="h-20 w-20 rounded-2xl shadow-lg overflow-hidden flex-shrink-0 bg-muted">
                  {app.icon_url ? (
                    <img
                      src={app.icon_url}
                      alt={app.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-primary flex items-center justify-center">
                      <span className="text-3xl">📱</span>
                    </div>
                  )}
                </div>

                {/* App Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <DialogTitle className="text-xl font-bold mb-1">{app.name}</DialogTitle>
                    {/* More menu with external link option */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {app.url && (
                          <DropdownMenuItem onClick={() => window.open(app.url!, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in Browser
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">
                      {app.category}
                    </Badge>
                    {app.app_type === 'android' && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-500/10 text-green-600 border-green-500/30"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        Android
                      </Badge>
                    )}
                    {app.app_type === 'both' && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30"
                      >
                        Web + APK
                      </Badge>
                    )}
                    {app.app_type === 'web' && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30"
                      >
                        <Globe className="h-3 w-3 mr-1" />
                        Web
                      </Badge>
                    )}
                    {/* Installed badge for APK apps */}
                    {isInstalled && (app.app_type === 'android' || app.app_type === 'both') && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary border-primary/30"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Installed
                      </Badge>
                    )}
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium">{app.rating?.toFixed(1) || '4.5'}</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Download className="h-3.5 w-3.5" />
                      <span className="text-xs">{app.install_count || 0}+</span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Screenshots</h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    {screenshots.map((screenshot, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedScreenshot(index)}
                        className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedScreenshot === index ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="h-32 w-auto object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>

                {/* Selected Screenshot Preview */}
                {screenshots[selectedScreenshot] && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-border">
                    <img
                      src={screenshots[selectedScreenshot]}
                      alt="Preview"
                      className="w-full h-auto object-contain max-h-64"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {app.description || 'No description available.'}
              </p>
            </div>

            {/* Features */}
            {featuresList.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Features</h3>
                <ul className="space-y-1.5">
                  {featuresList.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      {feature.replace(/^[•\-]\s*/, '')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Developer Info - only show if display_name is provided */}
            {app.profiles?.display_name && (
              <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                <h3 className="text-sm font-semibold mb-2">Developer</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{app.profiles.display_name}</span>
                </div>
                {app.created_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>Published {format(new Date(app.created_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Safety Notice */}
            <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Safety Notice</p>
                  <p>
                    {app.app_type === 'android'
                      ? 'This APK will be downloaded through AfuChat. Install at your own discretion.'
                      : 'This app runs inside AfuChat. Your data is protected by our security policies.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Download Progress */}
            {isDownloading && (
              <div className="mb-4 p-3 bg-muted rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {downloadComplete ? 'Download Complete!' : 'Downloading...'}
                  </span>
                  <span className="text-sm text-muted-foreground">{downloadProgress}%</span>
                </div>
                <Progress value={downloadProgress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Web App Button */}
              {(app.app_type === 'web' || app.app_type === 'both' || !app.app_type) && app.url && (
                <Button
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    onOpen();
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Open App
                </Button>
              )}

              {/* APK Button - Show "Open" if installed, otherwise "Download" */}
              {(app.app_type === 'android' || app.app_type === 'both') && app.apk_url && (
                <>
                  {isInstalled ? (
                    <Button
                      variant={app.app_type === 'android' ? 'default' : 'outline'}
                      className={`w-full ${app.app_type === 'android' ? 'bg-primary hover:bg-primary/90' : ''}`}
                      onClick={handleOpenInstalledApp}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  ) : (
                    <Button
                      variant={app.app_type === 'android' ? 'default' : 'outline'}
                      className={`w-full ${app.app_type === 'android' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={handleDownloadApk}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        downloadComplete ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Downloaded!
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Downloading... {downloadProgress}%
                          </>
                        )
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
