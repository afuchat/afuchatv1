import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, MessageSquare, User, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminReportsPanel() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Get user reports
  const { data: userReports, isLoading: userReportsLoading } = useQuery({
    queryKey: ['admin-user-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:profiles!user_reports_reporter_id_fkey(display_name, handle, avatar_url),
          reported:profiles!user_reports_reported_user_id_fkey(display_name, handle, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Get message reports
  const { data: messageReports, isLoading: messageReportsLoading } = useQuery({
    queryKey: ['admin-message-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_reports')
        .select(`
          *,
          messages(encrypted_content, sender_id)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const updateUserReportStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('user_reports')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-user-reports'] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update report');
      setProcessingId(null);
    }
  });

  const updateMessageReportStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('message_reports')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-message-reports'] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update report');
      setProcessingId(null);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500">Pending</Badge>;
      case 'reviewed':
        return <Badge className="bg-blue-500">Reviewed</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingUserReports = userReports?.filter((r: any) => r.status === 'pending').length || 0;
  const pendingMessageReports = messageReports?.filter((r: any) => r.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-red-500" />
              User Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userReports?.length || 0}</div>
            <p className="text-sm text-muted-foreground">{pendingUserReports} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-500" />
              Message Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageReports?.length || 0}</div>
            <p className="text-sm text-muted-foreground">{pendingMessageReports} pending</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Reports ({pendingUserReports})</TabsTrigger>
          <TabsTrigger value="messages">Message Reports ({pendingMessageReports})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          {userReportsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : userReports && userReports.length > 0 ? (
            userReports.map((report: any) => (
              <Card key={report.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(report.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={report.reporter?.avatar_url} />
                            <AvatarFallback>{report.reporter?.display_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs text-muted-foreground">Reporter</p>
                            <p className="text-sm font-medium">@{report.reporter?.handle}</p>
                          </div>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={report.reported?.avatar_url} />
                            <AvatarFallback>{report.reported?.display_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs text-muted-foreground">Reported</p>
                            <p className="text-sm font-medium">@{report.reported?.handle}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm"><strong>Reason:</strong> {report.reason}</p>
                      {report.additional_info && (
                        <p className="text-sm text-muted-foreground mt-1">{report.additional_info}</p>
                      )}
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProcessingId(report.id);
                            updateUserReportStatus.mutate({ id: report.id, status: 'resolved' });
                          }}
                          disabled={processingId === report.id}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setProcessingId(report.id);
                            updateUserReportStatus.mutate({ id: report.id, status: 'dismissed' });
                          }}
                          disabled={processingId === report.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No user reports</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-4">
          {messageReportsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : messageReports && messageReports.length > 0 ? (
            messageReports.map((report: any) => (
              <Card key={report.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(report.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm"><strong>Reason:</strong> {report.reason}</p>
                      {report.message_content && (
                        <p className="text-sm text-muted-foreground mt-1 bg-muted p-2 rounded">
                          "{report.message_content}"
                        </p>
                      )}
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProcessingId(report.id);
                            updateMessageReportStatus.mutate({ id: report.id, status: 'resolved' });
                          }}
                          disabled={processingId === report.id}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setProcessingId(report.id);
                            updateMessageReportStatus.mutate({ id: report.id, status: 'dismissed' });
                          }}
                          disabled={processingId === report.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No message reports</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
