import { useState, useEffect, useRef } from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import { CustomLoader } from '@/components/ui/CustomLoader';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { motion } from 'framer-motion';
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
  const [shouldShow, setShouldShow] = useState(false);
  const checkedRef = useRef(false);
  const mountedRef = useRef(true);
  const generatingRef = useRef(false);

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
    
    // Auto-generate summary if worth summarizing
    if (worthSummarizing) {
      checkAndGenerateSummary();
    }
  }, [hasAccess, postId]);

  const checkAndGenerateSummary = async () => {
    // Check for cached summary first
    const { data: existingSummary } = await supabase
      .from('post_ai_summaries')
      .select('summary')
      .eq('post_id', postId)
      .maybeSingle();
    
    if (existingSummary?.summary && mountedRef.current) {
      setSummary(existingSummary.summary);
      return;
    }

    // Auto-generate if no cached summary exists
    if (!generatingRef.current) {
      generateSummary();
    }
  };

  const generateSummary = async () => {
    if (loading || summary || generatingRef.current) return;
    
    generatingRef.current = true;
    setLoading(true);
    
    try {
      // Prepare clean content (strip HTML, limit length)
      const cleanContent = postContent
        .replace(/<[^>]*>/g, '')
        .substring(0, 1200)
        .trim();

      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: {
          message: `Analyze this social media post and provide a single-sentence professional insight or key takeaway. Format it as a brief, actionable tip starting with a verb (e.g., "Consider...", "Note that...", "Key point:"). Be concise and factual, not explanatory:\n\n"${cleanContent}"`,
          context: 'post_summary'
        }
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          console.warn('Rate limited for AI summary');
        }
        throw error;
      }
      
      let generatedSummary = data?.reply || null;
      
      // Clean up the summary - remove quotes if present
      if (generatedSummary) {
        generatedSummary = generatedSummary
          .replace(/^["']|["']$/g, '')
          .replace(/^Summary:\s*/i, '')
          .replace(/^Key takeaway:\s*/i, '')
          .trim();
      }
      
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
      generatingRef.current = false;
    }
  };

  if (!hasAccess || !shouldShow) return null;

  // Show loading state or summary inline - no user interaction needed
  if (loading) {
    return (
      <div className="mt-2 mx-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/5 to-transparent rounded-lg">
          <CustomLoader size="sm" />
          <span className="text-xs text-muted-foreground">Generating insight...</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <motion.div 
      className="mt-2 mx-0"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-2 px-3 py-2.5 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent rounded-lg border border-amber-500/20">
        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90 leading-relaxed font-medium">
          {summary}
        </p>
      </div>
    </motion.div>
  );
};
