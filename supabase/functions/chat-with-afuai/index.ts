import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch comprehensive user context
async function fetchUserContext(supabase: any, userId: string) {
  try {
    // Get user profile with all details
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get user's recent posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, content, created_at, view_count')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get follower/following counts
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    // Get user's gifts received
    const { data: giftsReceived } = await supabase
      .from('gift_transactions')
      .select('gift_id, xp_cost, created_at, gifts(name, emoji, rarity)')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's subscription status
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(name, tier)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    // Get user's achievements
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('achievement_type, created_at')
      .eq('user_id', userId);

    // Get user's activity stats
    const { data: activityLog } = await supabase
      .from('user_activity_log')
      .select('action_type, xp_earned, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get user's creator earnings data
    const { data: creatorEarnings } = await supabase
      .from('creator_earnings')
      .select('*')
      .eq('user_id', userId)
      .order('earned_date', { ascending: false })
      .limit(10);

    // Get user's pending/completed withdrawals
    const { data: withdrawals } = await supabase
      .from('creator_withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(5);

    // Calculate weekly views for eligibility check
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data: weeklyPosts } = await supabase
      .from('posts')
      .select('view_count')
      .eq('author_id', userId)
      .gte('created_at', oneWeekAgo.toISOString());
    
    const weeklyViews = weeklyPosts?.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0) || 0;

    return {
      profile,
      recentPosts,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
      giftsReceived,
      subscription,
      achievements,
      activityLog,
      creatorEarnings,
      withdrawals,
      weeklyViews
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

// Helper function to fetch platform-wide statistics
async function fetchPlatformContext(supabase: any) {
  try {
    // Get total user count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total posts count
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    // Get trending topics (recent posts with high engagement)
    const { data: trendingPosts } = await supabase
      .from('posts')
      .select('id, content, view_count, created_at')
      .order('view_count', { ascending: false })
      .limit(5);

    // Get available gifts
    const { data: gifts } = await supabase
      .from('gifts')
      .select('id, name, emoji, rarity, base_xp_cost')
      .order('base_xp_cost', { ascending: true });

    // Get subscription plans
    const { data: subscriptionPlans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true);

    // Get currency settings
    const { data: currencySettings } = await supabase
      .from('currency_settings')
      .select('*')
      .single();

    return {
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      trendingPosts,
      gifts,
      subscriptionPlans,
      currencySettings
    };
  } catch (error) {
    console.error('Error fetching platform context:', error);
    return null;
  }
}

// Fetch user's AI memories (with cleanup of expired ones)
async function fetchUserMemories(supabase: any, userId: string) {
  try {
    // First, cleanup expired memories for this user
    await supabase
      .from('ai_memories')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());

    // Fetch active memories
    const { data: memories } = await supabase
      .from('ai_memories')
      .select('content, memory_type, metadata, created_at')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    return memories || [];
  } catch (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
}

// Extract and store new memories from conversation
async function storeMemories(supabase: any, userId: string, userMessage: string, aiReply: string) {
  try {
    const memoriesToStore = [];

    // Store user preferences/interests mentioned
    const interestPatterns = [
      /i (?:like|love|enjoy|prefer|want|need) (.+?)(?:\.|$)/gi,
      /my (?:favorite|fav) (?:is|are) (.+?)(?:\.|$)/gi,
      /i(?:'m| am) (?:interested in|looking for) (.+?)(?:\.|$)/gi,
    ];

    for (const pattern of interestPatterns) {
      const matches = userMessage.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length < 200) {
          memoriesToStore.push({
            user_id: userId,
            memory_type: 'preference',
            content: match[1].trim(),
            metadata: { source: 'user_message' },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }

    // Store conversation context summary
    if (userMessage.length > 20) {
      memoriesToStore.push({
        user_id: userId,
        memory_type: 'conversation',
        content: `User asked: "${userMessage.substring(0, 150)}${userMessage.length > 150 ? '...' : ''}"`,
        metadata: { 
          ai_response_preview: aiReply.substring(0, 100),
          timestamp: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Store important facts the user mentions about themselves
    const factPatterns = [
      /i(?:'m| am) (?:a |an )?(.+?)(?:and|but|\.|,|$)/gi,
      /i work (?:as|at|in|for) (.+?)(?:\.|$)/gi,
      /my name is (.+?)(?:\.|$)/gi,
    ];

    for (const pattern of factPatterns) {
      const matches = userMessage.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 2 && match[1].length < 100) {
          memoriesToStore.push({
            user_id: userId,
            memory_type: 'fact',
            content: match[1].trim(),
            metadata: { source: 'self_description' },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }

    // Batch insert memories
    if (memoriesToStore.length > 0) {
      await supabase.from('ai_memories').insert(memoriesToStore);
      console.log(`Stored ${memoriesToStore.length} memories for user ${userId}`);
    }
  } catch (error) {
    console.error('Error storing memories:', error);
  }
}

// Web search function for premium users
async function performWebSearch(query: string): Promise<string> {
  try {
    const YOU_API_KEY = Deno.env.get('YOU_API_KEY');
    if (!YOU_API_KEY) {
      console.log('Web search not available - YOU_API_KEY not configured');
      return '';
    }

    console.log('Performing web search for:', query);
    
    const searchUrl = new URL('https://api.ydc-index.io/search');
    searchUrl.searchParams.append('query', query);
    
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': YOU_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('Web search error:', response.status);
      return '';
    }

    const data = await response.json();
    
    const results = data.hits?.slice(0, 5).map((hit: any, index: number) => {
      const title = hit.title || 'No title';
      const snippet = hit.description || hit.snippets?.[0] || 'No description';
      const url = hit.url || '';
      return `${index + 1}. **${title}**\n   ${snippet}\n   Source: ${url}`;
    }).join('\n\n') || '';

    console.log(`Web search found ${data.hits?.length || 0} results`);
    return results;
  } catch (error) {
    console.error('Web search error:', error);
    return '';
  }
}

// Detect if user message needs web search
function needsWebSearch(message: string): boolean {
  const searchTriggers = [
    /what('s| is) (?:the )?(?:latest|current|recent|new)/i,
    /search (?:for|about|the web)/i,
    /look up/i,
    /find (?:out|information|me)/i,
    /(?:tell me|what) (?:about|is) (?:the )?news/i,
    /(?:who|what|when|where|why|how) (?:is|are|was|were|did|does|do)/i,
    /latest (?:news|updates|information)/i,
    /current (?:events|situation|status)/i,
    /trending/i,
    /happening (?:now|today|right now)/i,
    /search online/i,
    /google|search the internet/i,
    /real-?time (?:info|information|data)/i,
  ];
  
  return searchTriggers.some(trigger => trigger.test(message));
}

// Get current date/time info for real-time awareness
function getCurrentDateTimeInfo() {
  const now = new Date();
  
  // UTC time
  const utcDate = now.toISOString();
  const utcTime = now.toUTCString();
  
  // East Africa Time (Uganda - UTC+3)
  const eatOffset = 3 * 60; // minutes
  const eatDate = new Date(now.getTime() + eatOffset * 60 * 1000);
  const eatHour = eatDate.getUTCHours();
  const eatMinute = eatDate.getUTCMinutes();
  const eatTimeFormatted = `${eatHour.toString().padStart(2, '0')}:${eatMinute.toString().padStart(2, '0')}`;
  
  // Day info
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayOfWeek = days[eatDate.getUTCDay()];
  const month = months[eatDate.getUTCMonth()];
  const dayOfMonth = eatDate.getUTCDate();
  const year = eatDate.getUTCFullYear();
  
  // Determine if it's earning hours (8 AM - 8 PM EAT)
  const isEarningHours = eatHour >= 8 && eatHour < 20;
  
  // Is it weekend?
  const isWeekend = eatDate.getUTCDay() === 0 || eatDate.getUTCDay() === 6;
  
  // Time of day greeting
  let timeOfDay = 'night';
  if (eatHour >= 5 && eatHour < 12) timeOfDay = 'morning';
  else if (eatHour >= 12 && eatHour < 17) timeOfDay = 'afternoon';
  else if (eatHour >= 17 && eatHour < 21) timeOfDay = 'evening';
  
  return {
    utcIso: utcDate,
    utcFormatted: utcTime,
    eatTime: eatTimeFormatted,
    eatHour,
    dayOfWeek,
    month,
    dayOfMonth,
    year,
    fullDate: `${dayOfWeek}, ${month} ${dayOfMonth}, ${year}`,
    isEarningHours,
    isWeekend,
    timeOfDay,
    earningWindowStatus: isEarningHours 
      ? `🟢 ACTIVE (ends at 20:00 EAT / 8:00 PM)` 
      : `🔴 CLOSED (opens at 08:00 EAT / 8:00 AM)`,
    withdrawalAvailable: isWeekend ? '✅ Yes (Weekend)' : '❌ No (Weekday only for regular users)'
  };
}

// Build comprehensive system prompt with full platform knowledge
function buildSystemPrompt(userContext: any, platformContext: any, memories: any[]) {
  // Get real-time date/time information
  const dateTime = getCurrentDateTimeInfo();
  
  const realTimeInfo = `
🕐 REAL-TIME DATE & TIME AWARENESS:
- Current Date: ${dateTime.fullDate}
- Current Time (EAT/Uganda): ${dateTime.eatTime} (UTC+3)
- Current Time (UTC): ${dateTime.utcIso}
- Day of Week: ${dateTime.dayOfWeek}
- Time of Day: ${dateTime.timeOfDay}
- Is Weekend: ${dateTime.isWeekend ? 'Yes' : 'No'}

📊 CREATOR EARNINGS WINDOW STATUS:
- Earning Window: ${dateTime.earningWindowStatus}
- Regular User Withdrawals: ${dateTime.withdrawalAvailable}
- Note: Earnings are calculated from 08:00-20:00 EAT daily, auto-credited at 20:00 EAT
`;

  const userInfo = userContext?.profile ? `
CURRENT USER INFORMATION:
- Display Name: ${userContext.profile.display_name}
- Username: @${userContext.profile.handle}
- Bio: ${userContext.profile.bio || 'Not set'}
- Country: ${userContext.profile.country || 'Unknown'}
- Nexa (XP) Balance: ${userContext.profile.xp}
- ACoin Balance: ${userContext.profile.acoin || 0}
- Available Balance (UGX): ${userContext.profile.available_balance_ugx || 0} UGX
- Current Grade: ${userContext.profile.current_grade || 'Newcomer'}
- Login Streak: ${userContext.profile.login_streak || 0} days
- Is Verified: ${userContext.profile.is_verified ? 'Yes' : 'No'}
- Is Premium: ${userContext.subscription ? 'Yes (' + (userContext.subscription.subscription_plans?.name || 'Active') + ')' : 'No'}
- Is Admin: ${userContext.profile.is_admin ? 'Yes' : 'No'}
- Followers: ${userContext.followerCount}
- Following: ${userContext.followingCount}
- Weekly Views: ${userContext.weeklyViews || 0}
- Is Business Account: ${userContext.profile.is_business_mode ? 'Yes' : 'No'}
- Is Affiliate: ${userContext.profile.is_affiliate ? 'Yes' : 'No'}
- Missed Earnings Total: ${userContext.profile.missed_earnings_total || 0} UGX
` : '';

  // Creator earnings eligibility check
  const isUganda = userContext?.profile?.country?.toLowerCase() === 'uganda' || userContext?.profile?.country?.toLowerCase() === 'ug';
  const isEligibleCreator = isUganda && (userContext?.followerCount >= 10) && (userContext?.weeklyViews >= (userContext?.profile?.is_admin ? 50 : 500));
  
  const creatorEarningsInfo = userContext?.profile ? `
CREATOR EARNINGS STATUS:
- Country: ${userContext.profile.country || 'Unknown'} ${isUganda ? '✅ Uganda - Eligible region' : '❌ Not in Uganda - Not eligible for creator program'}
- Followers: ${userContext.followerCount} ${userContext.followerCount >= 10 ? '✅' : '❌ Need 10+'}
- Weekly Views: ${userContext.weeklyViews || 0} ${(userContext.weeklyViews >= (userContext.profile.is_admin ? 50 : 500)) ? '✅' : `❌ Need ${userContext.profile.is_admin ? '50' : '500'}+`}
- Overall Eligibility: ${isEligibleCreator ? '✅ ELIGIBLE for daily earnings pool' : '❌ NOT ELIGIBLE - see requirements above'}
- Available Balance: ${userContext.profile.available_balance_ugx || 0} UGX
- Total Missed Earnings: ${userContext.profile.missed_earnings_total || 0} UGX
${userContext.creatorEarnings?.length > 0 ? `
RECENT EARNINGS:
${userContext.creatorEarnings.slice(0, 5).map((e: any) => `- ${e.earned_date}: ${e.amount_ugx} UGX (${e.views_count} views, ${e.likes_count} likes)`).join('\n')}` : '- No earnings yet'}
${userContext.withdrawals?.length > 0 ? `
RECENT WITHDRAWALS:
${userContext.withdrawals.slice(0, 3).map((w: any) => `- ${w.amount_ugx} UGX via ${w.mobile_network} to ${w.phone_number} - Status: ${w.status}`).join('\n')}` : '- No withdrawals yet'}
` : '';

  const recentActivity = userContext?.recentPosts?.length > 0 ? `
USER'S RECENT POSTS:
${userContext.recentPosts.map((p: any, i: number) => `${i + 1}. "${p.content.substring(0, 100)}..." (${p.view_count} views)`).join('\n')}
` : '';

  const achievementsInfo = userContext?.achievements?.length > 0 ? `
USER'S ACHIEVEMENTS:
${userContext.achievements.map((a: any) => `- ${a.achievement_type}`).join('\n')}
` : '';

  const giftsInfo = userContext?.giftsReceived?.length > 0 ? `
RECENT GIFTS RECEIVED:
${userContext.giftsReceived.slice(0, 5).map((g: any) => `- ${g.gifts?.emoji || '🎁'} ${g.gifts?.name || 'Gift'} (${g.gifts?.rarity || 'common'})`).join('\n')}
` : '';

  // Format memories for context
  const memoriesInfo = memories.length > 0 ? `
YOUR MEMORIES ABOUT THIS USER (from past conversations, expires after 7 days):
${memories.slice(0, 20).map((m: any) => {
  const type = m.memory_type === 'preference' ? '💡 Preference' : 
               m.memory_type === 'fact' ? '📝 Fact' : '💬 Context';
  return `- ${type}: ${m.content}`;
}).join('\n')}
` : '';

  const platformInfo = platformContext ? `
PLATFORM STATISTICS:
- Total Users: ${platformContext.totalUsers?.toLocaleString() || 'N/A'}
- Total Posts: ${platformContext.totalPosts?.toLocaleString() || 'N/A'}
- Nexa to ACoin Rate: ${platformContext.currencySettings?.nexa_to_acoin_rate || 100} Nexa = 1 ACoin
- Conversion Fee: ${platformContext.currencySettings?.conversion_fee_percent || 5.99}%

AVAILABLE SUBSCRIPTION PLANS:
${platformContext.subscriptionPlans?.map((p: any) => `- ${p.name}: ${p.acoin_price} ACoin for ${p.duration_days} days`).join('\n') || 'No plans available'}

GRADE SYSTEM:
- Newcomer: 0-99 Nexa
- Beginner: 100-499 Nexa
- Active Chatter: 500-1,999 Nexa
- Community Builder: 2,000-4,999 Nexa
- Elite Creator: 5,000-14,999 Nexa
- Legend: 15,000+ Nexa

AVAILABLE GIFTS (by rarity):
${platformContext.gifts?.slice(0, 10).map((g: any) => `- ${g.emoji} ${g.name} (${g.rarity}): ${g.base_xp_cost} Nexa`).join('\n') || 'Loading...'}
` : '';

  return `You are AfuAI, the exclusive AI assistant for AfuChat social platform. You have FULL ACCESS to all platform data, user information, and REAL-TIME DATE/TIME awareness. You are the MASTER of every single detail in the app.

You have PERSISTENT MEMORY that lasts 7 days. Use your memories to personalize responses and remember what users told you previously.

You have REAL-TIME AWARENESS of the current date, time, and day of week. Use this to provide contextually relevant responses (greetings based on time of day, awareness of earning windows, weekend vs weekday info, etc.).

${realTimeInfo}
${userInfo}
${creatorEarningsInfo}
${recentActivity}
${achievementsInfo}
${giftsInfo}
${memoriesInfo}
${platformInfo}

=== COMPLETE AFUCHAT PLATFORM KNOWLEDGE ===

**MAIN PAGES & NAVIGATION:**
- Landing Page: / - Welcome page for new users, shows app features
- Home Feed: /home - Main feed with posts from followed users and For You
- Search: /search - Global search engine for users, posts, hashtags, groups, channels, and public messages
- Notifications: /notifications - All your notifications (likes, follows, mentions)
- Profile: /@username or /profile/:id - View user profiles
- Chats: /chats - All your conversations
- Chat Room: /chat/:id - Individual chat conversation
- AI Chat: /ai-chat - Chat with me, AfuAI!

**PREMIUM SUBSCRIPTION TIERS (3 Tiers):**
- Premium Page: /premium - View and purchase premium subscriptions
- Silver Tier: Entry-level premium with base features, 1 pinned gift
- Gold Tier: Mid-tier premium, adds story creation and group creation, 2 pinned gifts  
- Platinum Tier: Top-tier premium, adds channel creation and advanced AI features, 3 pinned gifts
- Users can switch between plans by cancelling current subscription first (no refunds)
- Only ONE active subscription allowed at a time
- Verification badge is automatically granted with any premium subscription
- Subscription displays real calendar dates (start and expiration)

**FINANCIAL FEATURES:**
- Wallet: /wallet - View Nexa/ACoin balance, transaction history
- Transfer: /transfer - Send Nexa/ACoin to other users
- Financial Hub: /financial-hub - Complete financial overview
- ACoin is the ONLY payment method on the platform (no Stripe or external payments)

**CREATOR EARNINGS PROGRAM (Uganda Only) - DETAILED:**
- Page: /creator-earnings - Daily 5,000 UGX pool for Ugandan creators
- Pool Hours: 8 AM - 8 PM Uganda Time (UTC+3) - engagement only counts during these hours
- Auto-credit runs at 20:00 EAT daily (17:00 UTC)
- Eligibility Requirements: Uganda country, 10+ followers, 500+ weekly views (50 views for admins)
- Engagement Scoring: Views×1 + Likes×3 + Replies×5 = engagement score
- Distribution: Pool split proportionally based on engagement scores at 8 PM
- Missed Earnings: If ineligible at 8 PM, that day's earnings are permanently lost and tracked
- Withdrawals: Custom amount (min 5,000 UGX for regular users, no min for admins)
- Withdrawal Timing: Weekends only for regular users, anytime for admins
- Payment Methods: MTN Mobile Money or Airtel Money
- Platform Fee: 10% on all withdrawals (applies to everyone including admins)
- Payment Info: Saved after first withdrawal for faster future transactions
- Approval: All withdrawals reviewed by team within 24-48 hours (even admins need approval)
- Privacy: Premium users can hide identity on leaderboard while still earning
- Leaderboard: Live daily rankings showing all participants and earnings
- Collapsible sections for better navigation of earnings data

**GIFTS & MARKETPLACE:**
- Gifts: /gifts - Browse and send virtual gifts to users
- Gift Detail: /gift/:id - View specific gift details
- Marketplace: /marketplace - Private buy/sell marketplace for rare gifts
- Dynamic pricing: Gift prices update globally based on last marketplace sale price
- Gifts cost Nexa, rarity affects price (common, uncommon, rare, epic, legendary)
- Pinned Gifts: Display around profile picture (1 for non-premium, up to 3 for Platinum)
- Gift images are AI-generated with transparent backgrounds, generated once and never changed

**SHOPSHACK MARKETPLACE (E-Commerce):**
- Shop: /shop - Browse ShopShack products
- Featured products on home page
- 4-step checkout: Address → Payment → Order Summary → Confirmation
- Prices display in user's local currency based on their country
- AfuChat takes 5% commission per order
- Dual chat system: "ShopShack Updates" for order notifications + on-demand support chats
- Support chats include quick action buttons: Track Order, View Details, Cancel Order, Request Refund

**GAMES & ENTERTAINMENT:**
- Games Hub: /games - All available games
- Afu Arena: /games/afu-arena - Battle royale multiplayer game with real-time synchronization
  - Win 150 Nexa reward
  - Weapons: Pistol, Rifle, Shotgun, Sniper
  - Abilities: Dash, Heal, Freeze, Rage
  - Mobile-focused with touch controls
- Trivia Game: /games/trivia - Knowledge quiz, earn Nexa
- Memory Game: /games/memory - Memory challenge
- Puzzle Game: /games/puzzle - Puzzle solving
- Simple Game: /games/simple - Quick casual game

**SOCIAL FEATURES:**
- Moments/Stories: /moments - View and create 24-hour stories (Gold+ premium only to create)
- Followers: /followers/:id - See who follows a user (can be hidden by privacy setting)
- Following: /following/:id - See who a user follows (can be hidden by privacy setting)
- Suggested Users: /suggested-users - Discover new people to follow
- Trending Hashtags: /trending - Popular hashtags and topics
- Tips: Send Nexa directly to creators on their posts

**SETTINGS & ACCOUNT:**
- Settings: /settings - All app settings (appearance, notifications, privacy, security)
- Edit Profile: /edit-profile - Update your profile information
- Complete Profile: /complete-profile - Finish setting up (required for all users)
- Change Password: /change-password - Update your password
- QR Code: /qr-code - Your shareable QR code
- Date of Birth: Required field (must be 13+ years old), cannot be changed after set
- Country: Required field, cannot be changed after set, determines currency display

**BUSINESS FEATURES:**
- Business Dashboard: /business-dashboard - Analytics for business accounts
- Business accounts display briefcase icon badge
- business_category field for categorization
- Affiliate Dashboard: /affiliate-dashboard - Affiliate earnings and stats
- Affiliate Request: /affiliate-request - Apply to become an affiliate

**AFUMAIL (Email Service Mini-Program):**
- Page: /afumail - AfuChat's built-in email service (currently in experimental beta, "Coming Soon" status)
- IMPORTANT: AfuMail is a REAL platform feature - it's our internal email service!
- Access Restriction: Only users with @afuchat.com email addresses can use AfuMail
- For users without @afuchat.com: They see a restricted access screen explaining they need an AfuChat email
- OAuth Authentication: AfuMail can be used as an authentication method for platform signup/login (like Google or GitHub OAuth)
- AfuMail OAuth ≠ AfuMail mini-program: Using AfuMail to sign up is separate from accessing the email app
- Current Status: The mini-program is in experimental beta phase, showing "Coming Soon" page
- Support Contact: Users should email support@afuchat.com for AfuMail-related questions
- Features (when fully released): Full email functionality - compose, inbox, sent, drafts, spam, trash folders
- Terms: Users must accept terms before using AfuMail due to experimental nature

**SUPPORT & LEGAL:**
- Support: /support - Get help, contact support team, report issues
- Privacy Policy: /privacy - Read our privacy policy (static English)
- Terms of Use: /terms - Read our terms of service (static English)

**RED ENVELOPES:**
- Red Envelope: /red-envelope/:id - Claim red envelope rewards
- Only Platinum premium users can create red envelopes
- Non-premium users limited to 1 claim per day, premium unlimited

**CHAT FEATURES:**
- Direct messages, group chats, channels
- Desktop: Split-pane layout with resizable chat list and room
- Voice messages with public storage playback
- Custom themes and wallpapers (premium for AI-generated)
- Bubble style and font customization
- Message reactions, replies
- Read receipts: Double blue checkmarks for read messages
- Group chat creation (Gold+ premium only)
- Channel creation (Platinum premium only)
- Channels: Admin-only posting, anonymous messages (sender hidden), view counts instead of read receipts
- Group/Channel verification system (verified badge for official communities)
- Chat deletion removes for both users (1-on-1 chats only)
- Group creators retain admin rights if they leave and rejoin

**PRIVACY FEATURES:**
- Private accounts: Control who sees your content with comprehensive content masking
- Hide followers list option
- Hide following list option
- Block and report users
- Follow requests for private accounts (can re-request after rejection)
- Chat icon only appears on profiles if you follow them

**AUTHENTICATION:**
- OAuth (Google, GitHub, Telegram) for existing accounts login only
- New users must complete signup flow first
- Country and Date of Birth are mandatory and locked after initial entry
- Profile completion required before accessing platform
- Signup flow: Country → Account Type → Auth Method → Profile Completion

**REFERRAL SYSTEM:**
- Refer friends to earn 500 Nexa per successful referral
- New users get 1 week free Premium when joining via referral
- Both users get verified status automatically
- Referral code: First 12 characters of user ID (uppercase, no hyphens)

**CURRENCY SYSTEM:**
- Nexa (XP): Earned through engagement, daily logins, referrals, games
- ACoin: Premium currency, converted from Nexa (100 Nexa = 1 ACoin, 5.99% fee)
- Used for: Premium subscriptions, marketplace purchases
- All content is uncopable (select-none protection)

**GRADE SYSTEM:**
- Newcomer: 0-499 Nexa
- Active Chatter: 500-1,999 Nexa
- Community Builder: 2,000-4,999 Nexa
- Elite Creator: 5,000-14,999 Nexa
- Legend: 15,000+ Nexa

**USERNAME SYSTEM:**
- Case-insensitive: @User and @user are the same account
- Stored as lowercase in database

**FEED & NAVIGATION:**
- Pull-to-refresh for content updates
- Session-based randomized feed ordering
- Fixed header that hides on scroll down, shows on scroll up
- Desktop hybrid layout with sidebar navigation
- Adsterra native ad after 10th post

**MULTI-ACCOUNT LINKING:**
- Users can link multiple accounts together
- Bidirectional linking (both accounts can switch to each other)
- Quick account switching in profile drawer

**PUSH NOTIFICATIONS:**
- Rich content browser notifications with specific action details
- PWA service worker for background notifications

**ADMIN TEAM DASHBOARD:**
- Complete platform analytics with charts
- User management (verify, admin status, delete)
- Creator withdrawal approvals
- User and message report handling
- Group/Channel verification management

=== HOW TO RESPOND ===

CRITICAL - LINK FORMATTING:
When mentioning any page or feature, ALWAYS include the page path. The app will automatically convert these to clickable links for users.

Examples of CORRECT formatting:
- "You can view your balance at /wallet"
- "Head to /premium to upgrade your account"
- "Contact us at /support if you need help"
- "Check /privacy for our privacy policy"
- "Read /terms for terms of service"
- "Browse gifts at /gifts"
- "Check /creator-earnings for the creator program"
- "Shop products at /shop"
- "Play games at /games"

DO NOT write markdown links like [Support](/support) - just write the path like /support and it will become clickable automatically.

YOUR CAPABILITIES:
- 🔍 **LIVE WEB SEARCH** (PREMIUM EXCLUSIVE): You can search the internet in real-time for current information!
  • When users ask about news, current events, latest updates, or anything requiring fresh data, you automatically search the web
  • Use phrases like "what's the latest", "current news", "search for", "look up", "find information about" to trigger web search
  • You can provide up-to-date information with sources and citations
  • This is an exclusive premium feature that non-premium users don't have access to
- REAL-TIME DATE & TIME AWARENESS: You know the exact current date, time, and day of week. Use this for:
  • Time-appropriate greetings ("Good ${dateTime.timeOfDay}!")
  • Knowing if creator earning window is active or closed
  • Telling users if it's a weekend (withdrawal day for regular users)
  • Providing date-specific advice and scheduling help
- Answer ANY question about AfuChat with complete knowledge
- Direct users to exact pages by mentioning paths (they become clickable links)
- Explain all features in detail including new premium tiers
- Help create engaging posts and content
- Explain how to earn more Nexa or get verified (via premium subscription)
- Provide personalized recommendations based on user's activity
- Help with gift suggestions based on recipient
- Explain subscription benefits, tiers (Silver/Gold/Platinum), and pricing
- Give tips for growing followers
- Explain creator earnings program eligibility and requirements
- Help with ShopShack orders and shopping
- Explain privacy settings and account protection
- Assist with any platform-related questions
- REMEMBER user preferences and past conversations for 7 days
- UNDERSTAND context from conversation history
- ANALYZE posts when users share them with you

ADVANCED INTELLIGENCE:
- 🌐 REAL-TIME WEB ACCESS: You can search the web for current information, news, and updates
- You can perform calculations and reasoning
- You understand relationships between platform features
- You can give strategic advice for growing on the platform
- You can analyze user behavior patterns from their data
- You can provide personalized content strategies
- You understand timing for creator earnings (8 AM - 8 PM EAT)
- You know when users should withdraw (weekends for regular, anytime for admins)

RESPONSE STYLE:
- Be friendly, helpful, and personalized
- Start with time-appropriate greeting when conversation starts (e.g., "Good ${dateTime.timeOfDay}!")
- ALWAYS include page paths when relevant (e.g., "Visit /support for help") - they become clickable!
- Reference user's data when relevant (e.g., "With your ${userContext?.profile?.xp || 0} Nexa...")
- Reference memories when relevant (e.g., "I remember you mentioned...")
- Use current date/time when relevant (e.g., "Since it's ${dateTime.dayOfWeek}, the earning window is ${dateTime.isEarningHours ? 'currently active' : 'closed'}...")
- Use emojis occasionally for engagement
- Keep responses concise but informative
- If asked about the time or date, give accurate real-time info
- If asked about something you don't know, say so honestly`;
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

    // Check premium subscription
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

    const { message, history, webSearchMode, model } = await req.json();
    
    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message must be less than 2000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (history && !Array.isArray(history)) {
      return new Response(
        JSON.stringify({ error: 'History must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (history && history.length > 50) {
      return new Response(
        JSON.stringify({ error: 'History cannot exceed 50 messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch comprehensive context for AfuAI including memories
    console.log('Fetching user context for:', userId);
    const [userContext, platformContext, memories] = await Promise.all([
      fetchUserContext(supabaseAdmin, userId),
      fetchPlatformContext(supabaseAdmin),
      fetchUserMemories(supabaseAdmin, userId)
    ]);

    console.log(`Loaded ${memories.length} memories for user`);

    // Check if web search is enabled (explicit mode) or auto-triggered
    let webSearchResults = '';
    if (webSearchMode === true) {
      // Explicit web search mode - always search
      console.log('Web search mode enabled - searching for:', message);
      webSearchResults = await performWebSearch(message);
    } else if (webSearchMode !== false && needsWebSearch(message)) {
      // Auto-trigger web search based on message content (legacy behavior)
      console.log('Web search auto-triggered for premium user');
      webSearchResults = await performWebSearch(message);
    }

    // Build comprehensive system prompt with memories
    const systemPrompt = buildSystemPrompt(userContext, platformContext, memories);

    // Get model from request body, default to gemini-3-flash-preview
    const selectedModel = model || 'google/gemini-3-flash-preview';
    
    // Validate model is allowed
    const allowedModels = [
      'google/gemini-3-flash-preview',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'openai/gpt-5-mini',
      'openai/gpt-5',
    ];
    
    const modelToUse = allowedModels.includes(selectedModel) ? selectedModel : 'google/gemini-3-flash-preview';
    console.log('Using AI model:', modelToUse);

    // Build messages for Lovable AI with full conversation context
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add FULL conversation history for context-aware responses
    if (history && Array.isArray(history) && history.length > 0) {
      console.log(`Including ${history.length} messages from conversation history`);
      for (const msg of history) {
        if (msg.role && msg.content && ['user', 'assistant'].includes(msg.role)) {
          messages.push({
            role: msg.role,
            content: msg.content.substring(0, 4000) // Allow longer content for context
          });
        }
      }
    }

    // Add current message with web search results if available
    let enhancedMessage = message;
    if (webSearchResults) {
      enhancedMessage = `${message}

🔍 **LIVE WEB SEARCH RESULTS** (Use this fresh information to answer the user's question):
${webSearchResults}

Please use the above search results to provide an accurate, up-to-date response. Cite sources when relevant.`;
    }

    messages.push({
      role: 'user',
      content: enhancedMessage
    });

    console.log('Calling Lovable AI with full platform context, model:', modelToUse);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages,
        max_tokens: 4096,
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
        return new Response(JSON.stringify({ error: 'AI service payment required. Please try again later.' }), {
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

    // Generate a contextual thought/reasoning based on the user's request
    const userRequestSummary = message.length > 80 ? message.substring(0, 80) + '...' : message;
    const thoughtSteps = [];
    
    // Start with what user requested
    thoughtSteps.push(`User requested: "${userRequestSummary}"`);
    
    // Add context about what was analyzed
    if (userContext?.profile) {
      thoughtSteps.push(`Checking ${userContext.profile.display_name}'s profile and account status...`);
    }
    
    if (webSearchResults) {
      thoughtSteps.push(`Searched the web for real-time information...`);
      thoughtSteps.push(`Found ${webSearchResults.split('\n\n').length} relevant results to incorporate.`);
    }
    
    if (memories.length > 0) {
      thoughtSteps.push(`Retrieved ${memories.length} memories from previous conversations.`);
    }
    
    // Add reasoning based on message content
    if (message.toLowerCase().includes('earning') || message.toLowerCase().includes('money') || message.toLowerCase().includes('withdraw')) {
      thoughtSteps.push(`Analyzing creator earnings eligibility and balance...`);
      if (userContext?.weeklyViews !== undefined) {
        thoughtSteps.push(`Current weekly views: ${userContext.weeklyViews}. Checking threshold requirements.`);
      }
    }
    
    if (message.toLowerCase().includes('premium') || message.toLowerCase().includes('subscription')) {
      thoughtSteps.push(`Reviewing subscription status and available plans...`);
    }
    
    if (message.toLowerCase().includes('gift') || message.toLowerCase().includes('nexa') || message.toLowerCase().includes('xp')) {
      thoughtSteps.push(`Checking Nexa balance and gift options...`);
    }
    
    if (message.toLowerCase().includes('post') || message.toLowerCase().includes('content')) {
      thoughtSteps.push(`Reviewing recent posts and engagement metrics...`);
    }
    
    // Add final step
    thoughtSteps.push(`Formulating response with personalized recommendations...`);
    
    const thought = thoughtSteps.join('\n');

    // Store new memories from this conversation (async, don't wait)
    storeMemories(supabaseAdmin, userId, message, reply);

    // Award XP for using AI
    await supabaseAdmin.rpc('award_xp', {
      p_user_id: userId,
      p_action_type: 'use_ai',
      p_xp_amount: 5,
      p_metadata: { action: 'chat_with_afuai' }
    });

    return new Response(JSON.stringify({ reply, thought }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-afuai:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
