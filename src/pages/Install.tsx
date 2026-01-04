import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';
import { 
  Download, 
  Smartphone, 
  Zap, 
  Bell, 
  Wifi, 
  Shield,
  Share,
  Plus,
  Check,
  ArrowLeft,
  Chrome,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore - iOS specific
      const iosStandalone = window.navigator.standalone === true;
      setIsStandalone(standalone || iosStandalone);
      setIsInstalled(standalone || iosStandalone);
    };
    
    checkInstalled();

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: 'Lightning Fast', description: 'Instant loading, no app store needed' },
    { icon: Bell, title: 'Push Notifications', description: 'Never miss a message or update' },
    { icon: Wifi, title: 'Works Offline', description: 'Access content even without internet' },
    { icon: Shield, title: 'Secure & Private', description: 'Your data stays on your device' },
  ];

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mb-6"
        >
          <Check className="h-10 w-10 text-success-foreground" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">App Installed!</h1>
        <p className="text-muted-foreground mb-6">You're using AfuChat as an app</p>
        <Button onClick={() => navigate('/home')} size="lg">
          Continue to AfuChat
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo className="h-8" />
        <div className="w-10" />
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          {/* App icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent p-0.5 shadow-2xl shadow-primary/30">
                <div className="w-full h-full rounded-3xl bg-background flex items-center justify-center overflow-hidden">
                  <img src="/favicon.png" alt="AfuChat" className="w-16 h-16 object-contain" />
                </div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center"
              >
                <Download className="h-3 w-3 text-success-foreground" />
              </motion.div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Install AfuChat</h1>
            <p className="text-muted-foreground">
              Get the full app experience with faster loading and offline access
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Install button or instructions */}
          {deferredPrompt ? (
            <Button 
              onClick={handleInstall} 
              size="lg" 
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Download className="mr-2 h-5 w-5" />
              Install App
            </Button>
          ) : isIOS ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share className="h-5 w-5" />
                  Install on iPhone/iPad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap the <Share className="inline h-4 w-4 mx-1" /> Share button in Safari
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scroll down and tap <Plus className="inline h-4 w-4 mx-1" /> "Add to Home Screen"
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap "Add" to install AfuChat
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isAndroid && !deferredPrompt ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  Install on Android
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap the menu (⋮) button in Chrome
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap "Install app" or "Add to Home screen"
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Confirm to add AfuChat to your home screen
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Smartphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Open this page on your mobile device to install AfuChat
                </p>
              </CardContent>
            </Card>
          )}

          {/* Skip button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/home')}
            className="w-full text-muted-foreground"
          >
            Continue in browser
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default Install;
