import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[delete-user-account] Processing request...');

    // Create Supabase client with the user's token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[delete-user-account] No authorization header');
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
      console.error('[delete-user-account] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for admin deletion
    let targetUserId = user.id;
    let body: { userId?: string } = {};
    
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON, use authenticated user's ID
    }

    // If a userId is provided, check if the caller is an admin
    if (body.userId && body.userId !== user.id) {
      // Create admin client to check admin status
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      // Check if the calling user is an admin using the has_role function
      const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError) {
        console.error('[delete-user-account] Error checking admin role:', roleError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify admin status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!isAdmin) {
        console.error('[delete-user-account] Non-admin attempted to delete another user');
        return new Response(
          JSON.stringify({ error: 'Admin privileges required to delete other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetUserId = body.userId;
      console.log('[delete-user-account] Admin deleting user:', targetUserId);
    }

    console.log('[delete-user-account] Deleting account for user:', targetUserId);

    // Use admin client for all delete operations to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Helper function to safely delete from a table (ignores errors for non-existent tables)
    const safeDelete = async (table: string, column: string, value: string) => {
      try {
        const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
        if (error && !error.message.includes('does not exist')) {
          console.log(`[delete-user-account] Note: ${table}.${column} delete: ${error.message}`);
        }
      } catch (e) {
        console.log(`[delete-user-account] Table ${table} might not exist, skipping...`);
      }
    };

    // Delete user data in order (to respect foreign key constraints)
    console.log('[delete-user-account] Starting data cleanup...');

    // Message-related data
    await safeDelete('message_reactions', 'user_id', targetUserId);
    await safeDelete('message_status', 'user_id', targetUserId);
    await safeDelete('message_views', 'viewer_id', targetUserId);
    await safeDelete('message_reports', 'reporter_id', targetUserId);
    await safeDelete('messages', 'sender_id', targetUserId);
    await safeDelete('messages', 'user_id', targetUserId);
    await safeDelete('typing_indicators', 'user_id', targetUserId);

    // Chat organization data
    await safeDelete('chat_folder_assignments', 'user_id', targetUserId);
    await safeDelete('chat_folders', 'user_id', targetUserId);
    await safeDelete('chat_label_assignments', 'user_id', targetUserId);
    await safeDelete('chat_labels', 'user_id', targetUserId);
    await safeDelete('chat_preferences', 'user_id', targetUserId);
    await safeDelete('chat_members', 'user_id', targetUserId);
    await safeDelete('merchant_customer_chats', 'customer_id', targetUserId);
    await safeDelete('chats', 'created_by', targetUserId);
    await safeDelete('chats', 'user_id', targetUserId);

    // Post-related data - get post IDs first
    const { data: userPosts } = await supabaseAdmin.from('posts').select('id').eq('author_id', targetUserId);
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map(p => p.id);
      for (const postId of postIds) {
        await safeDelete('post_images', 'post_id', postId);
        await safeDelete('post_link_previews', 'post_id', postId);
        await safeDelete('post_views', 'post_id', postId);
        await safeDelete('post_replies', 'post_id', postId);
        await safeDelete('post_acknowledgments', 'post_id', postId);
      }
    }
    await safeDelete('post_acknowledgments', 'user_id', targetUserId);
    await safeDelete('post_replies', 'author_id', targetUserId);
    await safeDelete('post_views', 'viewer_id', targetUserId);
    await safeDelete('posts', 'author_id', targetUserId);

    // Follow-related data
    await safeDelete('follow_requests', 'requester_id', targetUserId);
    await safeDelete('follow_requests', 'target_id', targetUserId);
    await safeDelete('follows', 'follower_id', targetUserId);
    await safeDelete('follows', 'following_id', targetUserId);
    await safeDelete('blocked_users', 'blocker_id', targetUserId);
    await safeDelete('blocked_users', 'blocked_id', targetUserId);

    // Tips and gifts
    await safeDelete('tips', 'sender_id', targetUserId);
    await safeDelete('tips', 'receiver_id', targetUserId);
    await safeDelete('gift_transactions', 'sender_id', targetUserId);
    await safeDelete('gift_transactions', 'receiver_id', targetUserId);
    await safeDelete('pinned_gifts', 'user_id', targetUserId);

    // Red envelopes
    await safeDelete('red_envelope_claims', 'claimer_id', targetUserId);
    await safeDelete('red_envelopes', 'sender_id', targetUserId);

    // Game data
    await safeDelete('game_scores', 'user_id', targetUserId);
    await safeDelete('game_sessions', 'player_id', targetUserId);
    await safeDelete('game_challenges', 'challenger_id', targetUserId);
    await safeDelete('game_challenges', 'opponent_id', targetUserId);
    await safeDelete('game_challenges', 'winner_id', targetUserId);
    await safeDelete('game_rooms', 'host_id', targetUserId);
    await safeDelete('game_rooms', 'guest_id', targetUserId);
    await safeDelete('game_rooms', 'winner_id', targetUserId);

    // Shop and marketplace data
    await safeDelete('shopping_cart', 'user_id', targetUserId);
    await safeDelete('marketplace_listings', 'user_id', targetUserId);
    await safeDelete('user_shop_purchases', 'user_id', targetUserId);
    await safeDelete('bids', 'user_id', targetUserId);
    await safeDelete('merchant_orders', 'buyer_id', targetUserId);
    await safeDelete('merchants', 'user_id', targetUserId);

    // Notifications
    await safeDelete('notifications', 'user_id', targetUserId);
    await safeDelete('notifications', 'actor_id', targetUserId);
    await safeDelete('notification_preferences', 'user_id', targetUserId);

    // User achievements and activity
    await safeDelete('user_achievements', 'user_id', targetUserId);
    await safeDelete('user_activity_log', 'user_id', targetUserId);

    // Financial data
    await safeDelete('acoin_transactions', 'user_id', targetUserId);
    await safeDelete('xp_transfers', 'sender_id', targetUserId);
    await safeDelete('xp_transfers', 'receiver_id', targetUserId);
    await safeDelete('creator_earnings', 'user_id', targetUserId);
    await safeDelete('creator_withdrawals', 'user_id', targetUserId);

    // Referrals
    await safeDelete('referrals', 'referrer_id', targetUserId);
    await safeDelete('referrals', 'referred_id', targetUserId);

    // Subscriptions and premium
    await safeDelete('user_subscriptions', 'user_id', targetUserId);
    await safeDelete('push_subscriptions', 'user_id', targetUserId);

    // Security and sessions
    await safeDelete('security_alerts', 'user_id', targetUserId);
    await safeDelete('active_sessions', 'user_id', targetUserId);
    await safeDelete('login_history', 'user_id', targetUserId);

    // Stories
    await safeDelete('story_views', 'viewer_id', targetUserId);
    await safeDelete('stories', 'user_id', targetUserId);

    // Ads
    await safeDelete('ad_clicks', 'clicker_id', targetUserId);
    await safeDelete('ad_impressions', 'viewer_id', targetUserId);
    await safeDelete('ad_campaigns', 'user_id', targetUserId);

    // Reports
    await safeDelete('user_reports', 'reporter_id', targetUserId);
    await safeDelete('user_reports', 'reported_user_id', targetUserId);

    // Affiliate and verification requests
    await safeDelete('affiliate_requests', 'user_id', targetUserId);
    await safeDelete('verification_requests', 'user_id', targetUserId);

    // Mini programs and integrations
    await safeDelete('user_mini_programs', 'user_id', targetUserId);
    await safeDelete('telegram_users', 'user_id', targetUserId);

    // Linked accounts
    await safeDelete('linked_accounts', 'primary_user_id', targetUserId);
    await safeDelete('linked_accounts', 'linked_user_id', targetUserId);

    // User roles
    await safeDelete('user_roles', 'user_id', targetUserId);

    // Finally, delete profile
    console.log('[delete-user-account] Deleting profile...');
    await safeDelete('profiles', 'id', targetUserId);
    
    // Delete the auth user
    console.log('[delete-user-account] Deleting auth user...');
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    
    if (deleteAuthError) {
      console.error('[delete-user-account] Error deleting auth user:', deleteAuthError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete authentication record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[delete-user-account] Account successfully deleted');

    return new Response(
      JSON.stringify({ success: true, message: 'Account permanently deleted' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[delete-user-account] Error:', error);
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
