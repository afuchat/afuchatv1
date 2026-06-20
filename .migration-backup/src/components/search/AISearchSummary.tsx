import { useState } from 'react';
import { Sparkles, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface AISearchSummaryProps {
  query: string;
  resultsCount: number;
}

export const AISearchSummary = ({ query, resultsCount }: AISearchSummaryProps) => {
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateSummary = async () => {
    if (!isPremium) {
      toast.error('AI Search Summary is a premium feature');
      navigate('/premium');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: {
          message: `Provide a brief, helpful 2-3 sentence overview about "${query}" based on what people typically discuss about this topic on social platforms. Be informative and conversational.`,
          context: 'search_summary'
        }
      });

      if (error) throw error;
      setSummary(data?.reply || 'Unable to generate summary');
      setExpanded(true);
    } catch (error) {
      console.error('AI Summary error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  if (!query.trim()) return null;

  return (
    <div className="mx-4 my-3">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 overflow-hidden">
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => summary && setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AfuAI Insights</p>
              <p className="text-xs text-muted-foreground">
                {resultsCount} results for "{query}"
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isPremium && (
              <div className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                <Crown className="h-3 w-3" />
                <span>Premium</span>
              </div>
            )}
            {summary && (
              expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {(expanded || !summary) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <CustomLoader size="sm" />
                  </div>
                ) : summary ? (
                  <p className="text-sm text-foreground/90 leading-relaxed bg-background/50 rounded-lg p-3">
                    {summary}
                  </p>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateSummary}
                    className="w-full justify-center gap-2 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Sparkles className="h-4 w-4" />
                    Get AI Summary
                    {!isPremium && <Crown className="h-3 w-3 text-amber-500" />}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
