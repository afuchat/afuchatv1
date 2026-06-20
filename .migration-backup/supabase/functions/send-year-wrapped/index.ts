import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserStats {
  userId: string;
  email: string;
  displayName: string;
  handle: string;
  totalPosts: number;
  totalLikesReceived: number;
  totalRepliesReceived: number;
  totalFollowersGained: number;
  totalFollowing: number;
  totalMessagesSent: number;
  totalGiftsSent: number;
  totalGiftsReceived: number;
  totalXpEarned: number;
  currentGrade: string;
  topPost: { content: string; likes: number } | null;
  joinDate: string;
  daysActive: number;
}

async function getUserStats(supabase: any, userId: string, year: number): Promise<UserStats | null> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, handle, xp, current_grade, created_at")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  // Get posts count and top post
  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, created_at")
    .eq("author_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const totalPosts = posts?.length || 0;

  // Get likes received on posts
  let totalLikesReceived = 0;
  let topPost = null;
  if (posts && posts.length > 0) {
    const postIds = posts.map((p: any) => p.id);
    const { count: likesCount } = await supabase
      .from("post_acknowledgments")
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds);
    totalLikesReceived = likesCount || 0;

    // Find top post
    for (const post of posts) {
      const { count } = await supabase
        .from("post_acknowledgments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);
      if (!topPost || (count || 0) > topPost.likes) {
        topPost = { content: post.content?.substring(0, 100) || "", likes: count || 0 };
      }
    }
  }

  // Get replies received
  const { count: repliesCount } = await supabase
    .from("post_replies")
    .select("*", { count: "exact", head: true })
    .in("post_id", posts?.map((p: any) => p.id) || [])
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  // Get followers gained
  const { count: followersGained } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  // Get total following
  const { count: totalFollowing } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  // Get messages sent
  const { count: messagesSent } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  // Get gifts sent
  const { count: giftsSent } = await supabase
    .from("gift_transactions")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  // Get gifts received
  const { count: giftsReceived } = await supabase
    .from("gift_transactions")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  // Get XP earned this year from activity log
  const { data: xpData } = await supabase
    .from("user_activity_log")
    .select("xp_earned")
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const totalXpEarned = xpData?.reduce((sum: number, a: any) => sum + (a.xp_earned || 0), 0) || 0;

  // Calculate days active
  const joinDate = new Date(profile.created_at);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    userId,
    email: "", // Will be populated from auth.users
    displayName: profile.display_name || profile.handle || "AfuChat User",
    handle: profile.handle || "user",
    totalPosts,
    totalLikesReceived,
    totalRepliesReceived: repliesCount || 0,
    totalFollowersGained: followersGained || 0,
    totalFollowing: totalFollowing || 0,
    totalMessagesSent: messagesSent || 0,
    totalGiftsSent: giftsSent || 0,
    totalGiftsReceived: giftsReceived || 0,
    totalXpEarned,
    currentGrade: profile.current_grade || "Newcomer",
    topPost,
    joinDate: profile.created_at,
    daysActive,
  };
}

