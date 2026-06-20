import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch user's posting patterns and interests for personalized generation
async function fetchUserInteractions(supabase: any, userId: string) {
  try {
    // Get user's recent posts for style analysis
    const { data: userPosts } = await supabase
      .from('posts')
      .select('content, created_at, view_count')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, bio, country, current_grade, xp')
      .eq('id', userId)
      .single();

    // Get posts user has engaged with (liked/acknowledged)
    const { data: likedPosts } = await supabase
      .from('post_acknowledgments')
      .select('post_id, posts(content)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    // Get user's replies for conversation style
    const { data: userReplies } = await supabase
      .from('post_replies')
      .select('content, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);

    // Get hashtags/topics user frequently uses
    const allContent = [
      ...(userPosts?.map((p: any) => p.content) || []),
      ...(userReplies?.map((r: any) => r.content) || [])
    ].join(' ');

    // Extract common words/topics (simple frequency analysis)
    const words = allContent.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      if (!['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'what', 'when', 'where', 'which', 'would', 'could', 'should', 'there', 'about'].includes(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    const topTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Analyze posting style
    const avgPostLength = userPosts?.length 
      ? userPosts.reduce((sum: number, p: any) => sum + p.content.length, 0) / userPosts.length 
      : 150;
    
    const usesEmojis = userPosts?.some((p: any) => /[\u{1F300}-\u{1F9FF}]/u.test(p.content)) || false;
    const usesHashtags = userPosts?.some((p: any) => /#\w+/.test(p.content)) || false;

    return {
      profile,
      recentPosts: userPosts?.slice(0, 5) || [],
      likedContent: likedPosts?.map((l: any) => l.posts?.content).filter(Boolean).slice(0, 10) || [],
      topTopics,
      style: {
        avgLength: Math.round(avgPostLength),
        usesEmojis,
        usesHashtags,
        postCount: userPosts?.length || 0
      }
    };
  } catch (error) {
    console.error('Error fetching user interactions:', error);
    return null;
  }
}

// Get trending topics on platform
async function fetchTrendingContext(supabase: any) {
  try {
    // Get recent popular posts
    const { data: trendingPosts } = await supabase
      .from('posts')
      .select('content, view_count')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('view_count', { ascending: false })
      .limit(10);

    return {
      trendingPosts: trendingPosts?.map((p: any) => p.content.substring(0, 100)) || []
    };
  } catch (error) {
    console.error('Error fetching trending context:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');
    
    const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader! } },
      auth: { persistSession: false }
    });
    
    const jwt = authHeader?.replace('Bearer ', '');
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check premium subscription
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false }
    });

    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('is_active, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required', requiresPremium: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', userId);

    const { topic, tone, length, mode }: { topic: string; tone: string; length: string; mode?: string } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch user's interaction history for personalization
    console.log('Fetching user interactions for personalization...');
    const [userInteractions, trendingContext] = await Promise.all([
      fetchUserInteractions(supabaseAdmin, userId),
      fetchTrendingContext(supabaseAdmin)
    ]);

    const tonePrompts: Record<string, string> = {
      casual: 'casual and friendly',
      professional: 'professional and informative',
      funny: 'humorous and entertaining',
      inspiring: 'motivational and uplifting',
    };

    const lengthLimits: Record<string, string> = {
      short: '50-100 characters',
      medium: '100-200 characters',
      long: '200-280 characters',
    };

    const selectedTone = tonePrompts[tone] || 'casual and friendly';
    const selectedLength = lengthLimits[length] || 'medium';

    // Build personalized system prompt based on user's history
    let personalizationContext = '';
    
    if (userInteractions) {
      personalizationContext = `
USER CONTEXT (for personalization):
- Display Name: ${userInteractions.profile?.display_name || 'User'}
- Bio: ${userInteractions.profile?.bio || 'Not set'}
- Grade: ${userInteractions.profile?.current_grade || 'Newcomer'}
- Total Posts: ${userInteractions.style.postCount}
- Average Post Length: ${userInteractions.style.avgLength} chars
- Uses Emojis: ${userInteractions.style.usesEmojis ? 'Yes' : 'Rarely'}
- Uses Hashtags: ${userInteractions.style.usesHashtags ? 'Yes' : 'Rarely'}

USER'S FREQUENT TOPICS: ${userInteractions.topTopics.join(', ') || 'Various'}

USER'S RECENT POSTS (for style reference):
${userInteractions.recentPosts.slice(0, 3).map((p: any, i: number) => `${i + 1}. "${p.content.substring(0, 100)}..."`).join('\n') || 'No recent posts'}

CONTENT USER ENGAGES WITH:
${userInteractions.likedContent.slice(0, 5).map((c: string, i: number) => `${i + 1}. "${c?.substring(0, 80)}..."`).join('\n') || 'Various content'}
`;
    }

    let trendingInfo = '';
    if (trendingContext?.trendingPosts?.length) {
      trendingInfo = `
CURRENTLY TRENDING ON AFUCHAT:
${trendingContext.trendingPosts.slice(0, 5).map((p: string, i: number) => `${i + 1}. "${p}..."`).join('\n')}
`;
    }

    // Different modes for AI assistance
    let modeInstructions = '';
    if (mode === 'improve') {
      modeInstructions = `
MODE: IMPROVE
The user has written a draft and wants you to improve it. Keep the core message but:
- Make it more engaging
- Fix any grammar/spelling
- Optimize for engagement
- Match their usual posting style
- Stay within 280 characters
`;
    } else if (mode === 'suggest') {
      modeInstructions = `
MODE: SUGGEST IDEAS
Based on the topic, provide 3 different post ideas the user could write about.
Format: Return just one post suggestion that's ready to use.
`;
    } else if (mode === 'complete') {
      modeInstructions = `
MODE: COMPLETE
The user started a post and wants you to complete it naturally.
Continue from where they left off, matching their tone and style.
`;
    } else {
      modeInstructions = `
MODE: GENERATE
Create a completely new post based on the topic.
`;
    }

    const systemPrompt = `You are AfuAI, an AI assistant for AfuChat social platform. You help users write engaging posts.

${personalizationContext}
${trendingInfo}
${modeInstructions}

RULES:
1. Keep posts within 280 characters MAX
2. Match the user's natural writing style when possible
3. ${userInteractions?.style.usesEmojis ? 'Include relevant emojis' : 'Use emojis sparingly'}
4. ${userInteractions?.style.usesHashtags ? 'Include 1-2 relevant hashtags' : 'Skip hashtags unless relevant'}
5. Topic: ${topic}
6. Tone: ${selectedTone}
7. Length: ${selectedLength}

Write ONLY the post content, no quotes, no explanations, no extra formatting.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mode === 'improve' || mode === 'complete' 
            ? `${mode === 'improve' ? 'Improve this post' : 'Complete this post'}: "${topic}"`
            : `Write a ${selectedTone} post about: ${topic}` 
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from Lovable AI');
    }
    
    const generatedPost = data.choices[0].message.content.trim();

    // Award XP for using AI
    await supabaseClient.rpc('award_xp', {
      p_user_id: userId,
      p_action_type: 'use_ai',
      p_xp_amount: 5,
      p_metadata: { action: 'generate_post', topic, mode: mode || 'generate' }
    });

    // Ensure it's within 280 characters
    const finalPost = generatedPost.length > 280 
      ? generatedPost.substring(0, 277) + '...' 
      : generatedPost;

    return new Response(JSON.stringify({ post: finalPost }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-post:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
