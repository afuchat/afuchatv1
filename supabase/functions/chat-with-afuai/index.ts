import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchUserContext(supabase: any, userId: string) {
  try {
    const [profileRes, followerRes, followingRes, subscriptionRes, earningsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('user_subscriptions').select('*, subscription_plans(name, tier)').eq('user_id', userId).eq('is_active', true).gt('expires_at', new Date().toISOString()).single(),
      supabase.from('creator_earnings').select('*').eq('user_id', userId).order('earned_date', { ascending: false }).limit(5)
    ]);
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data: weeklyPosts } = await supabase.from('posts').select('view_count').eq('author_id', userId).gte('created_at', oneWeekAgo.toISOString());
    
    let groupMentions: any[] = [];
    const handle = profileRes.data?.handle;
    if (handle) {
      const { data: mentions } = await supabase.from('messages').select('content, chat_id, created_at').ilike('content', `%@${handle}%`).neq('sender_id', userId).order('created_at', { ascending: false }).limit(5);
      if (mentions?.length) {
        const chatIds = [...new Set(mentions.map((m: any) => m.chat_id))];
        const { data: chats } = await supabase.from('chats').select('id, name, is_group').in('id', chatIds).eq('is_group', true);
        groupMentions = mentions.filter((m: any) => chats?.some((c: any) => c.id === m.chat_id)).map((m: any) => ({
          chat: chats?.find((c: any) => c.id === m.chat_id)?.name || 'Group',
          preview: m.content.substring(0, 80), time: m.created_at
        }));
      }
    }
    return {
      profile: profileRes.data, followerCount: followerRes.count || 0, followingCount: followingRes.count || 0,
      subscription: subscriptionRes.data, creatorEarnings: earningsRes.data,
      weeklyViews: weeklyPosts?.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0) || 0,
      groupMentions
    };
  } catch (e) { return null; }
}

async function fetchPlatformData(supabase: any, userId: string) {
  try {
    const [totalUsersRes, activeUsersRes, trendingUsersRes, recentPostsRes, userConnectionsRes, followedByRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', new Date(Date.now() - 7*24*60*60*1000).toISOString()),
      supabase.from('profiles').select('id, display_name, handle, is_verified, is_admin, xp, current_grade, bio, country').order('xp', { ascending: false }).limit(25),
      supabase.from('posts').select('id, content, view_count, likes_count, author_id, created_at, profiles!posts_author_id_fkey(display_name, handle, is_verified)').order('created_at', { ascending: false }).limit(15),
      supabase.from('follows').select('following_id, profiles!follows_following_id_fkey(id, display_name, handle, is_verified, bio, current_grade)').eq('follower_id', userId).limit(30),
      supabase.from('follows').select('follower_id, profiles!follows_follower_id_fkey(id, display_name, handle, is_verified, current_grade)').eq('following_id', userId).limit(30),
    ]);
    return {
      totalUsers: totalUsersRes.count || 0, activeUsers: activeUsersRes.count || 0,
      topUsers: trendingUsersRes.data || [], recentPosts: recentPostsRes.data || [],
      following: userConnectionsRes.data?.map((f: any) => f.profiles).filter(Boolean) || [],
      followers: followedByRes.data?.map((f: any) => f.profiles).filter(Boolean) || [],
    };
  } catch (e) { return null; }
}

async function fetchUserMemories(supabase: any, userId: string) {
  try {
    await supabase.from('ai_memories').delete().eq('user_id', userId).lt('expires_at', new Date().toISOString());
    const { data } = await supabase.from('ai_memories').select('content, memory_type').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    return data || [];
  } catch (e) { return []; }
}

async function storeMemories(supabase: any, userId: string, userMessage: string) {
  try {
    const memories: any[] = [];
    const patterns = [/i (?:like|love|enjoy) (.+?)(?:\.|$)/gi, /my (?:favorite|fav) (?:is|are) (.+?)(?:\.|$)/gi];
    for (const p of patterns) { for (const m of userMessage.matchAll(p)) { if (m[1] && m[1].length < 150) memories.push({ user_id: userId, memory_type: 'preference', content: m[1].trim(), expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString() }); } }
    if (userMessage.length > 20) memories.push({ user_id: userId, memory_type: 'conversation', content: `Asked: "${userMessage.substring(0, 100)}"`, expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString() });
    if (memories.length > 0) await supabase.from('ai_memories').insert(memories);
  } catch (e) {}
}

