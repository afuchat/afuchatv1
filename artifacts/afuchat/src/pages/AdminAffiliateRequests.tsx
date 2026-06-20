import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AffiliateRequest {
  id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  notes: string | null;
  user: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
  business: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function AdminAffiliateRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AffiliateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (data?.is_admin) {
      setIsAdmin(true);
    } else {
      toast.error('Admin access required');
      navigate('/');
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_requests')
        .select('id, status, requested_at, reviewed_at, notes, user_id, business_profile_id')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      if (!data) {
        setRequests([]);
        return;
      }

      const userIds = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean)));
      const businessIds = Array.from(new Set(data.map((r: any) => r.business_profile_id).filter(Boolean)));
      const profileIds = Array.from(new Set([...userIds, ...businessIds]));

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .in('id', profileIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

      const mappedRequests: AffiliateRequest[] = data.map((r: any) => ({
        id: r.id,
        status: r.status,
        requested_at: r.requested_at,
        reviewed_at: r.reviewed_at,
        notes: r.notes,
        user: profileMap.get(r.user_id) || {
          id: r.user_id,
          display_name: 'Unknown user',
          handle: 'unknown',
          avatar_url: null,
        },
        business: profileMap.get(r.business_profile_id) || {
          id: r.business_profile_id,
          display_name: 'Unknown business',
          handle: 'unknown',
          avatar_url: null,
        },
      }));

      setRequests(mappedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load affiliate requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    toast.info('Affiliate requests are now managed by business owners directly');
  };

  const handleReject = async () => {
    toast.info('Affiliate requests are now managed by business owners directly');
    setShowRejectDialog(false);
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRequest(requestId);
    setShowRejectDialog(true);
  };

  const filterRequests = (status: string) => {
    return requests.filter(r => r.status === status);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Affiliate Requests</h1>
            <p className="text-sm text-muted-foreground">Approve or reject affiliation requests</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending ({filterRequests('pending').length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({filterRequests('approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({filterRequests('rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </Card>
                ))}
              </div>
            ) : filterRequests('pending').length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              </Card>
            ) : (
              filterRequests('pending').map(request => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={request.user.avatar_url || '/placeholder.svg'}
                      alt={request.user.display_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{request.user.display_name}</span>
                        <span className="text-sm text-muted-foreground">@{request.user.handle}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Requesting affiliation with{' '}
                        <span className="font-medium text-foreground">{request.business.display_name}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        {request.business.avatar_url && (
                          <img
                            src={request.business.avatar_url}
                            alt={request.business.display_name}
                            className="h-8 w-8 rounded-full object-cover border"
                          />
                        )}
                        <span className="text-xs text-muted-foreground">
                          Requested {new Date(request.requested_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={processing}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectDialog(request.id)}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3">
            {filterRequests('approved').map(request => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={request.user.avatar_url || '/placeholder.svg'}
                    alt={request.user.display_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{request.user.display_name}</span>
                      <Badge variant="default">Approved</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Affiliated with {request.business.display_name}
                    </p>
                    {request.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Approved on {new Date(request.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            {filterRequests('rejected').map(request => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={request.user.avatar_url || '/placeholder.svg'}
                    alt={request.user.display_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{request.user.display_name}</span>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Request for {request.business.display_name}
                    </p>
                    {request.notes && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded">
                        {request.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Affiliate Request</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejecting this request (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectNotes('');
              setSelectedRequest(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={processing}>
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}