import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch comprehensive context for the reply
async function fetchReplyContext(supabase: any, postId: string, mentioningUserId: string | null, triggerReplyId: string | null) {
  try {
    // Get the post with author details
    const { data: post } = await supabase
      .from('posts')
      .select(`
        id, content, created_at, view_count,
        author:profiles!posts_author_id_fkey(id, display_name, handle, bio, xp, current_grade, is_verified)
      `)
      .eq('id', postId)
      .single();

    // Get all replies on this post for context
    const { data: replies } = await supabase
      .from('post_replies')
      .select(`
        id, content, created_at, parent_reply_id,
        author:profiles!post_replies_author_id_fkey(display_name, handle)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Get the specific trigger reply if it exists (the comment that tagged @afuai)
    let triggerReply = null;
    if (triggerReplyId) {
      const { data: replyData } = await supabase
        .from('post_replies')
        .select(`
          id, content, created_at, parent_reply_id,
          author:profiles!post_replies_author_id_fkey(display_name, handle)
        `)
        .eq('id', triggerReplyId)
        .single();
      triggerReply = replyData;
    }

    // Get mentioning user's profile if available
    let mentioningUser = null;
    if (mentioningUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, handle, bio, xp, current_grade, is_verified, country')
        .eq('id', mentioningUserId)
        .single();
      mentioningUser = profile;
    }

    // Get post engagement stats
    const { count: likeCount } = await supabase
      .from('post_acknowledgments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const { count: replyCount } = await supabase
      .from('post_replies')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return {
      post,
      replies,
      triggerReply,
      mentioningUser,
      engagement: {
        likes: likeCount || 0,
        replies: replyCount || 0,
        views: post?.view_count || 0
      }
    };
  } catch (error) {
    console.error('Error fetching reply context:', error);
    return null;
  }
}

// Build context-aware system prompt
function buildReplySystemPrompt(context: any, isReplyingToComment: boolean) {
  const postInfo = context?.post ? `
POST CONTEXT:
- Author: @${context.post.author?.handle || 'unknown'} (${context.post.author?.display_name || 'User'})
- Author Grade: ${context.post.author?.current_grade || 'Newcomer'}
- Author Verified: ${context.post.author?.is_verified ? 'Yes' : 'No'}
- Post Content: "${context.post.content}"
- Views: ${context.post.view_count}
- Likes: ${context.engagement?.likes || 0}
- Replies: ${context.engagement?.replies || 0}
` : '';

  const mentioningUserInfo = context?.mentioningUser ? `
USER WHO MENTIONED YOU:
- Name: ${context.mentioningUser.display_name}
- Username: @${context.mentioningUser.handle}
- Grade: ${context.mentioningUser.current_grade || 'Newcomer'}
- Nexa Balance: ${context.mentioningUser.xp}
- Verified: ${context.mentioningUser.is_verified ? 'Yes' : 'No'}
- Country: ${context.mentioningUser.country || 'Unknown'}
` : '';

  const triggerReplyInfo = context?.triggerReply ? `
THE COMMENT THAT TAGGED YOU:
- Author: @${context.triggerReply.author?.handle || 'unknown'}
- Content: "${context.triggerReply.content}"
- This is ${context.triggerReply.parent_reply_id ? 'a reply to another comment' : 'a direct reply to the post'}
` : '';

  const conversationContext = context?.replies?.length > 0 ? `
CONVERSATION THREAD (recent replies):
${context.replies.slice(-5).map((r: any) => `@${r.author?.handle || 'user'}: "${r.content.substring(0, 100)}"`).join('\n')}
` : '';

  const replyBehavior = isReplyingToComment 
    ? `You are replying DIRECTLY to the comment that mentioned you, NOT to the original post. Address the commenter's question/statement specifically.`
    : `You are replying to the original post that mentioned you.`;

  return `You are AfuAI, the exclusive AI assistant for AfuChat social platform. You have FULL ACCESS to platform and user data.

${postInfo}
${mentioningUserInfo}
${triggerReplyInfo}
${conversationContext}

IMPORTANT: ${replyBehavior}

AFUCHAT PLATFORM KNOWLEDGE:
- Nexa (XP): Platform currency earned through engagement
- ACoin: Premium currency for subscriptions
- Grades: Newcomer → Beginner → Active Chatter → Community Builder → Elite Creator → Legend
- Premium subscribers get verified badge and AI access
- Users can send gifts, create moments/stories, play games

RESPONSE GUIDELINES:
- Keep replies under 200 characters (platform limit)
- Be helpful, friendly, and contextually aware
- Reference the comment content or user when relevant
- Use emojis sparingly for engagement
- Provide actionable advice when asked questions
- If asked about AfuChat features, explain clearly`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, replyContent, originalPostContent, triggerReplyId } = await req.json();
    
    // Input validation
    if (!postId || typeof postId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Post ID is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!replyContent || typeof replyContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Reply content is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (replyContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Reply content cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (replyContent.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Reply content must be less than 2000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the user who mentioned AfuAI to check premium status
    let mentioningUserId: string | null = null;
    let parentReplyId: string | null = null;
    
    if (triggerReplyId) {
      const { data: replyData } = await supabase
        .from('post_replies')
        .select('author_id, parent_reply_id')
        .eq('id', triggerReplyId)
        .single();
      mentioningUserId = replyData?.author_id || null;
      // The AI should reply to the comment that tagged it, so parentReplyId is the triggerReplyId
      parentReplyId = triggerReplyId;
    }

    // Check premium subscription for the mentioning user
    if (mentioningUserId) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('is_active, expires_at')
        .eq('user_id', mentioningUserId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ error: 'Premium subscription required to use AI mentions', requiresPremium: true }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch comprehensive context for the reply
    console.log('Fetching reply context for post:', postId, 'triggerReply:', triggerReplyId);
    const context = await fetchReplyContext(supabase, postId, mentioningUserId, triggerReplyId);

    // Determine if we're replying to a comment or the original post
    const isReplyingToComment = !!triggerReplyId;

    // Get or create AfuAI user profile
    let afuAiProfileId: string;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', 'afuai')
      .single();

    if (existingProfile) {
      afuAiProfileId = existingProfile.id;
    } else {
      console.log('Creating AfuAI profile...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          display_name: 'AfuAI',
          handle: 'afuai',
          bio: '🤖 AI Assistant for AfuChat - Here to help with everything!',
          is_verified: true,
        })
        .select('id')
        .single();
      
      if (createError || !newProfile) {
        console.error('Failed to create AfuAI profile:', createError);
        throw createError || new Error('Failed to create AfuAI profile');
      }
      afuAiProfileId = newProfile.id;
    }

    // Build context-aware system prompt
    const systemPrompt = buildReplySystemPrompt(context, isReplyingToComment);

    const userPrompt = `User's mention/question: "${replyContent}"

${originalPostContent && originalPostContent !== replyContent ? `Original post they're referencing: "${originalPostContent}"` : ''}

Please provide a helpful, contextually aware response. Keep it under 200 characters.`;

    console.log('Calling Lovable AI with full context, isReplyingToComment:', isReplyingToComment);

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
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

    const aiData = await response.json();
    
    if (!aiData.choices || !aiData.choices[0]?.message?.content) {
      throw new Error('Invalid response from Lovable AI');
    }
    
    let aiReply = aiData.choices[0].message.content;
    
    // Ensure reply is within character limit
    if (aiReply.length > 280) {
      aiReply = aiReply.substring(0, 277) + '...';
    }

    // Award XP to the user who used AI
    if (mentioningUserId) {
      await supabase.rpc('award_xp', {
        p_user_id: mentioningUserId,
        p_action_type: 'use_ai',
        p_xp_amount: 5,
        p_metadata: { action: 'ai_reply', post_id: postId }
      });
    }

    // Post AI reply - CRITICAL: Use parent_reply_id to reply to the exact comment
    console.log('Posting AI reply with parent_reply_id:', parentReplyId);
    const { error: replyError } = await supabase
      .from('post_replies')
      .insert({
        post_id: postId,
        author_id: afuAiProfileId,
        content: aiReply,
        parent_reply_id: parentReplyId, // This makes the AI reply to the exact comment
      });

    if (replyError) {
      console.error('Failed to post AI reply:', replyError);
      throw replyError;
    }

    console.log('AfuAI reply posted successfully as a reply to:', parentReplyId || 'original post');

    return new Response(JSON.stringify({ success: true, reply: aiReply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in afu-ai-reply:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