async function performWebSearch(query: string): Promise<string> {
  // Try Firecrawl first, fallback to YOU API
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (firecrawlKey) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 5 }),
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.data || data.results || [];
        if (results.length > 0) {
          return results.slice(0, 5).map((r: any, i: number) => `${i+1}. **${r.title || r.url}**: ${(r.description || r.markdown || '').substring(0, 200)}`).join('\n');
        }
      }
    } catch (e) { console.error('Firecrawl search error:', e); }
  }
  // Fallback to YOU API
  const youKey = Deno.env.get('YOU_API_KEY');
  if (youKey) {
    try {
      const url = new URL('https://api.ydc-index.io/search');
      url.searchParams.append('query', query);
      const res = await fetch(url.toString(), { headers: { 'X-API-Key': youKey } });
      if (res.ok) {
        const data = await res.json();
        return data.hits?.slice(0, 4).map((h: any, i: number) => `${i+1}. **${h.title}**: ${h.description?.substring(0,150) || ''}`).join('\n') || '';
      }
    } catch (e) {}
  }
  return '';
}

function needsWebSearch(msg: string): boolean {
  return /what('s| is) (?:the )?(?:latest|current|recent)|search|look up|find|latest news|current events|trending|happening now|weather|price of/i.test(msg);
}

function getDateTime() {
  const now = new Date();
  const eat = new Date(now.getTime() + 3*60*60*1000);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const h = eat.getUTCHours();
  return {
    date: `${days[eat.getUTCDay()]}, ${eat.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    time: `${h.toString().padStart(2,'0')}:${eat.getUTCMinutes().toString().padStart(2,'0')} EAT`,
    isEarning: h >= 8 && h < 20, isWeekend: eat.getUTCDay() === 0 || eat.getUTCDay() === 6,
    greeting: h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'
  };
}

function buildPrompt(user: any, memories: any[], dt: any, platform: any) {
  const p = user?.profile;
  const accountAge = p?.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
  const ageText = accountAge === 0 ? 'today' : accountAge < 30 ? `${accountAge} days ago` : accountAge < 365 ? `${Math.floor(accountAge/30)} months ago` : `${Math.floor(accountAge/365)} years ago`;
  const isUganda = p?.country?.toLowerCase() === 'uganda' || p?.country?.toLowerCase() === 'ug';
  const isEligible = isUganda && (user?.followerCount >= 10) && (user?.weeklyViews >= (p?.is_admin ? 50 : 500));

  const userInfo = p ? `\nUSER: ${p.display_name} (@${p.handle}) | Joined: ${ageText} | Country: ${p.country || 'Unknown'}\nNexa: ${p.xp} | ACoin: ${p.acoin || 0} | Balance: ${p.available_balance_ugx || 0} UGX | Grade: ${p.current_grade || 'Newcomer'} | Streak: ${p.login_streak || 0}d\nVerified: ${p.is_verified ? 'Yes' : 'No'} | Premium: ${user?.subscription ? 'Yes' : 'No'} | Admin: ${p.is_admin ? 'Yes' : 'No'}\nFollowers: ${user?.followerCount} | Following: ${user?.followingCount} | Weekly Views: ${user?.weeklyViews}\nCreator Eligible: ${isEligible ? 'Yes' : 'No'}` : '';

  const memInfo = memories.length > 0 ? `\nMEMORIES: ${memories.slice(0,10).map(m => m.content).join(' | ')}` : '';
  const mentionInfo = user?.groupMentions?.length > 0 ? `\nGROUP MENTIONS: ${user.groupMentions.map((m: any) => `${m.chat} - "${m.preview}"`).join(' | ')}` : '';

  let platformInfo = '';
  if (platform) {
    platformInfo += `\n\nPLATFORM: ${platform.totalUsers} users | ${platform.activeUsers} active this week`;
    if (platform.topUsers?.length > 0) platformInfo += `\nTOP USERS: ${platform.topUsers.slice(0, 15).map((u: any) => `@${u.handle}${u.is_verified ? '✓' : ''} (${u.current_grade || 'New'})`).join(', ')}`;
    if (platform.following?.length > 0) platformInfo += `\nFOLLOWS: ${platform.following.slice(0, 15).map((u: any) => `@${u.handle}`).join(', ')}`;
    if (platform.followers?.length > 0) platformInfo += `\nFANS: ${platform.followers.slice(0, 15).map((u: any) => `@${u.handle}`).join(', ')}`;
    if (platform.recentPosts?.length > 0) platformInfo += `\nRECENT: ${platform.recentPosts.slice(0, 8).map((post: any) => `@${post.profiles?.handle}: "${post.content?.substring(0, 60)}"`).join(' | ')}`;
  }

  return `You are AfuAI — the most powerful AI assistant on AfuChat. You have deep access to real platform data. You can search the web with Firecrawl, read aloud with ElevenLabs voice, and connect to Slack. NEVER fabricate data — use only what's provided.

TOOLS AVAILABLE:
- 🔍 Web Search (Firecrawl): Real-time web search when user asks about current events, news, prices, etc.
- 🗣️ Voice (ElevenLabs): Text-to-speech capability for reading messages aloud
- 💬 Slack: Send messages to connected Slack workspaces
- 📊 Platform Analytics: Full access to AfuChat user data, posts, and statistics

CURRENT: ${dt.date}, ${dt.time} | Earnings: ${dt.isEarning ? 'ACTIVE' : 'CLOSED'}
${userInfo}${memInfo}${mentionInfo}${platformInfo}

KEY FEATURES: Wallet: /wallet | Premium: /premium | Gifts: /gifts | Creator Earnings: /creator-earnings | Shop: /shop | Games: /games
Premium tiers: Silver, Gold, Platinum | Creator: Uganda only, 10+ followers, ${p?.is_admin ? '50' : '500'}+ weekly views
Nexa to ACoin: 100:1 (5.99% fee) | Withdrawals: Weekends (admins anytime)

DATA RULES: Only reference users from provided lists. If unknown, say so. Use @handle format. Use real stats.

POSTING: Ask clarifying questions first (type, tone, topic, style). Then: [POST_ACTION]{"content":"text","auto_publish":false}[/POST_ACTION]

PERSONALITY: Be warm, knowledgeable, proactive. Greet with "Good ${dt.greeting}!" on first message. Use their name. Reference memories. Inform about unread mentions. Keep responses concise but thorough.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const jwt = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: sub } = await admin.from('user_subscriptions').select('is_active').eq('user_id', user.id).eq('is_active', true).gt('expires_at', new Date().toISOString()).single();
    if (!sub) return new Response(JSON.stringify({ error: 'Premium required', requiresPremium: true }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { message, history, webSearchMode, model } = await req.json();
    if (!message || typeof message !== 'string' || !message.trim()) return new Response(JSON.stringify({ error: 'Message required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (message.length > 3000) return new Response(JSON.stringify({ error: 'Message too long' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('API key missing');

    const [userContext, memories, platformData] = await Promise.all([
      fetchUserContext(admin, user.id), fetchUserMemories(admin, user.id), fetchPlatformData(admin, user.id)
    ]);

    let webResults = '';
    if (webSearchMode === true || (webSearchMode !== false && needsWebSearch(message))) {
      webResults = await performWebSearch(message);
    }

    const dt = getDateTime();
    const systemPrompt = buildPrompt(userContext, memories, dt, platformData);
    const allowedModels = ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5-mini', 'openai/gpt-5-nano'];
    const modelToUse = allowedModels.includes(model) ? model : 'google/gemini-3-flash-preview';

    const msgs: any[] = [{ role: 'system', content: systemPrompt }];
    if (history && Array.isArray(history)) {
      for (const m of history.slice(-30)) {
        if (m.role && m.content && ['user', 'assistant'].includes(m.role)) msgs.push({ role: m.role, content: m.content.substring(0, 3000) });
      }
    }

    let enhancedMsg = message;
    if (webResults) enhancedMsg = `${message}\n\n🔍 WEB RESULTS:\n${webResults}\n\nUse above to answer.`;
    msgs.push({ role: 'user', content: enhancedMsg });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelToUse, messages: msgs, max_tokens: 4096 }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI error:', response.status, err);
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limited, try again shortly' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits depleted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error('Invalid AI response');

    const thought = [
      `User: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`,
      userContext?.profile ? `Checking @${userContext.profile.handle}'s data...` : null,
      platformData ? `Loaded ${platformData.totalUsers} users, ${platformData.recentPosts?.length || 0} posts` : null,
      webResults ? '🔍 Web search via Firecrawl completed.' : null,
      memories.length > 0 ? `Retrieved ${memories.length} memories.` : null,
      'Generating response...'
    ].filter(Boolean).join('\n');

    storeMemories(admin, user.id, message);
    admin.rpc('award_xp', { p_user_id: user.id, p_action_type: 'use_ai', p_xp_amount: 5, p_metadata: { action: 'afuai' } });

    return new Response(JSON.stringify({ reply, thought }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
