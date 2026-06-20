import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Phone, Banknote, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { InlineLoader } from '@/components/ui/CustomLoader';

interface Withdrawal {
  id: string;
  user_id: string;
  amount_ugx: number;
  phone_number: string;
  mobile_network: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

interface PendingWithdrawal {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  amount_ugx: number;
  phone_number: string;
  mobile_network: string;
  requested_at: string;
  notes: string | null;
}

export function AdminWithdrawalsPanel() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // Get pending withdrawals
  const { data: pendingWithdrawals, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-pending-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_withdrawals');
      if (error) throw error;
      return data as PendingWithdrawal[];
    }
  });

  // Get all withdrawals history
  const { data: allWithdrawals, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-all-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_withdrawals')
        .select(`
          id, user_id, amount_ugx, phone_number, mobile_network, 
          status, requested_at, processed_at, notes,
          profiles(display_name, handle, avatar_url)
        `)
        .order('requested_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  const processWithdrawal = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.rpc('admin_process_withdrawal', {
        p_withdrawal_id: id,
        p_action: action,
        p_notes: null
      });
      if (error) throw error;
      return data as unknown as { success: boolean; message: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['admin-pending-withdrawals'] });
        queryClient.invalidateQueries({ queryKey: ['admin-all-withdrawals'] });
      } else {
        toast.error(data.message);
      }
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process withdrawal');
      setProcessingId(null);
    }
  });

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    processWithdrawal.mutate({ id, action });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPending = pendingWithdrawals?.reduce((sum, w) => sum + w.amount_ugx, 0) || 0;
  const totalApproved = allWithdrawals?.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount_ugx, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWithdrawals?.length || 0}</div>
            <p className="text-sm text-muted-foreground">{totalPending.toLocaleString()} UGX total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Total Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allWithdrawals?.filter(w => w.status === 'approved').length || 0}</div>
            <p className="text-sm text-muted-foreground">{totalApproved.toLocaleString()} UGX paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Total Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allWithdrawals?.filter(w => w.status === 'rejected').length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingWithdrawals?.length || 0})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <InlineLoader text="Loading pending withdrawals..." />
          ) : pendingWithdrawals && pendingWithdrawals.length > 0 ? (
            <div className="space-y-4">
              {pendingWithdrawals.map((withdrawal) => (
                <Card key={withdrawal.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={withdrawal.avatar_url || undefined} />
                        <AvatarFallback>{withdrawal.display_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{withdrawal.display_name}</p>
                          <span className="text-muted-foreground text-sm">@{withdrawal.handle}</span>
                        </div>
                        
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-green-600 font-bold">
                            <Banknote className="h-4 w-4" />
                            {withdrawal.amount_ugx.toLocaleString()} UGX
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {withdrawal.mobile_network} • {withdrawal.phone_number}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Requested: {format(new Date(withdrawal.requested_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1"
                        variant="default"
                        size="sm"
                        onClick={() => handleAction(withdrawal.id, 'approve')}
                        disabled={processingId === withdrawal.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAction(withdrawal.id, 'reject')}
                        disabled={processingId === withdrawal.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No pending withdrawal requests</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {historyLoading ? (
            <InlineLoader text="Loading history..." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allWithdrawals?.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={w.profiles?.avatar_url} />
                            <AvatarFallback>{w.profiles?.display_name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{w.profiles?.display_name}</p>
                            <p className="text-xs text-muted-foreground">@{w.profiles?.handle}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {w.amount_ugx.toLocaleString()} UGX
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {w.mobile_network} • {w.phone_number}
                      </TableCell>
                      <TableCell>{getStatusBadge(w.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(w.requested_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {w.processed_at ? format(new Date(w.processed_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
