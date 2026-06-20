import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Gift, Sparkles, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReferralWelcomeBannerProps {
  referrerName?: string;
  onClose: () => void;
}

export const ReferralWelcomeBanner = ({ referrerName, onClose }: ReferralWelcomeBannerProps) => {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="mx-auto mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Gift className="w-10 h-10 text-white" />
            </div>
          </motion.div>
          <DialogTitle className="text-2xl font-bold">Welcome to AfuChat! 🎉</DialogTitle>
          <DialogDescription className="text-base">
            {referrerName 
              ? `You were invited by ${referrerName}!`
              : 'You joined via a referral link!'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">1 Week Free Premium!</h4>
                <p className="text-sm text-muted-foreground">
                  Enjoy all premium features for free
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <h5 className="font-medium text-sm text-muted-foreground">Your Premium Benefits:</h5>
            <ul className="space-y-2 text-sm">
              {[
                'Verified badge on your profile',
                'Ad-free experience',
                'AI-powered features',
                'Exclusive chat themes',
                'Priority support',
              ].map((benefit, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <Button onClick={handleClose} className="w-full">
          Start Exploring
        </Button>
      </DialogContent>
    </Dialog>
  );
};
