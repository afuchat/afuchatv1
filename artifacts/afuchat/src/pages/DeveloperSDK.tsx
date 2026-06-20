import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Code, Book, Rocket, Download, ExternalLink, Copy, Check, 
  Shield, Terminal, Smartphone, Globe, Lock, Zap, Bell, CreditCard, 
  BarChart3, Upload, Play, Settings, Package, GitBranch, AlertTriangle,
  Users, MessageSquare, Image, Database, Palette, Navigation, Hammer,
  CheckCircle2, Circle, FileCode, FolderOpen, TestTube, Send, Github
} from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';
import DeveloperApplicationForm from '@/components/developer/DeveloperApplicationForm';
import DeveloperFeatures from '@/components/developer/DeveloperFeatures';
import DeveloperBadge from '@/components/DeveloperBadge';

const DeveloperSDK = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isDeveloper, applicationStatus, featuresEnabled, refetch } = useDeveloperStatus();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (data?.is_admin) setIsAdmin(true);
    };
    checkAdmin();
  }, [user]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Step-by-step guide for launching first app (admin only)
  const launchGuideSteps = [
    {
      step: 1,
      title: 'Install the CLI',
      description: 'Install the AfuChat CLI globally using npm',
      code: 'npm install -g @afuchat/cli',
      completed: false,
    },
    {
      step: 2,
      title: 'Create Your Project',
      description: 'Generate a new mini program project with the starter template',
      code: 'afu create my-first-app --template game',
      completed: false,
    },
    {
      step: 3,
      title: 'Configure Your App',
      description: 'Edit afu.config.json with your app details and permissions',
      code: `{
  "appId": "my-first-app",
  "name": "My First App",
  "version": "1.0.0",
  "category": "games",
  "permissions": ["user.info", "storage.read", "storage.write"]
}`,
      completed: false,
    },
    {
      step: 4,
      title: 'Develop Locally',
      description: 'Start the local development server with hot reload',
      code: 'cd my-first-app && afu preview',
      completed: false,
    },
    {
      step: 5,
      title: 'Build for Production',
      description: 'Create an optimized production build',
      code: 'afu build',
      completed: false,
    },
    {
      step: 6,
      title: 'Submit for Review',
      description: 'Publish your app to the AfuChat marketplace',
      code: 'afu publish',
      completed: false,
    },
  ];

  const exampleCode = {
    lifecycle: `// Mini Program Lifecycle
import { AfuSDK } from '@/lib/afuchat-sdk';

const app = new AfuSDK({
  appId: 'your-app-id',
  sandbox: true
});

// App lifecycle hooks
app.onLaunch(() => {
  console.log('Mini program launched');
  // Initialize app state, fetch initial data
});

app.onShow(() => {
  console.log('Mini program visible');
  // Resume activities, refresh data
});

app.onHide(() => {
  console.log('Mini program hidden');
  // Pause activities, save state
});

app.onClose(() => {
  console.log('Mini program closing');
  // Cleanup resources, save final state
});`,

    auth: `// Authentication API
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Get current user ID
const userId = sdk.auth.getUserId();
console.log('User ID:', userId);

// Get session token for API calls
const token = await sdk.auth.getSessionToken();

// Make authenticated API request
const response = await fetch('https://your-api.com/data', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});`,

    storage: `// Storage API with limits
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Save data (limit enforced per app)
await sdk.storage.set('game_progress', {
  level: 5,
  score: 12500,
  achievements: ['first_win', 'speed_demon']
});

// Retrieve data
const progress = await sdk.storage.get('game_progress');
console.log('Progress:', progress);

// Remove data
await sdk.storage.remove('game_progress');

// Note: Storage limits are enforced per app
// Exceeding limits will throw an error`,

    network: `// Network API with rate limiting
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Make network request (domain allowlist required)
try {
  const response = await sdk.network.request({
    url: 'https://api.allowed-domain.com/data',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'fetch_leaderboard' })
  });
  
  console.log('Response:', response.data);
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    console.log('Too many requests, try again later');
  } else if (error.code === 'DOMAIN_NOT_ALLOWED') {
    console.log('Domain not in allowlist');
  }
}`,

    media: `// Media API
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Pick an image from gallery
const image = await sdk.media.pickImage({
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8
});

// Upload file to storage
const uploadResult = await sdk.media.uploadFile(image, {
  folder: 'user-uploads',
  public: false
});

console.log('File URL:', uploadResult.url);

// Play audio
const audio = sdk.media.playAudio('https://cdn.afuchat.com/sounds/victory.mp3');
audio.pause();
audio.resume();`,

    ui: `// UI Components API
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Navigation
sdk.ui.navigation.push('/game/level-2');
sdk.ui.navigation.replace('/home');
sdk.ui.navigation.pop();

// Show modal dialog
await sdk.ui.showDialog({
  title: 'Confirm Action',
  content: 'Are you sure you want to restart?',
  buttons: [
    { text: 'Cancel', style: 'secondary' },
    { text: 'Restart', style: 'primary' }
  ]
});

// UI Components available:
// - Button, List, Card, Modal, Dialog

// Theme support
sdk.ui.setTheme('dark'); // 'light' | 'dark' | 'system'

// Responsive mobile-first layout is automatic`,

    messaging: `// Messaging Integration
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Send message to chat
await sdk.messaging.sendMessage({
  chatId: 'chat-uuid',
  content: 'Check out my high score: 15,000!',
  type: 'text'
});

// Listen for incoming messages
sdk.messaging.receiveMessage((message) => {
  console.log('New message:', message);
  // Handle game invites, challenges, etc.
});`,

    notifications: `// Notifications (in-app only)
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Request permission first
const hasPermission = await sdk.notifications.requestPermission();

if (hasPermission) {
  // Show in-app notification
  sdk.notifications.show({
    title: 'Achievement Unlocked!',
    body: 'You earned the "Speed Demon" badge',
    icon: 'trophy'
  });
}`,

    analytics: `// Analytics API
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Track custom event
sdk.analytics.trackEvent('game_completed', {
  level: 5,
  score: 12500,
  time_seconds: 120
});

// Track page view
sdk.analytics.trackPage('/game/level-5');

// Track errors
try {
  // Some risky operation
} catch (error) {
  sdk.analytics.trackError(error, {
    context: 'game_physics',
    severity: 'warning'
  });
}`,

    payments: `// Payments API (optional, sandboxed)
import { AfuSDK } from '@/lib/afuchat-sdk';

const sdk = new AfuSDK({ appId: 'your-app-id' });

// Initiate payment (sandbox mode)
const payment = await sdk.payments.create({
  amount: 100, // In Nexa or ACoins
  currency: 'NEXA',
  description: 'Premium skin pack',
  metadata: {
    item_id: 'skin_dragon_001'
  }
});

if (payment.status === 'completed') {
  // Grant item to user
  console.log('Payment successful:', payment.transactionId);
}`
  };

  const cliCommands = [
    { command: 'afu create my-app', description: 'Create a new mini program project' },
    { command: 'afu build', description: 'Build your mini program for production' },
    { command: 'afu preview', description: 'Preview in local simulator' },
    { command: 'afu publish', description: 'Submit for review and publish' },
    { command: 'afu rollback [version]', description: 'Rollback to a previous version' },
  ];

  const permissions = [
    { name: 'user.info', description: 'Access user profile information', risk: 'low' },
    { name: 'auth.token', description: 'Get session tokens for API auth', risk: 'medium' },
    { name: 'storage.read', description: 'Read from app storage', risk: 'low' },
    { name: 'storage.write', description: 'Write to app storage', risk: 'low' },
    { name: 'network.request', description: 'Make HTTP requests', risk: 'medium' },
    { name: 'media.pick', description: 'Pick images from gallery', risk: 'medium' },
    { name: 'media.upload', description: 'Upload files to storage', risk: 'medium' },
    { name: 'media.audio', description: 'Play audio files', risk: 'low' },
    { name: 'messaging.send', description: 'Send messages to chats', risk: 'high' },
    { name: 'messaging.receive', description: 'Receive chat messages', risk: 'medium' },
    { name: 'notifications.show', description: 'Show in-app notifications', risk: 'low' },
    { name: 'payments.create', description: 'Create payment requests', risk: 'high' },
    { name: 'analytics.track', description: 'Track events and pages', risk: 'low' },
  ];

  const apiEndpoints = [
    { method: 'GET', endpoint: '/api/v1/auth/user', description: 'Get current user info' },
    { method: 'GET', endpoint: '/api/v1/auth/token', description: 'Get session token' },
    { method: 'POST', endpoint: '/api/v1/storage/set', description: 'Save data to storage' },
    { method: 'GET', endpoint: '/api/v1/storage/get/:key', description: 'Retrieve stored data' },
    { method: 'DELETE', endpoint: '/api/v1/storage/remove/:key', description: 'Delete stored data' },
    { method: 'POST', endpoint: '/api/v1/network/proxy', description: 'Proxy HTTP request' },
    { method: 'POST', endpoint: '/api/v1/media/upload', description: 'Upload media file' },
    { method: 'POST', endpoint: '/api/v1/messaging/send', description: 'Send chat message' },
    { method: 'POST', endpoint: '/api/v1/notifications/show', description: 'Show notification' },
    { method: 'POST', endpoint: '/api/v1/analytics/event', description: 'Track analytics event' },
    { method: 'POST', endpoint: '/api/v1/payments/create', description: 'Create payment' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
          <div className="px-3 sm:px-4">
            <div className="flex h-14 sm:h-16 items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigate('/mini-programs')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Logo size="sm" />
              <div className="w-10" />
            </div>
          </div>
        </header>

        <main className="px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
          <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <Badge variant="outline" className="mb-2">
              <Zap className="h-3 w-3 mr-1" />
              AfuChat Platform
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Mini Programs SDK</h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              Build, deploy, and run isolated apps inside AfuChat. Create powerful mini programs
              with access to platform features, social integration, and analytics.
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <Button size="sm" className="sm:h-10 sm:px-4 sm:text-sm">
                <Download className="mr-2 h-4 w-4" />
                Download SDK
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
            <ScrollArea className="w-full pb-2">
              <TabsList className="inline-flex w-max gap-1 p-1">
                <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  <Book className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="quickstart" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>Quick Start</span>
                </TabsTrigger>
                <TabsTrigger value="core" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>Core SDK</span>
                </TabsTrigger>
                <TabsTrigger value="platform" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>APIs</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>Security</span>
                </TabsTrigger>
                <TabsTrigger value="api" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>API Ref</span>
                </TabsTrigger>
                <TabsTrigger value="developer" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  <Github className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>Developer</span>
                  {isDeveloper && <DeveloperBadge size="sm" showTooltip={false} />}
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="launch-guide" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 text-primary whitespace-nowrap">
                    <Hammer className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span>Launch</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </ScrollArea>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    What are Mini Programs?
                  </CardTitle>
                  <CardDescription>
                    Lightweight, isolated apps that run inside AfuChat without installation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Key Features
                      </h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>JavaScript/TypeScript support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Complete app lifecycle management</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Sandboxed execution environment</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Explicit permission model</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Responsive mobile-first UI</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        Use Cases
                      </h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Tools & utilities</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Chat extensions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Mini games</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Productivity apps</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Shopping experiences</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <Card className="text-center">
                  <CardContent className="pt-4 sm:pt-6 px-2 sm:px-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-1 text-sm sm:text-base">Sandboxed</h4>
                    <p className="text-xs text-muted-foreground">
                      Strict isolation between apps
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-4 sm:pt-6 px-2 sm:px-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-1 text-sm sm:text-base">Reviewed</h4>
                    <p className="text-xs text-muted-foreground">
                      All apps require approval
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-4 sm:pt-6 px-2 sm:px-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-1 text-sm sm:text-base">Fast</h4>
                    <p className="text-xs text-muted-foreground">
                      Instant load, no install
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-4 sm:pt-6 px-2 sm:px-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <GitBranch className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-1 text-sm sm:text-base">Versioned</h4>
                    <p className="text-xs text-muted-foreground">
                      Semantic versioning & rollback
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Platform Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                    <div className="p-4 border rounded-lg">
                      <MessageSquare className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium mb-1">Messaging</h4>
                      <p className="text-xs text-muted-foreground">
                        Send and receive messages in chats
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Bell className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium mb-1">Notifications</h4>
                      <p className="text-xs text-muted-foreground">
                        In-app notifications with permission
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <CreditCard className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium mb-1">Payments</h4>
                      <p className="text-xs text-muted-foreground">
                        Optional sandboxed payments
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <BarChart3 className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium mb-1">Analytics</h4>
                      <p className="text-xs text-muted-foreground">
                        Track events, pages, and errors
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Database className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium mb-1">Storage</h4>
                      <p className="text-xs text-muted-foreground">
                        Persistent key-value storage
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Image className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium mb-1">Media</h4>
                      <p className="text-xs text-muted-foreground">
                        Pick images, upload files, play audio
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quick Start Tab */}
            <TabsContent value="quickstart" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    CLI Installation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Install the AfuChat CLI globally:</p>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                        <code>npm install -g @afuchat/cli</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode('npm install -g @afuchat/cli', 'cli-install')}
                      >
                        {copiedCode === 'cli-install' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-3">CLI Commands:</p>
                    <div className="space-y-2">
                      {cliCommands.map((cmd, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                          <code className="text-sm font-mono text-primary flex-1">{cmd.command}</code>
                          <span className="text-sm text-muted-foreground">{cmd.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Your First App</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`# Create a new mini program
afu create my-awesome-app

# Navigate to project
cd my-awesome-app

# Start local simulator
afu preview

# Build for production
afu build

# Submit for review
afu publish`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode('afu create my-awesome-app\ncd my-awesome-app\nafu preview', 'create-app')}
                    >
                      {copiedCode === 'create-app' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create an <code className="bg-muted px-1 rounded">afu.config.json</code> file:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`{
  "appId": "your-app-id",
  "name": "My Mini Program",
  "version": "1.0.0",
  "description": "An awesome mini program",
  "category": "games",
  "sandbox": true,
  "permissions": [
    "user.info",
    "storage.read",
    "storage.write",
    "analytics.track"
  ],
  "network": {
    "domainAllowlist": [
      "api.yourservice.com",
      "cdn.yourservice.com"
    ]
  },
  "pages": {
    "index": "/index.html",
    "game": "/game.html"
  }
}`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode('afu.config.json', 'config')}
                    >
                      {copiedCode === 'config' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Core SDK Tab */}
            <TabsContent value="core" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    App Lifecycle
                  </CardTitle>
                  <CardDescription>
                    Manage your app's lifecycle with built-in hooks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                      <code>{exampleCode.lifecycle}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(exampleCode.lifecycle, 'lifecycle')}
                    >
                      {copiedCode === 'lifecycle' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" />
                      Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.auth}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.auth, 'auth')}
                      >
                        {copiedCode === 'auth' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Database className="h-4 w-4" />
                      Storage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.storage}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.storage, 'storage')}
                      >
                        {copiedCode === 'storage' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="h-4 w-4" />
                      Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.network}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.network, 'network')}
                      >
                        {copiedCode === 'network' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Image className="h-4 w-4" />
                      Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.media}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.media, 'media')}
                      >
                        {copiedCode === 'media' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    UI Components & Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                      <code>{exampleCode.ui}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(exampleCode.ui, 'ui')}
                    >
                      {copiedCode === 'ui' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">Button</Badge>
                    <Badge variant="outline">List</Badge>
                    <Badge variant="outline">Card</Badge>
                    <Badge variant="outline">Modal</Badge>
                    <Badge variant="outline">Dialog</Badge>
                    <Badge variant="secondary">Light Theme</Badge>
                    <Badge variant="secondary">Dark Theme</Badge>
                    <Badge variant="secondary">System Theme</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Platform APIs Tab */}
            <TabsContent value="platform" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4" />
                      Messaging
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.messaging}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.messaging, 'messaging')}
                      >
                        {copiedCode === 'messaging' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.notifications}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.notifications, 'notifications')}
                      >
                        {copiedCode === 'notifications' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.analytics}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.analytics, 'analytics')}
                      >
                        {copiedCode === 'analytics' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-4 w-4" />
                      Payments (Optional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-64">
                        <code>{exampleCode.payments}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(exampleCode.payments, 'payments')}
                      >
                        {copiedCode === 'payments' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Model
                  </CardTitle>
                  <CardDescription>
                    AfuChat Mini Programs use a strict security model to protect users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Lock className="h-4 w-4 text-primary" />
                        Strict Isolation
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Each app runs in its own sandbox with no access to other apps' data or the host platform.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-primary" />
                        App Review Required
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        All apps must pass review before publishing. We check for security issues and policy violations.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        Rate Limiting
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        All API calls are rate-limited to prevent abuse and ensure fair usage across all apps.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-primary" />
                        Per-App Data Scope
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Each app can only access its own storage. User data is isolated between apps.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    Declare required permissions in your config. Users must approve before use.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {permissions.map((perm, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{perm.name}</code>
                          <span className="text-sm text-muted-foreground">{perm.description}</span>
                        </div>
                        <Badge variant={
                          perm.risk === 'low' ? 'secondary' : 
                          perm.risk === 'medium' ? 'outline' : 
                          'destructive'
                        }>
                          {perm.risk} risk
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution & Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium">Marketplace</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Discover apps via search and categories
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <GitBranch className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium">Staged Rollout</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gradually release updates to users
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium">Backward Compatible</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Updates must maintain compatibility
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Reference Tab */}
            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>REST API Endpoints</CardTitle>
                  <CardDescription>
                    Base URL: <code className="bg-muted px-2 py-1 rounded">https://api.afuchat.com</code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                      {apiEndpoints.map((endpoint, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2 sm:p-3 border rounded-lg">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-mono shrink-0 ${
                            endpoint.method === 'GET' ? 'bg-blue-500/10 text-blue-500' : 
                            endpoint.method === 'POST' ? 'bg-green-500/10 text-green-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {endpoint.method}
                          </span>
                          <code className="text-xs sm:text-sm break-all">{endpoint.endpoint}</code>
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground sm:ml-auto">{endpoint.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    All API requests require a valid session token in the Authorization header:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`// Get token from SDK
const token = await sdk.auth.getSessionToken();

// Use in API requests
fetch('https://api.afuchat.com/api/v1/storage/get/key', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
    'X-App-ID': 'your-app-id'
  }
});`}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rate Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="p-2 sm:p-4 border rounded-lg text-center">
                        <p className="text-lg sm:text-2xl font-bold text-primary">1000</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">req/min</p>
                      </div>
                      <div className="p-2 sm:p-4 border rounded-lg text-center">
                        <p className="text-lg sm:text-2xl font-bold text-primary">10MB</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">storage</p>
                      </div>
                      <div className="p-2 sm:p-4 border rounded-lg text-center">
                        <p className="text-lg sm:text-2xl font-bold text-primary">5MB</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">upload</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Exceeding rate limits will return a <code className="bg-muted px-1 rounded">429 Too Many Requests</code> response.
                      Implement exponential backoff for retries.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { code: 'RATE_LIMITED', description: 'Too many requests, implement backoff' },
                      { code: 'DOMAIN_NOT_ALLOWED', description: 'Network domain not in allowlist' },
                      { code: 'STORAGE_LIMIT_EXCEEDED', description: 'App storage quota exceeded' },
                      { code: 'PERMISSION_DENIED', description: 'Missing required permission' },
                      { code: 'INVALID_TOKEN', description: 'Session token expired or invalid' },
                      { code: 'SANDBOX_VIOLATION', description: 'Attempted forbidden operation' },
                    ].map((error, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                        <code className="text-sm font-mono bg-destructive/10 text-destructive px-2 py-1 rounded">
                          {error.code}
                        </code>
                        <span className="text-sm text-muted-foreground">{error.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admin-only Launch Guide Tab */}
            {isAdmin && (
              <TabsContent value="launch-guide" className="space-y-6">
                <Card className="border-primary/50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Admin Only</Badge>
                    </div>
                    <CardTitle className="flex items-center gap-2 mt-2">
                      <Hammer className="h-5 w-5" />
                      Launch Your First Mini Program
                    </CardTitle>
                    <CardDescription>
                      Step-by-step guide to create, test, and publish your first AfuChat mini program
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {launchGuideSteps.map((step, index) => (
                        <div key={step.step} className="relative">
                          {index < launchGuideSteps.length - 1 && (
                            <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
                          )}
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {step.step}
                            </div>
                            <div className="flex-1 space-y-3 pb-6">
                              <div>
                                <h4 className="font-semibold">{step.title}</h4>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                              </div>
                              <div className="relative">
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                  <code>{step.code}</code>
                                </pre>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-2 right-2"
                                  onClick={() => copyCode(step.code, `step-${step.step}`)}
                                >
                                  {copiedCode === `step-${step.step}` ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      Testing Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        'App loads without errors in the simulator',
                        'All permissions are declared in config',
                        'Network requests use allowlisted domains',
                        'Storage usage is within limits',
                        'UI is responsive on mobile and desktop',
                        'Lifecycle hooks work correctly',
                        'Error handling is implemented',
                        'App follows AfuChat design guidelines',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <Circle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Submission Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Required Files</h4>
                        <div className="space-y-2">
                          {[
                            { icon: FileCode, name: 'afu.config.json', desc: 'App configuration' },
                            { icon: FolderOpen, name: 'dist/', desc: 'Production build' },
                            { icon: Image, name: 'icon.png', desc: '512x512 app icon' },
                            { icon: FileCode, name: 'README.md', desc: 'Documentation' },
                          ].map((file, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                              <file.icon className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-sm font-mono">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{file.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Review Process</h4>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>1. Submit via <code className="bg-muted px-1 rounded">afu publish</code></p>
                          <p>2. Automated security scan (1-2 minutes)</p>
                          <p>3. Manual review by AfuChat team (24-48 hours)</p>
                          <p>4. Approval notification via email</p>
                          <p>5. App appears in marketplace</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Developer Tab */}
            <TabsContent value="developer" className="space-y-6">
              {isDeveloper ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-800/20 to-gray-900/20 rounded-lg border">
                    <DeveloperBadge size="lg" />
                    <div>
                      <h3 className="font-semibold">AfuChat Developer</h3>
                      <p className="text-sm text-muted-foreground">You have access to exclusive developer features</p>
                    </div>
                  </div>
                  <DeveloperFeatures featuresEnabled={featuresEnabled} />
                </div>
              ) : applicationStatus === 'pending' ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Github className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Application Pending</h3>
                    <p className="text-muted-foreground">Your developer application is being reviewed. We'll notify you once it's approved.</p>
                  </CardContent>
                </Card>
              ) : applicationStatus === 'rejected' ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
                      <Github className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Application Not Approved</h3>
                    <p className="text-muted-foreground">Unfortunately your application wasn't approved. You can reapply after improving your profile.</p>
                  </CardContent>
                </Card>
              ) : (
                <DeveloperApplicationForm onSuccess={refetch} />
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default DeveloperSDK;
