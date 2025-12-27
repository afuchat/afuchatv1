import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Github, Check, X, Clock, User, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface DeveloperApplication {
  id: string;
  user_id: string;
  github_username: string | null;
  portfolio_url: string | null;
  experience_level: string | null;
  reason: string;
  skills: string[] | null;
  status: string;
  created_at: string;
  rejection_reason: string | null;
  user?: {
    display_name: string;
    handle: string;
    avatar_url: string;
  };
}

const AdminDeveloperPanel = () => {
  const [applications, setApplications] = useState<DeveloperApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; applicationId: string | null }>({
    open: false,
    applicationId: null
  });
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('developer_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      if (data && data.length > 0) {
        const userIds = data.map(app => app.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, handle, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const appsWithUsers = data.map(app => ({
          ...app,
          user: profileMap.get(app.user_id)
        }));

        setApplications(appsWithUsers);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (applicationId: string) => {
    setProcessing(applicationId);
    try {
      const { data, error } = await supabase
        .rpc('approve_developer_application', { p_application_id: applicationId });

      if (error) throw error;
      
      const result = data as { success: boolean; message: string };
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success('Developer application approved!');
      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.applicationId) return;
    
    setProcessing(rejectDialog.applicationId);
    try {
      const { data, error } = await supabase
        .rpc('reject_developer_application', { 
          p_application_id: rejectDialog.applicationId,
          p_reason: rejectReason || null
        });

      if (error) throw error;
      
      const result = data as { success: boolean; message: string };
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success('Application rejected');
      setRejectDialog({ open: false, applicationId: null });
      setRejectReason('');
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setProcessing(null);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (activeTab === 'pending') return app.status === 'pending';
    if (activeTab === 'approved') return app.status === 'approved';
    if (activeTab === 'rejected') return app.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Github className="w-5 h-5" />
          Developer Applications
        </h2>
        <Badge variant="outline">
          {applications.filter(a => a.status === 'pending').length} pending
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({applications.filter(a => a.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({applications.filter(a => a.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({applications.filter(a => a.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No {activeTab} applications
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map(app => (
                <Card key={app.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {app.user?.avatar_url ? (
                          <img 
                            src={app.user.avatar_url} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {app.user?.display_name || 'Unknown User'}
                          </CardTitle>
                          <CardDescription>
                            @{app.user?.handle || 'unknown'} • {app.experience_level}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {app.github_username && (
                        <a 
                          href={`https://github.com/${app.github_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Github className="w-3 h-3" />
                          {app.github_username}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {app.portfolio_url && (
                        <a 
                          href={app.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Portfolio
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {app.skills && app.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {app.skills.map(skill => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">{app.reason}</p>

                    <div className="text-xs text-muted-foreground">
                      Applied {format(new Date(app.created_at), 'MMM d, yyyy')}
                    </div>

                    {app.status === 'rejected' && app.rejection_reason && (
                      <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
                        Rejection reason: {app.rejection_reason}
                      </div>
                    )}

                    {app.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.id)}
                          disabled={processing === app.id}
                        >
                          {processing === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectDialog({ open: true, applicationId: app.id })}
                          disabled={processing === app.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason (optional)</Label>
            <Textarea
              placeholder="Explain why the application was rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, applicationId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeveloperPanel;
