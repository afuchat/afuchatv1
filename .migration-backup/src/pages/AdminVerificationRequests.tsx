import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Image as ImageIcon, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface VerificationRequest {
  id: string;
  user_id: string;
  account_type: string;
  full_name: string;
  email: string;
  phone: string | null;
  website_url: string | null;
  social_links: any;
  verification_reason: string;
  supporting_documents: string[] | null;
  status: string;
  created_at: string;
  business_registration: string | null;
  tax_id: string | null;
  primary_platform: string | null;
  follower_count: string | null;
  engagement_rate: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
}

export default function AdminVerificationRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, activeTab]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

      if (error) throw error;
      
      if (!data) {
        toast.error("Access denied. Admin privileges required.");
        navigate('/');
        return;
      }
      
      setIsAdmin(true);
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast.error("Failed to verify admin access");
      navigate('/');
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("status", activeTab)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load verification requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: VerificationRequest) => {
    setActionLoading(true);
    try {
      // Update verification request status
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // Update user profile to mark as verified (manual verification = permanent)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_verified: request.account_type === "influencer",
          is_organization_verified: request.account_type === "business",
          verification_source: 'manual', // Manual approval = permanent verification
        })
        .eq("id", request.user_id);

      if (profileError) throw profileError;

      toast.success("Verification request approved successfully!");
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve verification request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("Verification request rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject verification request");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Verification Requests</h1>
            <p className="text-sm text-muted-foreground">Review and manage verification applications</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="space-y-3 w-full max-w-md">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ) : requests.length === 0 ? (
              <Card className="border-0 shadow-none">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No {activeTab} requests</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="border-0 shadow-none bg-muted/30">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{request.full_name}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={request.account_type === "business" ? "default" : "secondary"}>
                            {request.account_type}
                          </Badge>
                          <Badge variant="outline">
                            {format(new Date(request.created_at), "MMM d, yyyy")}
                          </Badge>
                        </div>
                      </div>
                      {request.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{request.email}</p>
                      </div>
                      {request.phone && (
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">{request.phone}</p>
                        </div>
                      )}
                      {request.account_type === "business" && request.business_registration && (
                        <div>
                          <p className="text-sm font-medium">Business Registration</p>
                          <p className="text-sm text-muted-foreground">{request.business_registration}</p>
                        </div>
                      )}
                      {request.account_type === "influencer" && request.primary_platform && (
                        <div>
                          <p className="text-sm font-medium">Primary Platform</p>
                          <p className="text-sm text-muted-foreground">{request.primary_platform}</p>
                        </div>
                      )}
                      {request.account_type === "influencer" && request.follower_count && (
                        <div>
                          <p className="text-sm font-medium">Followers</p>
                          <p className="text-sm text-muted-foreground">{request.follower_count}</p>
                        </div>
                      )}
                    </div>

                    {request.status === "rejected" && request.rejection_reason && (
                      <div className="bg-destructive/10 rounded-lg p-3">
                        <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                        <p className="text-sm text-muted-foreground mt-1">{request.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Verification Request</DialogTitle>
            <DialogDescription>
              Review the details and supporting documents before making a decision
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Account Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <p className="text-sm text-muted-foreground">{selectedRequest.full_name}</p>
                    </div>
                    <div>
                      <Label>Account Type</Label>
                      <p className="text-sm text-muted-foreground capitalize">{selectedRequest.account_type}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                    </div>
                    {selectedRequest.phone && (
                      <div>
                        <Label>Phone</Label>
                        <p className="text-sm text-muted-foreground">{selectedRequest.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business-specific fields */}
                {selectedRequest.account_type === "business" && (
                  <div>
                    <h3 className="font-semibold mb-2">Business Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedRequest.business_registration && (
                        <div>
                          <Label>Registration Number</Label>
                          <p className="text-sm text-muted-foreground">{selectedRequest.business_registration}</p>
                        </div>
                      )}
                      {selectedRequest.tax_id && (
                        <div>
                          <Label>Tax ID</Label>
                          <p className="text-sm text-muted-foreground">{selectedRequest.tax_id}</p>
                        </div>
                      )}
                      {selectedRequest.website_url && (
                        <div>
                          <Label>Website</Label>
                          <a 
                            href={selectedRequest.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {selectedRequest.website_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Influencer-specific fields */}
                {selectedRequest.account_type === "influencer" && (
                  <div>
                    <h3 className="font-semibold mb-2">Influencer Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedRequest.primary_platform && (
                        <div>
                          <Label>Primary Platform</Label>
                          <p className="text-sm text-muted-foreground">{selectedRequest.primary_platform}</p>
                        </div>
                      )}
                      {selectedRequest.follower_count && (
                        <div>
                          <Label>Follower Count</Label>
                          <p className="text-sm text-muted-foreground">{selectedRequest.follower_count}</p>
                        </div>
                      )}
                      {selectedRequest.engagement_rate && (
                        <div>
                          <Label>Engagement Rate</Label>
                          <p className="text-sm text-muted-foreground">{selectedRequest.engagement_rate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {selectedRequest.social_links && Array.isArray(selectedRequest.social_links) && selectedRequest.social_links.length > 0 && (
                  <div>
                    <Label>Social Media Links</Label>
                    <div className="space-y-1 mt-2">
                      {selectedRequest.social_links.map((link: string, index: number) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {link}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification Reason */}
                <div>
                  <Label>Verification Reason</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedRequest.verification_reason}</p>
                </div>

                {/* Supporting Documents */}
                {selectedRequest.supporting_documents && selectedRequest.supporting_documents.length > 0 && (
                  <div>
                    <Label>Supporting Documents ({selectedRequest.supporting_documents.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {selectedRequest.supporting_documents.map((doc, index) => {
                        const isImage = doc.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return (
                          <button
                            key={index}
                            onClick={() => setPreviewDocument(doc)}
                            className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            {isImage ? (
                              <ImageIcon className="h-8 w-8 text-primary" />
                            ) : (
                              <FileText className="h-8 w-8 text-primary" />
                            )}
                            <span className="text-xs text-center">Document {index + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedRequest.status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 opacity-50" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be shared with the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this verification request is being rejected..."
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || actionLoading}
              >
                {actionLoading ? (
                  "Confirming..."
                ) : (
                  "Confirm Rejection"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
            <DialogDescription>
              View the uploaded verification document
            </DialogDescription>
          </DialogHeader>
          {previewDocument && (
            <div className="space-y-4">
              {previewDocument.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img 
                  src={previewDocument} 
                  alt="Document preview" 
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview not available for this file type
                  </p>
                  <Button asChild>
                    <a href={previewDocument} target="_blank" rel="noopener noreferrer">
                      Open Document
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
              )}
              <Button 
                className="w-full" 
                asChild
              >
                <a href={previewDocument} target="_blank" rel="noopener noreferrer">
                  Open in New Tab
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
