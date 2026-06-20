import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Rocket, Zap, BarChart3, Copy, Check, Key, Terminal, Webhook, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { hasDeveloperFeature } from '@/hooks/useDeveloperStatus';
import { useAuth } from '@/contexts/AuthContext';

interface DeveloperFeaturesProps {
  featuresEnabled: string[];
}

const DeveloperFeatures = ({ featuresEnabled }: DeveloperFeaturesProps) => {
  const { user } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);

  // Generate a mock API key based on user ID
  const apiKey = user ? `afu_dev_${user.id.slice(0, 8)}...${user.id.slice(-4)}` : '';
  const fullApiKey = user ? `afu_dev_${user.id.replace(/-/g, '')}` : '';

  const copyApiKey = () => {
    navigator.clipboard.writeText(fullApiKey);
    setCopiedKey(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const hasApiAccess = hasDeveloperFeature(featuresEnabled, 'api_access');
  const hasBetaFeatures = hasDeveloperFeature(featuresEnabled, 'beta_features');
  const hasCustomIntegrations = hasDeveloperFeature(featuresEnabled, 'custom_integrations');
  const hasDeveloperAnalytics = hasDeveloperFeature(featuresEnabled, 'developer_analytics');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api" disabled={!hasApiAccess}>
            <Code className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
          <TabsTrigger value="beta" disabled={!hasBetaFeatures}>
            <Rocket className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Beta</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" disabled={!hasCustomIntegrations}>
            <Zap className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" disabled={!hasDeveloperAnalytics}>
            <BarChart3 className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Access
              </CardTitle>
              <CardDescription>
                Use the AfuChat API to build integrations and apps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Your API Key</span>
                  <Badge variant="secondary">Developer</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-sm font-mono">
                    {apiKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyApiKey}>
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Quick Start
                </h4>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
{`// Initialize AfuChat SDK
import { AfuChat } from '@/lib/afuchat-sdk';

const afu = new AfuChat({
  apiKey: '${apiKey}'
});

// Send a message
await afu.messages.send({
  chatId: 'chat_id',
  content: 'Hello from API!'
});`}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">1,000</div>
                  <div className="text-sm text-muted-foreground">API calls/day</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">100</div>
                  <div className="text-sm text-muted-foreground">Requests/min</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beta" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Beta Features
              </CardTitle>
              <CardDescription>
                Access experimental features before public release
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">AI Post Generation</div>
                    <div className="text-sm text-muted-foreground">Generate posts with AI assistance</div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Advanced Search</div>
                    <div className="text-sm text-muted-foreground">Search with filters and operators</div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Voice Messages 2.0</div>
                    <div className="text-sm text-muted-foreground">Enhanced voice recording</div>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Custom Integrations
              </CardTitle>
              <CardDescription>
                Build webhooks and connect external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Webhook URL</h4>
                <code className="block p-2 bg-muted rounded text-sm">
                  https://api.afuchat.com/webhooks/{user?.id.slice(0, 8)}
                </code>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Available Events</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['message.new', 'message.edited', 'user.followed', 'post.liked', 'post.replied', 'gift.received'].map(event => (
                    <div key={event} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Developer Analytics
              </CardTitle>
              <CardDescription>
                Track your API usage and app performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">API Calls Today</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Webhook Events</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-500">100%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary">0ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Start making API calls to see your analytics
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperFeatures;
