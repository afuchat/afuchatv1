import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Crown, Check, Coins, Calendar, Sparkles, Gift, Users, Radio, 
  MessageSquare, Image, Ban, Eye, Palette, Shield, Star, Zap, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, XCircle, RefreshCw, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CancelSubscriptionDialog } from '@/components/premium/CancelSubscriptionDialog';
import { PremiumContentSkeleton } from '@/components/skeletons';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  acoin_price: number;
  duration_days: number;
  features: string[];
  grants_verification: boolean;
  tier: string;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  acoin_paid: number;
  subscription_plans?: {
    name: string;
    duration_days: number;
    tier?: string;
  };
}

const tierConfig = {
  silver: {
    gradient: 'from-slate-400 via-slate-300 to-slate-500',
    bgGradient: 'from-slate-500/10 to-slate-600/5',
    glowColor: 'shadow-slate-400/20',
    borderColor: 'border-slate-400/50',
    textColor: 'text-slate-500 dark:text-slate-400',
    accentBg: 'bg-slate-500',
    icon: Shield,
    label: 'Starter',
    ring: 'ring-slate-400/30'
  },
  gold: {
    gradient: 'from-amber-400 via-yellow-300 to-orange-500',
    bgGradient: 'from-amber-500/10 to-yellow-600/5',
    glowColor: 'shadow-amber-400/30',
    borderColor: 'border-amber-400/50',
    textColor: 'text-amber-500 dark:text-amber-400',
    accentBg: 'bg-amber-500',
    icon: Star,
    label: 'Most Popular',
    ring: 'ring-amber-400/30'
  },
  platinum: {
    gradient: 'from-violet-500 via-purple-400 to-fuchsia-500',
    bgGradient: 'from-violet-500/10 to-purple-600/5',
    glowColor: 'shadow-violet-400/30',
    borderColor: 'border-violet-400/50',
    textColor: 'text-violet-500 dark:text-violet-400',
    accentBg: 'bg-violet-500',
    icon: Crown,
    label: 'Ultimate',
    ring: 'ring-violet-400/30'
  }
};

const featureIcons: Record<string, typeof Shield> = {
  'Verified badge': Shield,
  'Ad-free experience': Ban,
  'Pin 1 gift on profile': Gift,
  'Pin 2 gifts on profile': Gift,
  'Pin 3 gifts on profile': Gift,
  '1 red envelope claim per day': Gift,
  '5 red envelope claims per day': Gift,
  'Unlimited red envelope claims': Zap,
  'Create red envelopes': MessageSquare,
  'Basic chat themes': Palette,
  'Custom chat themes': Palette,
  'AI Chat Themes & Wallpapers': Palette,
  'Create stories': Image,
  'Create groups': Users,
  'Create channels': Radio,
  'AI Post Analysis': Sparkles,
  'Gift Marketplace access': Gift,
  'Leaderboard privacy': Eye,
  'AfuAI Chat Assistant': MessageSquare,
  'Priority support': Star
};

