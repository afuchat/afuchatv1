import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, Gift, CheckCircle, Crown, AlertTriangle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const ReferralSystem = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string>('');
  const [userHandle, setUserHandle] = useState<string>('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    if (user) {
      generateReferralCode();
      fetchReferrals();
      fetchHandle();
    }
  }, [user]);

  const generateReferralCode = () => {
    if (user) {
      const code = `${user.id.replace(/-/g, '').substring(0, 12).toUpperCase()}`;
      setReferralCode(code);
    }
  };

  const fetchHandle = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('handle').eq('id', user.id).maybeSingle();
    if (data?.handle) setUserHandle(data.handle);
  };

  const fetchReferrals = async () => {
    if (!user) return;

    try {
      // First get referrals
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (referralError) throw referralError;

      if (referralData && referralData.length > 0) {
        // Fetch profile data for referred users
        const referredIds = referralData.map(r => r.referred_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, handle')
          .in('id', referredIds);

        // Merge profile data with referrals
        const mergedData = referralData.map(referral => ({
          ...referral,
          profile: profilesData?.find(p => p.id === referral.referred_id)
        }));

        setReferrals(mergedData);
        const rewardedCount = mergedData.filter((r) => r.rewarded).length;
        setTotalXP(rewardedCount * 500);
      } else {
        setReferrals([]);
        setTotalXP(0);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const getReferralLink = () => {
    if (userHandle) return `${window.location.origin}/${userHandle}`;
    return `${window.location.origin}/auth/signup?ref=${referralCode}`;
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(getReferralLink());
    toast.success('Referral link copied!', {
      description: 'Your friend gets 1 week free Premium and you earn 500 Nexa!',
    });
  };

  const shareReferralLink = async () => {
    const link = getReferralLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join AfuChat!',
          text: 'Join AfuChat using my referral link and get 1 week free Premium!',
          url: link,
        });
      } catch (error) {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Invite Friends
        </CardTitle>
        <CardDescription>
          Earn 500 Nexa for each friend who signs up. Your friend gets 1 week free Premium!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unique Referral Code Display */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Your Unique Referral Code</div>
          <div className="text-lg font-mono font-bold text-primary">{referralCode}</div>
        </div>

        {/* Referral Link Section */}
        <div className="flex gap-2">
          <Input
            value={getReferralLink()}
            readOnly
            className="flex-1 text-xs"
          />
          <Button onClick={copyReferralLink} size="icon" variant="outline">
            <Copy className="h-4 w-4" />
          </Button>
          <Button onClick={shareReferralLink} size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-2xl font-bold">{referrals.length}</div>
            <div className="text-xs text-muted-foreground">Total Referrals</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-primary">{totalXP} Nexa</div>
            <div className="text-xs text-muted-foreground">Earned from Referrals</div>
          </Card>
        </div>

        {/* Referral List */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Your Referrals ({referrals.length})</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        @{referral.profile?.handle || 'User'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {referral.rewarded ? (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3" />
                      +500 Nexa
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      Pending
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards Info */}
        <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Rewards:</strong> When a friend signs up with your link, they get 1 week free Premium and you earn 500 Nexa! Premium includes verified badge, ad-free experience, and exclusive features.
          </div>
        </div>

        {/* Terms & Conditions */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="terms" className="border-none">
            <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Referral Terms & Conditions
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-xs text-muted-foreground space-y-2 p-3 bg-muted/30 rounded-lg">
                <p><strong>1. Eligibility:</strong> Rewards are only given for genuine new user sign-ups who complete their profile.</p>
                <p><strong>2. No Fake Referrals:</strong> We do not pay rewards for fake accounts, self-referrals, bot sign-ups, or any fraudulent activity. Violators will be banned.</p>
                <p><strong>3. Verification:</strong> All referrals are verified before rewards are distributed. We reserve the right to reject suspicious referrals.</p>
                <p><strong>4. Changes:</strong> AfuChat reserves the right to modify, suspend, or terminate the referral program and its rewards at any time without prior notice.</p>
                <p><strong>5. Limits:</strong> There is no limit to how many friends you can refer, but rewards are only given once per unique user.</p>
                <p><strong>6. Non-Transferable:</strong> Referral rewards are non-transferable and cannot be exchanged for cash.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
