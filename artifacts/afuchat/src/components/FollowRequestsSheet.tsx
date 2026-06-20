import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, X, Clock, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface FollowRequest {
  id: string;
  requester_id: string;
  created_at: string;
  status: string;
  requester: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_organization_verified: boolean;
  };
}

interface FollowRequestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FollowRequestsSheet = ({ open, onOpenChange }: FollowRequestsSheetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('follow_requests')
      .select(`
        id,
        requester_id,
        created_at,
        status,
        requester:profiles!follow_requests_requester_id_fkey (
          display_name,
          handle,
          avatar_url,
          is_verified,
          is_organization_verified
        )
      `)
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching follow requests:', error);
      toast.error('Failed to load follow requests');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && user) {
      fetchRequests();
    }
  }, [open, user]);

  const handleApprove = async (requestId: string, requesterId: string) => {
    if (!user) return;
    setProcessingId(requestId);

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('follow_requests')
        .update({ 
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create the follow relationship
      const { error: followError } = await supabase
        .from('follows')
        .insert({ 
          follower_id: requesterId, 
          following_id: user.id 
        });

      if (followError) throw followError;

      toast.success('Follow request approved');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from('follow_requests')
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Follow request rejected');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserClick = (handle: string) => {
    onOpenChange(false);
    navigate(`/@${handle}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Follow Requests
          </SheetTitle>
          <SheetDescription className="text-sm">
            Review and manage who can follow your private account
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto max-h-[60vh] space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <CustomLoader size="md" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No pending requests</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                When someone requests to follow you, it will appear here
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div 
                key={request.id} 
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                <Avatar 
                  className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleUserClick(request.requester.handle)}
                >
                  <AvatarImage src={request.requester.avatar_url || undefined} />
                  <AvatarFallback>{request.requester.display_name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleUserClick(request.requester.handle)}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-semibold truncate">{request.requester.display_name}</span>
                    <VerifiedBadge 
                      isVerified={request.requester.is_verified} 
                      isOrgVerified={request.requester.is_organization_verified} 
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">@{request.requester.handle}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => handleApprove(request.id, request.requester_id)}
                    disabled={processingId === request.id}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
