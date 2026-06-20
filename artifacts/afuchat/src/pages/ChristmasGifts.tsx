import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { SEO } from '@/components/SEO';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { SeasonalGiftDetailSheet } from '@/components/gifts/SeasonalGiftDetailSheet';
import { useAllGiftPricing } from '@/hooks/useGiftPricing';
import { Snowflake, Gift, Clock, Sparkles, Star, Coins, Flame, Trophy, Heart, Users, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import real Christmas images
import santaClaus from '@/assets/christmas/santa-claus.png';
import christmasTree from '@/assets/christmas/christmas-tree.png';
import giftBoxImg from '@/assets/gifts/christmas-gift-box.png';
import goldenOrnament from '@/assets/gifts/golden-ornament.png';
import reindeerPlush from '@/assets/gifts/reindeer-plush.png';
import snowflakeOrnament from '@/assets/gifts/snowflake-ornament.png';
import candyCaneTreat from '@/assets/gifts/candy-cane-treat.png';
import santaHat from '@/assets/gifts/santa-hat.png';

// Gift type from database
interface Gift {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  base_xp_cost: number;
  rarity: string;
  season: string | null;
  image_url: string | null;
  available_until: string | null;
}

// Christmas image mapping for gifts
const christmasImages: Record<string, string> = {
  'gift-box': giftBoxImg,
  'golden-ornament': goldenOrnament,
  'reindeer-plush': reindeerPlush,
  'snowflake-crystal': snowflakeOrnament,
  'candy-cane': candyCaneTreat,
  'santa-hat': santaHat,
};

// Get a Christmas image for a gift - always use local Christmas images for this page
const getGiftImage = (_gift: Gift, index: number): string => {
  const images = Object.values(christmasImages);
  return images[index % images.length];
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return 'border-amber-500/50 bg-amber-500/10';
    case 'epic': return 'border-purple-500/50 bg-purple-500/10';
    case 'rare': return 'border-blue-500/50 bg-blue-500/10';
    case 'uncommon': return 'border-green-500/50 bg-green-500/10';
    default: return 'border-border bg-muted/20';
  }
};

const getRarityBadge = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'epic': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    case 'rare': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'uncommon': return 'bg-green-500/20 text-green-400 border-green-500/40';
    default: return 'bg-muted text-muted-foreground';
  }
};

