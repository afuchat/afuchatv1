import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Shield, 
  Zap,
  Award,
  Briefcase
} from 'lucide-react';

interface BusinessBenefitsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BusinessBenefitsSheet = ({ open, onOpenChange }: BusinessBenefitsSheetProps) => {
  const benefits = [
    {
      icon: Briefcase,
      title: 'Verified Business Badge',
      description: 'Display your official business badge across the platform',
      color: 'text-blue-600'
    },
    {
      icon: Users,
      title: 'Affiliate Program',
      description: 'Build and manage your own affiliate network to grow your reach',
      color: 'text-purple-600'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Access detailed insights and performance metrics for your business',
      color: 'text-green-600'
    },
    {
      icon: TrendingUp,
      title: 'Priority Visibility',
      description: 'Enhanced visibility in search results and recommendations',
      color: 'text-orange-600'
    },
    {
      icon: Shield,
      title: 'Enhanced Trust',
      description: 'Build credibility with verified business status and badges',
      color: 'text-indigo-600'
    },
    {
      icon: Zap,
      title: 'Business Dashboard',
      description: 'Dedicated dashboard to manage all business operations',
      color: 'text-yellow-600'
    },
    {
      icon: Award,
      title: 'Custom Branding',
      description: 'Showcase your business category and professional information',
      color: 'text-pink-600'
    },
    {
      icon: CheckCircle,
      title: 'Unlimited Features',
      description: 'Access all premium features and priority support',
      color: 'text-cyan-600'
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[85vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <SheetTitle className="text-2xl font-bold">Business Account Benefits</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-center">
            Unlock powerful tools and features to grow your business on the platform
          </SheetDescription>
        </SheetHeader>
        
        <div className="overflow-y-auto max-h-[calc(85vh-8rem)] scrollbar-hide">
          <div className="space-y-3 pb-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/20 transition-colors"
                >
                  <div className={`p-2 rounded-lg bg-background border border-border/50 ${benefit.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-blue-600 text-white">
                Premium Feature
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Business accounts get access to all these benefits and more. Upgrade your account to start leveraging these powerful tools for your business growth.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};