// Expandable Features Component
const ExpandableFeatures = ({ 
  features, 
  config, 
  featureIcons 
}: { 
  features: string[]; 
  config: typeof tierConfig.silver; 
  featureIcons: Record<string, typeof Shield>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedFeatures = isExpanded ? features : features.slice(0, 4);
  const hasMoreFeatures = features.length > 4;

  return (
    <div className="mb-6">
      <div className="space-y-2.5">
        {displayedFeatures.map((feature, i) => {
          const FeatureIcon = featureIcons[feature] || Check;
          return (
            <motion.div 
              key={i} 
              initial={i >= 4 ? { opacity: 0, height: 0 } : false}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-3 group/feature"
            >
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} group-hover/feature:scale-110 transition-transform`}>
                <FeatureIcon className={`h-3.5 w-3.5 ${config.textColor}`} />
              </div>
              <span className="text-sm font-medium text-foreground/90">{feature}</span>
            </motion.div>
          );
        })}
      </div>
      
      {hasMoreFeatures && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full mt-3 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all ${config.textColor} bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} hover:opacity-80`}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show All {features.length} Features
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default function Premium() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [acoinBalance, setAcoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [switchToPlan, setSwitchToPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    if (user) {
      fetchPlans();
      fetchUserData();
    }
  }, [user]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('acoin_price', { ascending: true });

    if (!error && data) {
      const parsedPlans = data.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string)
      }));
      setPlans(parsedPlans as SubscriptionPlan[]);
    }
  };

  const fetchUserData = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('acoin')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setAcoinBalance(profileData.acoin || 0);
    }

    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          duration_days,
          tier
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subData) {
      setCurrentSubscription(subData);
    }

    setLoading(false);
  };

  const handlePurchase = async (planId: string, price: number) => {
    if (!user) {
      toast.error('Please sign in to purchase a subscription');
      return;
    }

    if (acoinBalance < price) {
      toast.error(`Insufficient ACoin! You need ${price} ACoin but have ${acoinBalance}`);
      navigate('/wallet');
      return;
    }

    setPurchasing(planId);

    try {
      const { data, error } = await supabase.rpc('purchase_subscription', {
        p_plan_id: planId
      });

      if (error) throw error;

      const result = data as any;

      if (result.success) {
        toast.success(result.message);
        await fetchUserData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase subscription');
    } finally {
      setPurchasing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    try {
      // First cancel any active subscription via secure RPC (no refunds)
      const { data, error } = await supabase.rpc('cancel_active_subscription');

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        toast.error(result?.message || 'Failed to cancel subscription');
        return;
      }

      // If switching to a new plan, purchase it after successful cancel
      if (switchToPlan) {
        await handlePurchase(switchToPlan.id, switchToPlan.acoin_price);
        toast.success(`Switched to ${switchToPlan.name} successfully!`);
      } else {
        toast.success(result.message || 'Subscription cancelled successfully');
      }

      await fetchUserData();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('Failed to process subscription change');
    } finally {
      setCancelDialogOpen(false);
      setSwitchToPlan(null);
    }
  };

  const handleSwitchPlan = (plan: SubscriptionPlan) => {
    if (acoinBalance < plan.acoin_price) {
      toast.error(`Insufficient ACoin! You need ${plan.acoin_price} ACoin but have ${acoinBalance}`);
      navigate('/wallet');
      return;
    }
    setSwitchToPlan(plan);
    setCancelDialogOpen(true);
  };

  if (loading) {
    return <PremiumContentSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title="Premium" 
        icon={<Crown className="h-5 w-5 text-primary" />}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
        
        <div className="relative container max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Upgrade Your Experience</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Choose Your <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">Premium</span> Plan
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Unlock exclusive features, get verified, and elevate your experience
            </p>
          </motion.div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 mb-8 bg-gradient-to-r from-card via-card to-card border border-border/50 backdrop-blur-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                    <div className="relative p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl border border-primary/20">
                      <Coins className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Balance</p>
                    <p className="text-2xl font-bold">{acoinBalance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ACoin</span></p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/wallet')}
                  className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 text-white border-0"
                >
                  <Sparkles className="h-4 w-4" />
                  Get ACoin
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Active Subscription */}
          {currentSubscription && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="p-5 mb-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                
                <div className="relative flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-gradient-to-br from-primary to-violet-500 rounded-2xl shadow-lg shadow-primary/20">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-gradient-to-r from-primary to-violet-500 text-white border-0">Active</Badge>
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        <p className="font-semibold text-lg">
                          {currentSubscription.subscription_plans?.name || 'Premium Plan'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Days Left</p>
                        <p className="text-2xl font-bold text-primary">{getDaysRemaining(currentSubscription.expires_at)}</p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div>
                        <p className="text-muted-foreground text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Expires
                        </p>
                        <p className="font-medium">{formatDate(currentSubscription.expires_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Subscription management buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelDialogOpen(true)}
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel Subscription
                    </Button>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Or switch to a different plan below
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Plans */}
          <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:grid md:grid-cols-3">
            {plans.map((plan, index) => {
              const tier = (plan.tier || 'silver') as keyof typeof tierConfig;
              const config = tierConfig[tier] || tierConfig.silver;
              const TierIcon = config.icon;
              const canAfford = acoinBalance >= plan.acoin_price;
              const hasActiveSubscription = !!currentSubscription;
              const isPopular = tier === 'gold';
              const isPlatinum = tier === 'platinum';

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`snap-center flex-shrink-0 w-[300px] md:w-auto ${isPopular ? 'md:-mt-4 md:mb-4' : ''}`}
                >
                  <div className={`relative ${isPopular ? 'z-10' : ''}`}>
                    {/* Glow effect for popular/platinum */}
                    {(isPopular || isPlatinum) && (
                      <div className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity`} />
                    )}
                    
                    <Card
                      className={`relative overflow-hidden transition-all duration-500 group ${
                        hasActiveSubscription ? 'opacity-60' : 'hover:-translate-y-2'
                      } ${isPopular ? 'border-2 border-amber-400/50 shadow-2xl shadow-amber-500/20' : isPlatinum ? 'border-2 border-violet-400/50 shadow-xl shadow-violet-500/20' : 'border border-border hover:border-slate-400/50 hover:shadow-xl'} bg-card`}
                    >
                      {/* Animated gradient background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient} opacity-50`} />
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      </div>
                      
                      {/* Popular/Best Value ribbon */}
                      {isPopular && (
                        <div className="absolute -right-12 top-8 rotate-45 px-14 py-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-white text-xs font-bold shadow-lg uppercase tracking-wider">
                          Best Value
                        </div>
                      )}
                      
                      {isPlatinum && (
                        <div className="absolute -right-12 top-8 rotate-45 px-14 py-1.5 bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 text-white text-xs font-bold shadow-lg uppercase tracking-wider">
                          Premium
                        </div>
                      )}

                      <div className="relative p-6">
                        {/* Tier icon with glow */}
                        <div className="flex justify-center mb-5">
                          <div className="relative">
                            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-full blur-xl opacity-40 scale-150`} />
                            <div className={`relative p-5 rounded-full bg-gradient-to-br ${config.gradient} shadow-lg`}>
                              <TierIcon className="h-10 w-10 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Plan name */}
                        <div className="text-center mb-4">
                          <h3 className={`text-2xl font-extrabold mb-1 bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                            {plan.name}
                          </h3>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                            {config.label}
                          </p>
                        </div>

                        {/* Price display */}
                        <div className={`relative text-center py-5 mb-5 rounded-2xl bg-gradient-to-br ${config.bgGradient} border ${config.borderColor}`}>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent rounded-2xl" />
                          <div className="relative">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <div className={`p-1.5 rounded-full bg-gradient-to-br ${config.gradient}`}>
                                <Coins className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-4xl font-black tracking-tight">{plan.acoin_price.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              ACoin • {plan.duration_days} days
                            </p>
                          </div>
                        </div>

                        {/* Features list - Expandable */}
                        <ExpandableFeatures 
                          features={plan.features} 
                          config={config} 
                          featureIcons={featureIcons} 
                        />

                        {hasActiveSubscription && currentSubscription?.plan_id !== plan.id ? (
                          <Button
                            onClick={() => handleSwitchPlan(plan)}
                            disabled={!canAfford || purchasing === plan.id}
                            className={`w-full h-12 text-base font-bold bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white border-0 shadow-lg transition-all duration-300 rounded-xl ${
                              canAfford ? 'hover:shadow-xl hover:scale-[1.02]' : ''
                            }`}
                          >
                            {purchasing === plan.id ? (
                              <div className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                Processing...
                              </div>
                            ) : !canAfford ? (
                              'Insufficient ACoin'
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Switch to {plan.name}
                              </span>
                            )}
                          </Button>
                        ) : hasActiveSubscription && currentSubscription?.plan_id === plan.id ? (
                          <Button
                            disabled
                            className={`w-full h-12 text-base font-bold bg-gradient-to-r ${config.gradient} text-white border-0 shadow-lg rounded-xl opacity-60`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Your Current Plan
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handlePurchase(plan.id, plan.acoin_price)}
                            disabled={!canAfford || purchasing === plan.id}
                            className={`w-full h-12 text-base font-bold bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white border-0 shadow-lg transition-all duration-300 rounded-xl ${
                              canAfford ? 'hover:shadow-xl hover:scale-[1.02]' : ''
                            }`}
                          >
                            {purchasing === plan.id ? (
                              <div className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                Processing...
                              </div>
                            ) : !canAfford ? (
                              'Insufficient ACoin'
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                Get {plan.name}
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            )}
                          </Button>
                        )}

                        {!canAfford && !hasActiveSubscription && (
                          <p className="text-xs text-center text-muted-foreground mt-3">
                            Need <span className={`font-bold ${config.textColor}`}>{(plan.acoin_price - acoinBalance).toLocaleString()}</span> more ACoin
                          </p>
                        )}
                      </div>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-8 text-muted-foreground"
          >
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span>Instant Activation</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Verified Badge</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Cancel/Switch Subscription Dialog */}
      {currentSubscription && (
        <CancelSubscriptionDialog
          open={cancelDialogOpen}
          onOpenChange={(open) => {
            setCancelDialogOpen(open);
            if (!open) setSwitchToPlan(null);
          }}
          onConfirm={handleCancelSubscription}
          planName={currentSubscription.subscription_plans?.name || 'Premium'}
          expiresAt={currentSubscription.expires_at}
          isChangingPlan={!!switchToPlan}
          newPlanName={switchToPlan?.name}
        />
      )}
    </div>
  );
}
