import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X, Phone, User, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

export default function AdminCreatorWithdrawals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check if user is admin
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data?.is_admin || false;
    },
    enabled: !!user?.id
  });

  // Get pending withdrawals
  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['admin-pending-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_withdrawals');
      if (error) throw error;
      return data as PendingWithdrawal[];
    },
    enabled: !!isAdmin
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
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['admin-pending-withdrawals'] });
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

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in</p>
      </div>
    );
  }

  if (adminLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Creator Withdrawals</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : withdrawals && withdrawals.length > 0 ? (
          withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={withdrawal.avatar_url || undefined} />
                    <AvatarFallback>
                      {withdrawal.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
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
                      {withdrawal.notes && (
                        <p className="text-xs text-muted-foreground italic">{withdrawal.notes}</p>
                      )}
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
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No pending withdrawal requests</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