const ChristmasGifts = () => {
  const [loading, setLoading] = useState(true);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [selectedGiftImage, setSelectedGiftImage] = useState<string>('');
  const { pricingMap, getPrice } = useAllGiftPricing();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [stats, setStats] = useState({ totalGifts: 0, totalSent: 0, totalUsers: 0 });
  const [recentGifts, setRecentGifts] = useState<{ senderName: string; giftName: string; receiverName: string }[]>([]);

  useEffect(() => {
    fetchGifts();
    fetchStats();
    fetchRecentGifts();

    // Real-time subscription for live gift updates
    const channel = supabase
      .channel('gift-transactions-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions'
        },
        async (payload) => {
          // Update stats immediately
          setStats(prev => ({
            ...prev,
            totalSent: prev.totalSent + 1
          }));

          // Fetch sender, receiver, and gift info for the live feed
          try {
            const transaction = payload.new as { sender_id: string; receiver_id: string; gift_id: string };
            
            const [senderRes, receiverRes, giftRes] = await Promise.all([
              supabase.from('profiles').select('handle, display_name').eq('id', transaction.sender_id).single(),
              supabase.from('profiles').select('handle, display_name').eq('id', transaction.receiver_id).single(),
              supabase.from('gifts').select('name').eq('id', transaction.gift_id).single()
            ]);

            const senderName = senderRes.data?.display_name || senderRes.data?.handle || 'Someone';
            const receiverName = receiverRes.data?.display_name || receiverRes.data?.handle || 'Someone';
            const giftName = giftRes.data?.name || 'a gift';

            setRecentGifts(prev => [
              { senderName, giftName, receiverName },
              ...prev.slice(0, 4) // Keep only last 5
            ]);
          } catch (error) {
            console.error('Error fetching gift details:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGifts = async () => {
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .limit(12);
      
      if (error) throw error;
      setGifts(data || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentGifts = async () => {
    try {
      const { data, error } = await supabase
        .from('gift_transactions')
        .select(`
          sender_id,
          receiver_id,
          gift_id,
          gifts(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data) {
        const giftsWithNames = await Promise.all(
          data.map(async (t) => {
            const [senderRes, receiverRes] = await Promise.all([
              supabase.from('profiles').select('handle, display_name').eq('id', t.sender_id).single(),
              supabase.from('profiles').select('handle, display_name').eq('id', t.receiver_id).single()
            ]);
            return {
              senderName: senderRes.data?.display_name || senderRes.data?.handle || 'Someone',
              receiverName: receiverRes.data?.display_name || receiverRes.data?.handle || 'Someone',
              giftName: (t.gifts as any)?.name || 'a gift'
            };
          })
        );
        setRecentGifts(giftsWithNames);
      }
    } catch (error) {
      console.error('Error fetching recent gifts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: giftCount } = await supabase
        .from('gifts')
        .select('*', { count: 'exact', head: true });
      
      const { count: transactionCount } = await supabase
        .from('gift_transactions')
        .select('*', { count: 'exact', head: true });
      
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalGifts: giftCount || 150,
        totalSent: transactionCount || 12000,
        totalUsers: userCount || 5200,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const snowflakes = useMemo(() => 
    Array.from({ length: 20 }).map((_, i) => ({
      id: i, 
      left: Math.random() * 100, 
      delay: Math.random() * 8, 
      duration: 12 + Math.random() * 8, 
      size: 14 + Math.random() * 18,
    })), []);

  const christmasLights = useMemo(() => 
    Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      color: ['bg-red-500', 'bg-green-500', 'bg-yellow-400', 'bg-blue-500'][i % 4],
      delay: i * 0.12,
    })), []);

  // Get price for a gift
  const getGiftPrice = (gift: Gift) => {
    const pricing = getPrice(gift.id);
    if (pricing) {
      return Math.floor(pricing.currentPrice);
    }
    return gift.base_xp_cost;
  };

  // Get original price (base cost)
  const getOriginalPrice = (gift: Gift) => {
    return Math.floor(gift.base_xp_cost * 1.25);
  };

  // Handle gift selection with image
  const handleSelectGift = (gift: Gift, index: number) => {
    setSelectedGift({
      ...gift,
      image_url: getGiftImage(gift, index),
    });
    setSelectedGiftImage(getGiftImage(gift, index));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-950/20 to-green-950/20">
      <CustomLoader size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden bg-gradient-to-b from-background via-red-950/5 to-green-950/10">
      <SEO title="Christmas Limited Edition Gifts" description="Exclusive Christmas gifts - limited time only!" />
      
      {/* Snowflakes animation */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {snowflakes.map((f) => (
          <motion.div 
            key={f.id} 
            className="absolute text-white/30" 
            style={{ left: `${f.left}%`, top: -30 }}
            animate={{ y: ['0vh', '110vh'], rotate: [0, 360], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'linear' }}
          >
            <Snowflake size={f.size} />
          </motion.div>
        ))}
      </div>

      {/* Christmas lights string at top */}
      <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="relative h-10 bg-gradient-to-b from-black/30 to-transparent">
          <svg className="absolute top-0 left-0 w-full h-5" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path d="M0,5 Q5,8 10,5 Q15,2 20,5 Q25,8 30,5 Q35,2 40,5 Q45,8 50,5 Q55,2 60,5 Q65,8 70,5 Q75,2 80,5 Q85,8 90,5 Q95,2 100,5" 
                  stroke="#444" strokeWidth="0.4" fill="none" />
          </svg>
          <div className="flex justify-around px-4 pt-4">
            {christmasLights.map((light) => (
              <motion.div
                key={light.id}
                className={`w-2.5 h-3.5 rounded-b-full ${light.color}`}
                animate={{ 
                  opacity: [0.6, 1, 0.6],
                  boxShadow: [
                    '0 0 4px currentColor',
                    '0 0 12px currentColor, 0 0 20px currentColor',
                    '0 0 4px currentColor'
                  ]
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: light.delay, 
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-12">
        <PageHeader title="Christmas Gifts" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 px-4 space-y-6">
        
        {/* Hero Banner */}
        <motion.div 
          className="relative overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-green-800" />
          
          <div className="relative z-10 p-5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src={christmasTree} alt="" className="w-7 h-9" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Christmas Special</h2>
              <img src={christmasTree} alt="" className="w-7 h-9" />
            </div>
            
            <p className="text-white/90 text-sm text-center mb-4">
              Exclusive ACoin Gifts - Limited Time Only!
            </p>
            
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Clock className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-300 text-sm font-semibold">Sale ends in:</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { v: countdown.days, l: 'Days' },
                { v: countdown.hours, l: 'Hrs' },
                { v: countdown.minutes, l: 'Min' },
                { v: countdown.seconds, l: 'Sec' },
              ].map((t, i) => (
                <motion.div 
                  key={i} 
                  className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[50px] border border-white/20"
                  animate={i === 3 ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div className="text-xl sm:text-2xl font-bold text-white tabular-nums text-center">
                    {String(t.v).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-white/70 uppercase tracking-wide text-center">{t.l}</div>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-2 bg-yellow-500/30 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-500/40">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-200 font-bold text-sm">Pay with ACoin</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Gift, value: `${stats.totalGifts}+`, label: 'Gifts', color: 'text-red-400' },
            { icon: Users, value: `${Math.floor(stats.totalUsers / 1000)}K+`, label: 'Buyers', color: 'text-green-400' },
            { icon: Heart, value: stats.totalSent.toLocaleString(), label: 'Sent', color: 'text-pink-400', live: true },
            { icon: Trophy, value: '#1', label: 'Rated', color: 'text-yellow-400' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card/50 backdrop-blur-sm rounded-xl p-2.5 text-center border border-border/50 relative"
            >
              {'live' in stat && stat.live && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
              <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
              <p className="text-sm sm:text-base font-bold">{stat.value}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Live Gift Feed */}
        {recentGifts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/50 backdrop-blur-sm rounded-xl p-3 border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-muted-foreground">Live Activity</span>
            </div>
            <div className="space-y-1.5 max-h-24 overflow-hidden">
              {recentGifts.slice(0, 3).map((gift, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Send className="w-3 h-3 text-green-500" />
                  <span className="text-foreground font-medium truncate max-w-[80px]">{gift.senderName}</span>
                  <span className="text-muted-foreground">sent</span>
                  <span className="text-primary font-medium truncate max-w-[70px]">{gift.giftName}</span>
                  <span className="text-muted-foreground">to</span>
                  <span className="text-foreground font-medium truncate max-w-[80px]">{gift.receiverName}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Featured Gifts Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-base sm:text-lg font-bold">Featured Gifts</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">HOT</Badge>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {gifts.slice(0, 6).map((gift, i) => (
              <motion.div
                key={gift.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                onClick={() => handleSelectGift(gift, i)}
                className={`
                  relative rounded-2xl overflow-hidden cursor-pointer
                  border-2 ${getRarityColor(gift.rarity)}
                  transition-all duration-300 hover:shadow-lg
                `}
              >
                {/* Discount badge */}
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold">
                    -20%
                  </Badge>
                </div>

                {/* Gift image */}
                <div className="p-3 pb-2">
                  <motion.img 
                    src={getGiftImage(gift, i)} 
                    alt={gift.name}
                    className="w-full aspect-square object-contain"
                    whileHover={{ scale: 1.08, rotate: 3 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  />
                </div>

                {/* Gift info */}
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-xs sm:text-sm font-semibold truncate text-center">{gift.name}</p>
                  
                  <Badge className={`${getRarityBadge(gift.rarity)} text-[10px] w-full justify-center border`}>
                    {gift.rarity}
                  </Badge>
                  
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] line-through text-muted-foreground">
                      {getOriginalPrice(gift)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-sm font-bold text-yellow-500">{getGiftPrice(gift)}</span>
                    </div>
                  </div>

                  <Button 
                    size="sm" 
                    className="w-full h-7 text-xs bg-gradient-to-r from-red-500 to-green-600 hover:from-red-600 hover:to-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectGift(gift, i);
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send Gift
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Special Offers Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <h3 className="text-base sm:text-lg font-bold">Special Offers</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 cursor-pointer hover:border-red-400/50 transition-colors"
              onClick={() => gifts[2] && handleSelectGift(gifts[2], 2)}
            >
              <img src={reindeerPlush} alt="Bundle" className="w-14 h-14 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-center">Holiday Bundle</h4>
              <p className="text-[10px] text-muted-foreground text-center mt-1">3 gifts + bonus XP</p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="text-xs line-through text-muted-foreground">2000</span>
                <div className="flex items-center gap-0.5">
                  <Coins className="w-3 h-3 text-green-400" />
                  <span className="text-sm font-bold text-green-400">1500</span>
                </div>
              </div>
            </Card>
            
            <Card 
              className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30 cursor-pointer hover:border-green-400/50 transition-colors"
              onClick={() => gifts[4] && handleSelectGift(gifts[4], 4)}
            >
              <img src={candyCaneTreat} alt="Daily" className="w-14 h-14 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-center">Daily Deal</h4>
              <p className="text-[10px] text-muted-foreground text-center mt-1">Changes every 24h</p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="text-xs line-through text-muted-foreground">500</span>
                <div className="flex items-center gap-0.5">
                  <Coins className="w-3 h-3 text-green-400" />
                  <span className="text-sm font-bold text-green-400">250</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Premium Collection Banner */}
        <motion.div 
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-500/30 cursor-pointer"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => gifts[1] && handleSelectGift(gifts[1], 1)}
        >
          <div className="flex items-center gap-4">
            <motion.img 
              src={goldenOrnament} 
              alt="Premium" 
              className="w-14 h-14"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-amber-400 flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 fill-amber-400 flex-shrink-0" />
                Premium Collection
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Exclusive legendary gifts with rare designs
              </p>
            </div>
            <Badge className="bg-amber-500 text-black font-bold text-xs flex-shrink-0">VIP</Badge>
          </div>
        </motion.div>

        {/* Santa greeting */}
        <motion.div 
          className="p-4 rounded-2xl bg-gradient-to-r from-red-500/15 to-green-500/15 border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <img src={santaClaus} alt="Santa" className="w-14 h-14 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Ho Ho Ho! Merry Christmas!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Spread joy with exclusive holiday gifts. Limited time offers await!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer decorations */}
        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src={giftBoxImg} alt="" className="w-7 h-7 opacity-60" />
            <img src={snowflakeOrnament} alt="" className="w-6 h-6 opacity-60" />
            <img src={santaHat} alt="" className="w-7 h-7 opacity-60" />
            <img src={goldenOrnament} alt="" className="w-6 h-6 opacity-60" />
            <img src={candyCaneTreat} alt="" className="w-7 h-7 opacity-60" />
          </div>
          <p className="text-xs text-muted-foreground">
            Spread holiday cheer with exclusive gifts!
          </p>
        </div>
      </div>

      {/* Gift Detail Sheet */}
      {selectedGift && (
        <SeasonalGiftDetailSheet
          gift={selectedGift}
          open={!!selectedGift}
          onOpenChange={(open) => !open && setSelectedGift(null)}
          currentPrice={getGiftPrice(selectedGift)}
          totalSent={pricingMap[selectedGift.id]?.totalSent || 0}
          priceMultiplier={pricingMap[selectedGift.id]?.multiplier || 1}
        />
      )}
    </div>
  );
};

export default ChristmasGifts;