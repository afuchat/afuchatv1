import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get current date/time info for real-time awareness
function getCurrentDateTimeInfo() {
  const now = new Date();
  const eatOffset = 3 * 60;
  const eatDate = new Date(now.getTime() + eatOffset * 60 * 1000);
  const eatHour = eatDate.getUTCHours();
  const eatMinute = eatDate.getUTCMinutes();
  const eatTimeFormatted = `${eatHour.toString().padStart(2, '0')}:${eatMinute.toString().padStart(2, '0')}`;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayOfWeek = days[eatDate.getUTCDay()];
  const month = months[eatDate.getUTCMonth()];
  const dayOfMonth = eatDate.getUTCDate();
  const year = eatDate.getUTCFullYear();
  
  let timeOfDay = 'night';
  if (eatHour >= 5 && eatHour < 12) timeOfDay = 'morning';
  else if (eatHour >= 12 && eatHour < 17) timeOfDay = 'afternoon';
  else if (eatHour >= 17 && eatHour < 21) timeOfDay = 'evening';
  
  return {
    eatTime: eatTimeFormatted,
    dayOfWeek,
    month,
    dayOfMonth,
    year,
    fullDate: `${dayOfWeek}, ${month} ${dayOfMonth}, ${year}`,
    timeOfDay,
  };
}

// Fetch recent messages from the chat for context
async function fetchChatContext(supabase: any, chatId: string, limit: number = 10) {
  try {
    const { data: messages } = await supabase
      .from('messages')
      .select(`
        encrypted_content,
        sent_at,
        profiles(display_name, handle)
      `)
      .eq('chat_id', chatId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    return messages?.reverse() || [];
  } catch (error) {
    console.error('Error fetching chat context:', error);
    return [];
  }
}

// Fetch chat info
async function fetchChatInfo(supabase: any, chatId: string) {
  try {
    const { data: chat } = await supabase
      .from('chats')
      .select('name, description, is_group, is_channel')
      .eq('id', chatId)
      .single();

    return chat;
  } catch (error) {
    console.error('Error fetching chat info:', error);
    return null;
  }
}

// Build system prompt for group/channel context
function buildGroupSystemPrompt(chatInfo: any, chatContext: any[], dateTime: any) {
  const chatType = chatInfo?.is_channel ? 'channel' : 'group';
  const chatName = chatInfo?.name || 'Unknown';
  const chatDescription = chatInfo?.description || 'No description';

  const recentMessages = chatContext.length > 0 
    ? chatContext.map((msg: any) => {
        const sender = msg.profiles?.display_name || 'Unknown';
        return `${sender}: ${msg.encrypted_content}`;
      }).join('\n')
    : 'No recent messages';

  return `You are AfuAI, the AI assistant for AfuChat platform. You have been mentioned in a ${chatType} called "${chatName}".

📅 CURRENT DATE & TIME:
- Date: ${dateTime.fullDate}
- Time: ${dateTime.eatTime} EAT (East Africa Time)
- Time of Day: ${dateTime.timeOfDay}

📱 ${chatType.toUpperCase()} CONTEXT:
- Name: ${chatName}
- Description: ${chatDescription}

💬 RECENT CONVERSATION:
${recentMessages}

YOUR ROLE IN GROUPS/CHANNELS:
- You are a helpful AI assistant available to all premium users
- Answer questions, provide information, and help with discussions
- Be concise and relevant to the conversation context
- You can analyze messages, summarize discussions, and provide insights
- Be friendly and engage naturally with the conversation
- If you don't know something specific to the group, say so
- Keep responses short and chat-friendly (under 280 characters when possible)

RESPONSE STYLE:
- Be concise and chat-appropriate
- Use emojis sparingly
- Don't include page paths (this isn't the main AfuAI chat)
- Reference the conversation context when relevant
- Be helpful and friendly`;
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
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = user.id;

    // Use service role for full data access
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false }
    });

    // Check premium subscription - required for group/channel AI
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('is_active, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required to use AfuAI in groups/channels', requiresPremium: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, chatId } = await req.json();
    
    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Chat ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch context
    console.log('Fetching group/channel context for AI reply');
    const [chatInfo, chatContext] = await Promise.all([
      fetchChatInfo(supabaseAdmin, chatId),
      fetchChatContext(supabaseAdmin, chatId, 15)
    ]);

    const dateTime = getCurrentDateTimeInfo();
    const systemPrompt = buildGroupSystemPrompt(chatInfo, chatContext, dateTime);

    // Remove @AfuAI mention from message for cleaner processing
    const cleanMessage = message.replace(/@afuai/gi, '').trim();

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: cleanMessage || 'Hello!' }
    ];

    console.log('Calling Lovable AI for group/channel reply');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service unavailable. Please try again later.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from Lovable AI');
    }
    
    const reply = data.choices[0].message.content;

    // Award XP for using AI in groups
    await supabaseAdmin.rpc('award_xp', {
      p_user_id: userId,
      p_action_type: 'use_ai',
      p_xp_amount: 3,
      p_metadata: { action: 'afuai_group_reply', chat_id: chatId }
    });

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in afuai-group-reply:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
