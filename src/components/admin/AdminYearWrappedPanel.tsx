import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Send, Users, Loader2, Eye, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserStats {
  userId: string;
  email: string;
  displayName: string;
  handle: string;
  totalPosts: number;
  totalLikesReceived: number;
  totalRepliesReceived: number;
  totalFollowersGained: number;
  totalFollowing: number;
  totalMessagesSent: number;
  totalGiftsSent: number;
  totalGiftsReceived: number;
  totalXpEarned: number;
  currentGrade: string;
  topPost: { content: string; likes: number } | null;
  joinDate: string;
  daysActive: number;
}

export const AdminYearWrappedPanel = () => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [previewStats, setPreviewStats] = useState<UserStats | null>(null);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const handlePreview = async () => {
    if (!email.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-year-wrapped', {
        body: { action: 'preview', email: email.trim(), year: parseInt(year) }
      });

      if (error) throw error;

      if (data.success) {
        setPreviewStats(data.stats);
        toast.success('Preview loaded');
      } else {
        toast.error(data.error || 'Failed to load preview');
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(error.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSingle = async () => {
    if (!email.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-year-wrapped', {
        body: { action: 'send_single', email: email.trim(), year: parseInt(year) }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAll = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to send Year Wrapped emails to ALL users for ${year}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setSendingAll(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-year-wrapped', {
        body: { action: 'send_all', year: parseInt(year) }
      });

      if (error) throw error;

      if (data.success) {
        setLastResult({ sent: data.sent, failed: data.failed, total: data.total });
        toast.success(`Sent ${data.sent} emails successfully!`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} emails failed to send`);
        }
      } else {
        toast.error(data.error || 'Failed to send emails');
      }
    } catch (error: any) {
      console.error('Send all error:', error);
      toast.error(error.message || 'Failed to send emails');
    } finally {
      setSendingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Year Wrapped Emails
          </CardTitle>
          <CardDescription>
            Send personalized year-in-review emails to users showing their activity statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Year Selection */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Select Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Send to All Users */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Send to All Users
              </CardTitle>
              <CardDescription>
                Send Year Wrapped emails to all registered users with email addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSendAll} 
                disabled={sendingAll}
                className="gap-2"
                variant="default"
              >
                {sendingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending to all users...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send to All Users
                  </>
                )}
              </Button>

              {lastResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">Last Send Result:</p>
                  <div className="flex gap-4">
                    <Badge variant="default" className="bg-green-500">
                      ✓ Sent: {lastResult.sent}
                    </Badge>
                    {lastResult.failed > 0 && (
                      <Badge variant="destructive">
                        ✗ Failed: {lastResult.failed}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      Total: {lastResult.total}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Send to Single User */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send to Single User
              </CardTitle>
              <CardDescription>
                Preview stats or send email to a specific user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User Email</Label>
                <Input 
                  type="email"
                  placeholder="Enter user email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handlePreview} 
                  disabled={loading || !email.trim()}
                  className="gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Preview Stats
                </Button>
                <Button 
                  onClick={handleSendSingle} 
                  disabled={loading || !email.trim()}
                  className="gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Stats */}
          {previewStats && (
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Preview: @{previewStats.handle}</span>
                  <Badge>{previewStats.currentGrade}</Badge>
                </CardTitle>
                <CardDescription>{previewStats.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{previewStats.totalPosts}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{previewStats.totalLikesReceived}</div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{previewStats.totalFollowersGained}</div>
                    <div className="text-xs text-muted-foreground">New Followers</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-purple-500">{previewStats.totalMessagesSent}</div>
                    <div className="text-xs text-muted-foreground">Messages</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-yellow-500">{previewStats.totalGiftsSent}</div>
                    <div className="text-xs text-muted-foreground">Gifts Sent</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-pink-500">{previewStats.totalGiftsReceived}</div>
                    <div className="text-xs text-muted-foreground">Gifts Received</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{previewStats.totalXpEarned}</div>
                    <div className="text-xs text-muted-foreground">Nexa Earned</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-cyan-500">{previewStats.daysActive}</div>
                    <div className="text-xs text-muted-foreground">Days Active</div>
                  </div>
                </div>

                {previewStats.topPost && previewStats.topPost.likes > 0 && (
                  <div className="mt-4 p-4 bg-background rounded-lg">
                    <p className="text-sm font-medium mb-2">🌟 Top Post ({previewStats.topPost.likes} likes)</p>
                    <p className="text-sm text-muted-foreground italic">
                      "{previewStats.topPost.content}{previewStats.topPost.content.length >= 100 ? '...' : ''}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminYearWrappedPanel;
