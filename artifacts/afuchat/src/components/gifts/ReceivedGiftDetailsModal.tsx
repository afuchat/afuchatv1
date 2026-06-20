import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Award, TrendingUp, Users, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GiftImage } from './GiftImage';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { extractText } from '@/lib/textUtils';

interface ReceivedGiftDetailsModalProps {
  gift: {
    id: string;
    xp_cost: number;
    message: string | null;
    created_at: string;
    sender: {
      display_name: string;
      handle: string;
    };
    gift: {
      name: string;
      emoji: string;
      rarity: string;
      description?: string;
      base_xp_cost?: number;
    };
  };
  currentPrice: number;
  totalSent: number;
  priceMultiplier: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReceivedGiftDetailsModal = ({
  gift,
  currentPrice,
  totalSent,
  priceMultiplier,
  open,
  onOpenChange,
}: ReceivedGiftDetailsModalProps) => {
  const { t } = useTranslation();

  // Mock price history data based on multiplier
  const baseCost = gift.gift.base_xp_cost || gift.xp_cost;
  const priceHistory = [
    { time: '7d ago', price: baseCost },
    { time: '5d ago', price: Math.ceil(baseCost * 1.1) },
    { time: '3d ago', price: Math.ceil(baseCost * (priceMultiplier - 0.05)) },
    { time: 'Now', price: currentPrice },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'hsl(var(--chart-1))';
      case 'epic': return 'hsl(var(--chart-2))';
      case 'rare': return 'hsl(var(--chart-3))';
      case 'uncommon': return 'hsl(var(--chart-4))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0 rounded-t-3xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-center text-xl font-bold truncate">{extractText(gift.gift.name)}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Gift Display */}
          <div className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg">
            <GiftImage
              giftId={gift.id}
              giftName={extractText(gift.gift.name)}
              emoji={extractText(gift.gift.emoji)}
              rarity={gift.gift.rarity}
              size="lg"
            />
            <Badge 
              className="text-xs font-semibold"
              style={{ backgroundColor: getRarityColor(gift.gift.rarity) }}
            >
              <Award className="h-3 w-3 mr-1" />
              {gift.gift.rarity.toUpperCase()}
            </Badge>
          </div>

          {/* Sender Info */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {t('common.from')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${gift.sender.handle}`} />
                <AvatarFallback className="text-sm">{gift.sender.display_name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold text-foreground">{gift.sender.display_name}</div>
                <div className="text-xs text-muted-foreground">@{gift.sender.handle}</div>
              </div>
            </div>
            {gift.message && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-sm text-foreground italic">"{gift.message}"</p>
              </div>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              {format(new Date(gift.created_at), 'PPpp')}
            </div>
          </div>

          {/* Description */}
          {gift.gift.description && (
            <p className="text-sm text-muted-foreground text-center px-2">
              {extractText(gift.gift.description)}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {t('gifts.currentPrice')}
                </span>
              </div>
              <div className="text-base font-bold text-primary">{currentPrice} Nexa</div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-3 w-3 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">
                  {t('gifts.popularity')}
                </span>
              </div>
              <div className="text-base font-bold text-foreground">{totalSent}</div>
            </div>
          </div>

          {/* Value Badge */}
          <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 rounded-lg p-3 border border-primary/20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Value Received</div>
            <div className="text-lg font-bold text-foreground">{gift.xp_cost} Nexa</div>
          </div>

          {/* Price History Chart */}
          <div className="bg-muted/20 rounded-lg p-3">
            <h4 className="text-xs font-semibold mb-3 text-center">{t('gifts.priceHistory')}</h4>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
