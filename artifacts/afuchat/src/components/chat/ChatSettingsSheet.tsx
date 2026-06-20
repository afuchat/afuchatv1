import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SwipeableSheet, SwipeableSheetContent } from '@/components/ui/swipeable-sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Image,
  Type,
  Volume2,
  Download,
  Video,
  Clock,
  Lock,
  Eye,
  Trash2,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ChatSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export const ChatSettingsSheet = ({ isOpen, onClose, defaultTab = 'appearance' }: ChatSettingsSheetProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState([16]);
  const [autoDownload, setAutoDownload] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [chatLock, setChatLock] = useState(false);
  const [sounds, setSounds] = useState(true);
  const [bubbleStyle, setBubbleStyle] = useState('rounded');
  const [mediaQuality, setMediaQuality] = useState('high');

  useEffect(() => {
    if (isOpen && user) {
      loadPreferences();
    }
  }, [user, isOpen]);

  const loadPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setBubbleStyle(data.bubble_style || 'rounded');
        setFontSize([data.font_size || 16]);
        setSounds(data.sounds_enabled ?? true);
        setAutoDownload(data.auto_download ?? true);
        setMediaQuality(data.media_quality || 'high');
        setChatLock(data.chat_lock ?? false);
        setReadReceipts(data.read_receipts ?? true);
      }
    } catch (error) {
      console.error('Unexpected error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_preferences')
        .upsert({
          user_id: user.id,
          bubble_style: bubbleStyle,
          font_size: fontSize[0],
          sounds_enabled: sounds,
          auto_download: autoDownload,
          media_quality: mediaQuality,
          chat_lock: chatLock,
          read_receipts: readReceipts,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save settings');
    }
  };

  // Auto-save when settings change
  useEffect(() => {
    if (!loading && user) {
      const timeoutId = setTimeout(() => {
        savePreferences();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [bubbleStyle, fontSize, sounds, autoDownload, mediaQuality, chatLock, readReceipts, loading]);

  return (
    <SwipeableSheet
      open={isOpen}
      onOpenChange={onClose}
      title="Chat Customization"
      description="Personalize your chat experience"
      side="right"
      showCloseButton
    >
      <SwipeableSheetContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 mb-6">
            <TabsTrigger value="appearance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Media
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Privacy
            </TabsTrigger>
          </TabsList>

          <div className="space-y-6">
            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-0">
              {/* Bubble Style */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Message Bubble Style</h3>
                </div>
                <RadioGroup value={bubbleStyle} onValueChange={setBubbleStyle}>
                  <div className="grid grid-cols-3 gap-3">
                    <Label
                      htmlFor="rounded"
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                        bubbleStyle === 'rounded'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="rounded" id="rounded" className="sr-only" />
                      <div className="w-full h-12 bg-primary rounded-2xl" />
                      <span className="text-xs font-medium">Rounded</span>
                    </Label>
                    
                    <Label
                      htmlFor="square"
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                        bubbleStyle === 'square'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="square" id="square" className="sr-only" />
                      <div className="w-full h-12 bg-primary rounded-md" />
                      <span className="text-xs font-medium">Square</span>
                    </Label>
                    
                    <Label
                      htmlFor="minimal"
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                        bubbleStyle === 'minimal'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="minimal" id="minimal" className="sr-only" />
                      <div className="w-full h-12 bg-primary rounded-sm" />
                      <span className="text-xs font-medium">Minimal</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Font Size */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Message Font Size</h3>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{fontSize[0]}px</span>
                </div>
                <div className="space-y-4">
                  <Slider
                    value={fontSize}
                    onValueChange={setFontSize}
                    min={12}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Small</span>
                    <span>Medium</span>
                    <span>Large</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p style={{ fontSize: `${fontSize[0]}px` }} className="text-foreground">
                    This is a preview of your message text
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6 mt-0">
              {/* Chat Sounds */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Volume2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Chat Sounds</p>
                    <p className="text-sm text-muted-foreground">Play sounds for messages</p>
                  </div>
                </div>
                <Switch checked={sounds} onCheckedChange={setSounds} />
              </div>

              {/* Auto Download */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Download className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Auto-Download Media</p>
                    <p className="text-sm text-muted-foreground">Automatically save images and videos</p>
                  </div>
                </div>
                <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
              </div>

              <Separator />

              {/* Media Quality */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Media Quality</h3>
                </div>
                <RadioGroup value={mediaQuality} onValueChange={setMediaQuality} className="space-y-3">
                  <Label
                    htmlFor="low"
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      mediaQuality === 'low'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <RadioGroupItem value="low" id="low" className="sr-only" />
                      <p className="font-medium">Low Quality</p>
                      <p className="text-sm text-muted-foreground">Faster, uses less data</p>
                    </div>
                  </Label>
                  
                  <Label
                    htmlFor="high"
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      mediaQuality === 'high'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <RadioGroupItem value="high" id="high" className="sr-only" />
                      <p className="font-medium">High Quality</p>
                      <p className="text-sm text-muted-foreground">Best quality, uses more data</p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <Separator />

              {/* Message Timer */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Disappearing Messages</h3>
                </div>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  Set Default Timer
                </Button>
                <p className="text-sm text-muted-foreground">
                  Set messages to automatically delete after a certain time
                </p>
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6 mt-0">
              {/* Chat Lock */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Lock className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Chat Lock</p>
                    <p className="text-sm text-muted-foreground">Require authentication to open chats</p>
                  </div>
                </div>
                <Switch checked={chatLock} onCheckedChange={setChatLock} />
              </div>

              {/* Read Receipts */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Eye className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Read Receipts</p>
                    <p className="text-sm text-muted-foreground">Let others see when you've read messages</p>
                  </div>
                </div>
                <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
              </div>

              <Separator />

              {/* Clear Data */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <h3 className="text-lg font-semibold text-destructive">Clear Chat Data</h3>
                </div>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      sessionStorage.clear();
                      toast.success('Cache cleared successfully');
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Cache
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => toast.info('Media deletion feature coming soon')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Downloaded Media
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={() => toast.error('This action requires confirmation')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Messages
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Warning: These actions cannot be undone
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SwipeableSheetContent>
    </SwipeableSheet>
  );
};
