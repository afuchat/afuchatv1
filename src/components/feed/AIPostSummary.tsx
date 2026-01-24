import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import { categorizeContent, ContentCategory } from '@/lib/contentCategorization';

interface AIPostSummaryProps {
  postContent: string;
  postId: string;
}

// Categories that are worth summarizing
const SUMMARY_WORTHY_CATEGORIES: ContentCategory[] = ['news', 'technology', 'politics', 'business', 'sports'];
const MIN_CONFIDENCE_THRESHOLD = 40;
const MIN_CONTENT_LENGTH = 200;

const isWorthSummarizing = (content: string): boolean => {
  if (content.length < MIN_CONTENT_LENGTH) return false;
  
  const categories = categorizeContent(content);
  
  if (categories.length > 0) {
    const topCategory = categories[0];
    if (SUMMARY_WORTHY_CATEGORIES.includes(topCategory.category) && 
        topCategory.confidence >= MIN_CONFIDENCE_THRESHOLD) {
      return true;
    }
  }
  
  const informativePatterns = [
    /breaking:/i, /announced/i, /according to/i, /research shows/i,
    /study finds/i, /experts say/i, /official/i, /report/i,
    /update:/i, /important:/i, /\d+%/, /million|billion/i,
    /government/i, /launched/i, /released/i,
  ];
  
  const matchCount = informativePatterns.filter(pattern => pattern.test(content)).length;
  return matchCount >= 2;
};

export const AIPostSummary = ({ postContent, postId }: AIPostSummaryProps) => {
  const { canUseAIPostAnalysis } = useSubscription();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const checkedRef = useRef(false);
  const mountedRef = useRef(true);

  const hasAccess = canUseAIPostAnalysis();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!hasAccess || checkedRef.current) return;
    checkedRef.current = true;
    
    const worthSummarizing = isWorthSummarizing(postContent);
    setShouldShow(worthSummarizing);
    
    // Check for cached summary only (don't auto-generate)
    if (worthSummarizing) {
      checkCachedSummary();
    }
  }, [hasAccess, postId]);

  const checkCachedSummary = async () => {
    const { data: existingSummary } = await supabase
      .from('post_ai_summaries')
      .select('summary')
      .eq('post_id', postId)
      .maybeSingle();
    
    if (existingSummary?.summary && mountedRef.current) {
      setSummary(existingSummary.summary);
    }
  };

  const handleGenerateSummary = async () => {
    if (loading || summary) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: {
          message: `Summarize this social media post in 1-2 concise sentences. Focus on the main point or message:\n\n"${postContent}"`,
          context: 'post_summary'
        }
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          console.warn('Rate limited, please try again later');
        }
        throw error;
      }
      
      const generatedSummary = data?.reply || null;
      
      if (generatedSummary && mountedRef.current) {
        setSummary(generatedSummary);
        
        // Cache in database
        await supabase
          .from('post_ai_summaries')
          .upsert({ post_id: postId, summary: generatedSummary }, { onConflict: 'post_id' });
      }
    } catch (error) {
      console.error('AI Summary error:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  if (!hasAccess || !shouldShow) return null;

  return (
    <div 
      className="mt-2 mx-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg border border-primary/20 overflow-hidden">
        <div 
          className="flex items-center justify-between px-3 py-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (summary) setExpanded(!expanded);
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">AfuAI Summary</span>
          </div>
          
          {summary && (
            expanded ? 
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : 
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2">
                {loading ? (
                  <div className="flex items-center justify-center py-2">
                    <CustomLoader size="sm" />
                  </div>
                ) : summary ? (
                  <p className="text-xs text-foreground/90 leading-relaxed bg-background/50 rounded p-2">
                    {summary}
                  </p>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateSummary();
                    }}
                    className="w-full py-2 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Tap to generate summary
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
