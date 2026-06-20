import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, Users } from 'lucide-react';

interface TipStatsProps {
  userId: string;
}

export const TipStats = ({ userId }: TipStatsProps) => {
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalSent: 0,
    tipCount: 0,
  });

  useEffect(() => {
    fetchTipStats();
  }, [userId]);

  const fetchTipStats = async () => {
    try {
      // Get tips received
      const { data: received, error: receivedError } = await supabase
        .from('tips')
        .select('xp_amount')
        .eq('receiver_id', userId);

      if (receivedError) throw receivedError;

      // Get tips sent
      const { data: sent, error: sentError } = await supabase
        .from('tips')
        .select('xp_amount')
        .eq('sender_id', userId);

      if (sentError) throw sentError;

      const totalReceived = received?.reduce((sum, tip) => sum + tip.xp_amount, 0) || 0;
      const totalSent = sent?.reduce((sum, tip) => sum + tip.xp_amount, 0) || 0;
      const tipCount = received?.length || 0;

      setStats({
        totalReceived,
        totalSent,
        tipCount,
      });
    } catch (error) {
      console.error('Error fetching tip stats:', error);
    }
  };

  if (stats.totalReceived === 0 && stats.totalSent === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Tipping Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.totalReceived > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm">Tips Received</span>
            </div>
            <Badge variant="outline" className="gap-1">
              <Coins className="w-3 h-3" />
              {stats.totalReceived} Nexa
            </Badge>
          </div>
        )}
        
        {stats.tipCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Tips Count</span>
            </div>
            <Badge variant="outline">
              {stats.tipCount}
            </Badge>
          </div>
        )}

        {stats.totalSent > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Tips Given</span>
            </div>
            <Badge variant="outline" className="gap-1">
              <Coins className="w-3 h-3" />
              {stats.totalSent} Nexa
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
