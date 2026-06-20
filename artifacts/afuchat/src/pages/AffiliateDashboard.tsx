import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, DollarSign, Calendar, AlertCircle, ExternalLink, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AffiliateInfo {
  businessName: string;
  businessHandle: string;
  businessLogo: string | null;
  businessWebsite: string | null;
  affiliatedDate: string;
  commission_rate: number | null;
  payment_terms: string | null;
  total_earnings: number;
}

const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDeveloper, loading: devLoading } = useDeveloperStatus();
  const [loading, setLoading] = useState(true);
  const [affiliateInfo, setAffiliateInfo] = useState<AffiliateInfo | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Redirect developers away - they can't be affiliates
  useEffect(() => {
    if (!devLoading && isDeveloper) {
      toast.error('Developers cannot access the affiliate program');
      navigate('/home');
    }
  }, [isDeveloper, devLoading, navigate]);

  useEffect(() => {
    if (!devLoading && !isDeveloper) {
      fetchAffiliateInfo();
    }
  }, [user, devLoading, isDeveloper]);

  const fetchAffiliateInfo = async () => {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          is_affiliate,
          affiliated_business_id,
          created_at
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile.is_affiliate || !profile.affiliated_business_id) {
        navigate('/settings');
        return;
      }

      // Fetch business info
      const { data: business, error: businessError } = await supabase
        .from('profiles')
        .select('display_name, handle, avatar_url, website_url')
        .eq('id', profile.affiliated_business_id)
        .single();

      if (businessError) throw businessError;

      // Fetch affiliate request for commission details and date
      const { data: request, error: requestError } = await supabase
        .from('affiliate_requests')
        .select('requested_at, reviewed_at, commission_rate, payment_terms')
        .eq('user_id', user.id)
        .eq('business_profile_id', profile.affiliated_business_id)
        .eq('status', 'approved')
        .single();

      if (requestError) throw requestError;

      setAffiliateInfo({
        businessName: business.display_name,
        businessHandle: business.handle,
        businessLogo: business.avatar_url,
        businessWebsite: business.website_url,
        affiliatedDate: request.reviewed_at ?? request.requested_at ?? '',
        commission_rate: request.commission_rate,
        payment_terms: request.payment_terms,
        total_earnings: 0 // Will be implemented later
      });
    } catch (error) {
      console.error('Error fetching affiliate info:', error);
      toast.error('Failed to load affiliate information');
      navigate('/settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAffiliation = async () => {
    if (!user || !affiliateInfo) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_affiliate: false,
          affiliated_business_id: null
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update the affiliate request status
      await supabase
        .from('affiliate_requests')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'approved');

      toast.success('Affiliate partnership cancelled successfully');
      navigate('/settings');
    } catch (error) {
      console.error('Error cancelling affiliation:', error);
      toast.error('Failed to cancel affiliation');
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!affiliateInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Affiliate Dashboard" 
        subtitle="Manage your affiliate partnership"
        icon={<Users className="h-5 w-5 text-primary" />}
      />

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <div className="space-y-6">

          {/* Business Info Card */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {affiliateInfo.businessLogo ? (
                  <img 
                    src={affiliateInfo.businessLogo} 
                    alt={affiliateInfo.businessName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold">{affiliateInfo.businessName}</h3>
                <p className="text-sm text-muted-foreground">@{affiliateInfo.businessHandle}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Affiliated since {format(new Date(affiliateInfo.affiliatedDate), 'MMM yyyy')}</span>
                </div>
                {affiliateInfo.businessWebsite && (
                  <Link 
                    to={affiliateInfo.businessWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                  >
                    Visit website
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold">{affiliateInfo.total_earnings} Nexa</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Commission Rate</span>
              </div>
              <p className="text-2xl font-bold">
                {affiliateInfo.commission_rate ? `${affiliateInfo.commission_rate}%` : 'TBD'}
              </p>
            </Card>
          </div>

          {/* Payment Terms Card */}
          {affiliateInfo.payment_terms && (
            <Card className="p-6">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Payment Terms
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {affiliateInfo.payment_terms}
                </p>
              </div>
            </Card>
          )}

          {/* Info Card */}
          <Card className="p-6 bg-muted/50">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">How affiliate earnings work</p>
                <p className="text-muted-foreground">
                  As an affiliate of {affiliateInfo.businessName}, you'll earn Nexa based on your engagement and the terms set by the business. 
                  Check back regularly to track your earnings.
                </p>
              </div>
            </div>
          </Card>

          {/* Cancel Partnership */}
          <Card className="p-6 border-destructive/50">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-destructive">Cancel Partnership</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  End your affiliate partnership with {affiliateInfo.businessName}. This action cannot be undone.
                </p>
              </div>
              <Button 
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                className="w-full sm:w-auto"
              >
                Cancel Affiliation
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Affiliate Partnership?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your affiliate partnership with {affiliateInfo.businessName}? 
              You'll lose any pending earnings and will need to reapply if you want to become an affiliate again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAffiliation}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel Partnership'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AffiliateDashboard;