function generateEmailHtml(stats: UserStats, year: number): string {
  const topPostSection = stats.topPost && stats.topPost.likes > 0
    ? `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; color: white;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">🌟 Your Top Post</h3>
        <p style="margin: 0; font-style: italic;">"${stats.topPost.content}${stats.topPost.content.length >= 100 ? '...' : ''}"</p>
        <p style="margin: 10px 0 0 0; font-weight: bold;">❤️ ${stats.topPost.likes} likes</p>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your AfuChat ${year} Wrapped</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); padding: 40px 20px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #f59e0b; font-size: 36px; margin: 0; text-shadow: 0 0 20px rgba(245, 158, 11, 0.5);">
            🎉 AfuChat ${year}
          </h1>
          <h2 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0; font-weight: 300;">
            Your Year Wrapped
          </h2>
        </div>

        <!-- Welcome -->
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="color: #e5e5e5; font-size: 18px; margin: 0;">
            Hey <strong style="color: #f59e0b;">@${stats.handle}</strong>! 👋
          </p>
          <p style="color: #a3a3a3; font-size: 14px; margin: 10px 0 0 0;">
            Here's your amazing journey on AfuChat in ${year}
          </p>
        </div>

        <!-- Grade Badge -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50px; padding: 15px 30px;">
            <span style="color: #000; font-size: 20px; font-weight: bold;">
              🏆 ${stats.currentGrade}
            </span>
          </div>
          <p style="color: #a3a3a3; font-size: 12px; margin-top: 10px;">Your current rank</p>
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 30px 0;">
          
          <!-- Posts -->
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; color: #10b981; font-weight: bold;">${stats.totalPosts}</div>
            <div style="color: #a3a3a3; font-size: 12px; margin-top: 5px;">📝 Posts Created</div>
          </div>

          <!-- Likes Received -->
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; color: #ef4444; font-weight: bold;">${stats.totalLikesReceived}</div>
            <div style="color: #a3a3a3; font-size: 12px; margin-top: 5px;">❤️ Likes Received</div>
          </div>

          <!-- New Followers -->
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; color: #3b82f6; font-weight: bold;">${stats.totalFollowersGained}</div>
            <div style="color: #a3a3a3; font-size: 12px; margin-top: 5px;">👥 New Followers</div>
          </div>

          <!-- Messages -->
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; color: #8b5cf6; font-weight: bold;">${stats.totalMessagesSent}</div>
            <div style="color: #a3a3a3; font-size: 12px; margin-top: 5px;">💬 Messages Sent</div>
          </div>

          <!-- Gifts Sent -->
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; color: #f59e0b; font-weight: bold;">${stats.totalGiftsSent}</div>
            <div style="color: #a3a3a3; font-size: 12px; margin-top: 5px;">🎁 Gifts Sent</div>
          </div>

          <!-- Gifts Received -->
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; color: #ec4899; font-weight: bold;">${stats.totalGiftsReceived}</div>
            <div style="color: #a3a3a3; font-size: 12px; margin-top: 5px;">🎀 Gifts Received</div>
          </div>

        </div>

        <!-- XP Earned -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0;">
          <div style="font-size: 48px; color: #000; font-weight: bold;">${stats.totalXpEarned.toLocaleString()}</div>
          <div style="color: rgba(0,0,0,0.7); font-size: 14px; margin-top: 5px;">⚡ Nexa Points Earned</div>
        </div>

        ${topPostSection}

        <!-- Days on Platform -->
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 12px;">
          <p style="color: #a3a3a3; font-size: 14px; margin: 0;">
            You've been part of the AfuChat family for
          </p>
          <p style="color: #f59e0b; font-size: 28px; font-weight: bold; margin: 10px 0;">
            ${stats.daysActive} days
          </p>
          <p style="color: #a3a3a3; font-size: 12px; margin: 0;">
            Thank you for being awesome! 🙏
          </p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 40px 0 20px 0;">
          <a href="https://afuchat.com" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; text-decoration: none; padding: 15px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">
            Continue Your Journey →
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
          <p style="color: #525252; font-size: 12px; margin: 0;">
            Made with ❤️ by the AfuChat Team
          </p>
          <p style="color: #404040; font-size: 10px; margin: 10px 0 0 0;">
            © ${year} AfuChat. All rights reserved.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, email, year = new Date().getFullYear() } = await req.json();

    // Helper function to get user ID from email
    async function getUserIdFromEmail(userEmail: string): Promise<{ id: string; email: string } | null> {
      const normalized = userEmail.trim().toLowerCase();
      console.log("[send-year-wrapped] lookup email:", normalized);

      // listUsers is paginated; scan pages until we find the email
      const perPage = 200;
      const maxPages = 50; // safety cap

      for (let page = 1; page <= maxPages; page++) {
        const { data, error } = await (supabase.auth.admin as any).listUsers({ page, perPage });

        if (error) {
          console.error("[send-year-wrapped] listUsers error:", error);
          return null;
        }

        const users: any[] = data?.users ?? [];
        const match = users.find((u) => (u.email ?? "").toLowerCase() === normalized);
        if (match?.id && match?.email) return { id: match.id, email: match.email };

        // If the page returned fewer than perPage, we're at the end.
        if (users.length < perPage) break;
      }

      return null;
    }

    if (action === "send_single") {
      // Send to a single user - accept email or userId
      let targetUserId = userId;
      let targetEmail = email;

      if (email && !userId) {
        const userInfo = await getUserIdFromEmail(email);
        if (!userInfo) {
          return new Response(
            JSON.stringify({ error: "User not found with that email" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        targetUserId = userInfo.id;
        targetEmail = userInfo.email;
      }

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "email or userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stats = await getUserStats(supabase, targetUserId, year);
      if (!stats) {
        return new Response(
          JSON.stringify({ error: "User not found or no stats available" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Override email from auth if we have it
      if (targetEmail) {
        stats.email = targetEmail;
      }

      const html = generateEmailHtml(stats, year);
      const { error } = await resend.emails.send({
        from: "AfuChat <wrapped@afuchat.com>",
        to: [stats.email],
        subject: `🎉 Your AfuChat ${year} Year Wrapped is here!`,
        html,
      });

      if (error) {
        console.error("Resend error:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log(`Wrapped email sent to ${stats.email}`);
      return new Response(
        JSON.stringify({ success: true, message: `Email sent to ${stats.email}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_all") {
      // Send to all users with emails (batch processing)
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      const usersWithEmails = authData.users.filter((u: any) => u.email);

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const user of usersWithEmails.slice(0, 500)) {
        if (!user.email) continue;
        
        try {
          const stats = await getUserStats(supabase, user.id, year);
          if (stats) {
            stats.email = user.email; // Set email from auth
            const html = generateEmailHtml(stats, year);
            const { error } = await resend.emails.send({
              from: "AfuChat <wrapped@afuchat.com>",
              to: [user.email],
              subject: `🎉 Your AfuChat ${year} Year Wrapped is here!`,
              html,
            });

            if (error) {
              failed++;
              errors.push(`${user.email}: ${error.message}`);
            } else {
              sent++;
              console.log(`Wrapped email sent to ${user.email}`);
            }
          }
          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (err: any) {
          failed++;
          errors.push(`${user.email}: ${err?.message || 'Unknown error'}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent, 
          failed, 
          total: usersWithEmails.length,
          errors: errors.slice(0, 10) // Return first 10 errors
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "preview") {
      // Preview stats for a user without sending - accept email or userId
      let targetUserId = userId;
      let targetEmail = email;

      if (email && !userId) {
        const userInfo = await getUserIdFromEmail(email);
        if (!userInfo) {
          return new Response(
            JSON.stringify({ error: "User not found with that email" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        targetUserId = userInfo.id;
        targetEmail = userInfo.email;
      }

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "email or userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stats = await getUserStats(supabase, targetUserId, year);
      if (!stats) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Override email from auth if we have it
      if (targetEmail) {
        stats.email = targetEmail;
      }

      return new Response(
        JSON.stringify({ success: true, stats }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: send_single, send_all, or preview" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-year-wrapped:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
