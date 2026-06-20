import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Coins, Star, Clock, Snowflake, Send, TreePine, Gift as GiftIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { SelectRecipientDialog } from './SelectRecipientDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Gift {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  base_xp_cost: number;
  rarity: string;
  season: string | null;
  image_url?: string | null;
  available_until?: string | null;
}

interface SeasonalGiftDetailSheetProps {
  gift: Gift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPrice: number;
  totalSent?: number;
  priceMultiplier?: number;
}

const getRarityConfig = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return {
        gradient: 'from-amber-500 via-yellow-400 to-amber-600',
        glow: 'shadow-[0_0_60px_rgba(245,158,11,0.5)]',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        accent: 'text-amber-400',
        bg: 'from-amber-900/30 to-amber-950/50',
      };
    case 'epic':
      return {
        gradient: 'from-purple-500 via-violet-400 to-purple-600',
        glow: 'shadow-[0_0_50px_rgba(168,85,247,0.5)]',
        badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
        accent: 'text-purple-400',
        bg: 'from-purple-900/30 to-purple-950/50',
      };
    case 'rare':
      return {
        gradient: 'from-blue-500 via-cyan-400 to-blue-600',
        glow: 'shadow-[0_0_40px_rgba(59,130,246,0.4)]',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        accent: 'text-blue-400',
        bg: 'from-blue-900/30 to-blue-950/50',
      };
    case 'uncommon':
      return {
        gradient: 'from-green-500 via-emerald-400 to-green-600',
        glow: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]',
        badge: 'bg-green-500/20 text-green-400 border-green-500/40',
        accent: 'text-green-400',
        bg: 'from-green-900/30 to-green-950/50',
      };
    default:
      return {
        gradient: 'from-muted via-muted/80 to-muted',
        glow: '',
        badge: 'bg-muted text-muted-foreground',
        accent: 'text-muted-foreground',
        bg: 'from-muted/20 to-muted/30',
      };
  }
};

export const SeasonalGiftDetailSheet = ({ 
  gift, 
  open, 
  onOpenChange, 
  currentPrice,
  totalSent = 0,
  priceMultiplier = 1
}: SeasonalGiftDetailSheetProps) => {
  const { user } = useAuth();
  const [userNexa, setUserNexa] = useState(0);
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchUserAcoin();
    }
  }, [user, open]);

  const fetchUserAcoin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('acoin')
      .eq('id', user.id)
      .single();
    if (data) setUserNexa(data.acoin || 0);
  };

  if (!gift) return null;

  const config = getRarityConfig(gift.rarity);

  const handleSendGift = async (recipient: { id: string; name: string }): Promise<void> => {
    if (!user || !gift) {
      throw new Error('User or gift not available');
    }
    
    if (userNexa < currentPrice) {
      toast.error('Insufficient ACoin balance');
      throw new Error('Insufficient balance');
    }

    setSending(true);
    try {
      // Deduct ACoin and create transaction
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ acoin: userNexa - currentPrice })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Create gift transaction
      const { error: giftError } = await supabase
        .from('gift_transactions')
        .insert({
          sender_id: user.id,
          receiver_id: recipient.id,
          gift_id: gift.id,
          xp_cost: currentPrice,
        });

      if (giftError) throw giftError;

      toast.success('🎄 Gift sent successfully!', {
        description: `You sent ${gift.name} to ${recipient.name} for ${currentPrice} ACoin`,
        icon: '🎁',
      });

      await fetchUserAcoin();
      setShowRecipientDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error('Failed to send gift');
      throw error;
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          onOpenChange={onOpenChange}
          className="h-auto max-h-[90vh] overflow-y-auto p-0 rounded-t-3xl border-t-0"
        >
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-b ${config.bg} pointer-events-none`} />
          
          <div className="relative">
            {/* Hero section with gift preview */}
            <div className="relative h-72 flex items-center justify-center overflow-hidden">
              {/* Animated background particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-1.5 h-1.5 rounded-full ${config.accent} opacity-40`}
                    initial={{ 
                      x: Math.random() * 400 - 200,
                      y: Math.random() * 300,
                      scale: 0 
                    }}
                    animate={{ 
                      y: [null, Math.random() * -100 - 50],
                      scale: [0, 1, 0],
                      opacity: [0, 0.6, 0],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      delay: Math.random() * 2,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>

              {/* Gift image with glow */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className={`relative ${config.glow} rounded-3xl`}
              >
                <motion.div 
                  className="relative w-40 h-40 flex items-center justify-center"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {gift.image_url ? (
                    <img 
                      src={gift.image_url} 
                      alt={gift.name}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  ) : (
                    <span className="text-8xl drop-shadow-2xl">{gift.emoji}</span>
                  )}
                </motion.div>
              </motion.div>

              {/* Season badge */}
              {gift.season && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-4 right-4"
                >
                  <Badge className="bg-background/80 backdrop-blur-sm border-border/50 text-foreground gap-1">
                    <Snowflake className="w-3 h-3" />
                    {gift.season}
                  </Badge>
                </motion.div>
              )}
            </div>

            {/* Details section */}
            <div className="relative px-6 pb-8 space-y-6 bg-background rounded-t-3xl -mt-6 pt-6">
              {/* Title and rarity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SheetHeader className="text-left space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <SheetTitle className="text-2xl font-bold text-foreground pr-4">
                      {gift.name}
                    </SheetTitle>
                    <Badge className={`${config.badge} border text-xs px-2 py-1 flex-shrink-0`}>
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {gift.rarity}
                    </Badge>
                  </div>
                  {gift.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {gift.description}
                    </p>
                  )}
                </SheetHeader>
              </motion.div>

              {/* Stats grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                {/* Price card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Coins className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Price</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-yellow-500">
                      {currentPrice.toLocaleString()}
                    </span>
                    <span className="text-sm text-yellow-500/70">ACoin</span>
                  </div>
                  {priceMultiplier !== 1 && (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500 font-medium">
                        {((priceMultiplier - 1) * 100).toFixed(0)}% demand
                      </span>
                    </div>
                  )}
                </div>

                {/* Sent count card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Total Sent</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-foreground">
                      {totalSent.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">times worldwide</p>
                </div>
              </motion.div>

              {/* Time remaining */}
              {gift.available_until && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                  <Clock className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    Limited time offer - Ends {new Date(gift.available_until).toLocaleDateString()}
                  </span>
                </motion.div>
              )}

              {/* Send button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={() => setShowRecipientDialog(true)}
                  disabled={!user || sending}
                  className={`
                    w-full h-14 text-lg font-bold rounded-2xl
                    bg-gradient-to-r ${config.gradient}
                    hover:opacity-90 transition-all duration-300
                    shadow-lg hover:shadow-xl hover:scale-[1.02]
                    disabled:opacity-50 disabled:hover:scale-100
                  `}
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <GiftIcon className="w-5 h-5" />
                      </motion.div>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Send This Gift
                    </span>
                  )}
                </Button>
                
                {user && (
                  <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    Your balance: <Coins className="w-3 h-3 text-yellow-500" />
                    <span className="font-medium text-yellow-500">{userNexa.toLocaleString()} ACoin</span>
                  </p>
                )}
              </motion.div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Recipient selection dialog */}
      <SelectRecipientDialog
        open={showRecipientDialog}
        onOpenChange={setShowRecipientDialog}
        onSelectRecipient={handleSendGift}
      />
    </>
  );
};
