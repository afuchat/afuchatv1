import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserData {
  profile: any;
  posts: any[];
  replies: any[];
  acknowledgments: any[];
  followers: any[];
  following: any[];
  messages: any[];
  tips_sent: any[];
  tips_received: any[];
  gifts_sent: any[];
  gifts_received: any[];
  achievements: any[];
  activity_log: any[];
  game_scores: any[];
  shop_purchases: any[];
  export_date: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[export-user-data] Processing request...');

    // Create Supabase client with the user's token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[export-user-data] No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[export-user-data] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[export-user-data] Exporting data for user:', user.id);

    const userData: UserData = {
      profile: null,
      posts: [],
      replies: [],
      acknowledgments: [],
      followers: [],
      following: [],
      messages: [],
      tips_sent: [],
      tips_received: [],
      gifts_sent: [],
      gifts_received: [],
      achievements: [],
      activity_log: [],
      game_scores: [],
      shop_purchases: [],
      export_date: new Date().toISOString(),
    };

    // Fetch profile data
    console.log('[export-user-data] Fetching profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!profileError && profile) {
      userData.profile = profile;
    }

    // Fetch posts
    console.log('[export-user-data] Fetching posts...');
    const { data: posts } = await supabase
      .from('posts')
      .select('*, post_images(*), post_link_previews(*)')
      .eq('author_id', user.id);
    
    if (posts) userData.posts = posts;

    // Fetch replies
    console.log('[export-user-data] Fetching replies...');
    const { data: replies } = await supabase
      .from('post_replies')
      .select('*')
      .eq('author_id', user.id);
    
    if (replies) userData.replies = replies;

    // Fetch acknowledgments (likes)
    console.log('[export-user-data] Fetching acknowledgments...');
    const { data: acknowledgments } = await supabase
      .from('post_acknowledgments')
      .select('*, posts(content, created_at)')
      .eq('user_id', user.id);
    
    if (acknowledgments) userData.acknowledgments = acknowledgments;

    // Fetch followers
    console.log('[export-user-data] Fetching followers...');
    const { data: followers } = await supabase
      .from('follows')
      .select('*, profiles!follows_follower_id_fkey(display_name, handle)')
      .eq('following_id', user.id);
    
    if (followers) userData.followers = followers;

    // Fetch following
    console.log('[export-user-data] Fetching following...');
    const { data: following } = await supabase
      .from('follows')
      .select('*, profiles!follows_following_id_fkey(display_name, handle)')
      .eq('follower_id', user.id);
    
    if (following) userData.following = following;

    // Fetch messages (only from chats where user is a member)
    console.log('[export-user-data] Fetching messages...');
    const { data: chatMemberships } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', user.id);
    
    if (chatMemberships) {
      const chatIds = chatMemberships.map(cm => cm.chat_id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, encrypted_content, sent_at, sender_id, chat_id')
        .in('chat_id', chatIds)
        .eq('sender_id', user.id);
      
      if (messages) userData.messages = messages;
    }

    // Fetch tips sent
    console.log('[export-user-data] Fetching tips sent...');
    const { data: tipsSent } = await supabase
      .from('tips')
      .select('*, profiles!tips_receiver_id_fkey(display_name, handle)')
      .eq('sender_id', user.id);
    
    if (tipsSent) userData.tips_sent = tipsSent;

    // Fetch tips received
    console.log('[export-user-data] Fetching tips received...');
    const { data: tipsReceived } = await supabase
      .from('tips')
      .select('*, profiles!tips_sender_id_fkey(display_name, handle)')
      .eq('receiver_id', user.id);
    
    if (tipsReceived) userData.tips_received = tipsReceived;

    // Fetch gifts sent
    console.log('[export-user-data] Fetching gifts sent...');
    const { data: giftsSent } = await supabase
      .from('gift_transactions')
      .select('*, gifts(name, emoji), profiles!gift_transactions_receiver_id_fkey(display_name, handle)')
      .eq('sender_id', user.id);
    
    if (giftsSent) userData.gifts_sent = giftsSent;

    // Fetch gifts received
    console.log('[export-user-data] Fetching gifts received...');
    const { data: giftsReceived } = await supabase
      .from('gift_transactions')
      .select('*, gifts(name, emoji), profiles!gift_transactions_sender_id_fkey(display_name, handle)')
      .eq('receiver_id', user.id);
    
    if (giftsReceived) userData.gifts_received = giftsReceived;

    // Fetch achievements
    console.log('[export-user-data] Fetching achievements...');
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id);
    
    if (achievements) userData.achievements = achievements;

    // Fetch activity log
    console.log('[export-user-data] Fetching activity log...');
    const { data: activityLog } = await supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000); // Limit to last 1000 activities
    
    if (activityLog) userData.activity_log = activityLog;

    // Fetch game scores
    console.log('[export-user-data] Fetching game scores...');
    const { data: gameScores } = await supabase
      .from('game_scores')
      .select('*')
      .eq('user_id', user.id);
    
    if (gameScores) userData.game_scores = gameScores;

    // Fetch shop purchases
    console.log('[export-user-data] Fetching shop purchases...');
    const { data: shopPurchases } = await supabase
      .from('user_shop_purchases')
      .select('*, shop_items(name, item_type)')
      .eq('user_id', user.id);
    
    if (shopPurchases) userData.shop_purchases = shopPurchases;

    console.log('[export-user-data] Data export complete');

    // Return the data as JSON
    return new Response(
      JSON.stringify(userData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="afuchat-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error) {
    console.error('[export-user-data] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
