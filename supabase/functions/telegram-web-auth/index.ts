import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function validateInitData(initData: string, botToken: string): { valid: boolean; data: Record<string, string> } {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { valid: false, data: {} };

  params.delete('hash');
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  // HMAC-SHA256 validation per Telegram docs
  const secretKey = hmac('sha256', 'WebAppData', botToken, 'utf8', 'hex');
  const checkHash = hmac('sha256', secretKey, dataCheckString, 'hex', 'hex');

  const data: Record<string, string> = {};
  for (const [k, v] of params.entries()) data[k] = v;

  return { valid: checkHash === hash, data };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { initData, telegramIdentifier, mode } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ===== MODE 1: Telegram Mini App initData (primary for TMA) =====
    if (initData) {
      console.log('[TG Auth] initData mode');

      const { valid, data } = validateInitData(initData, botToken);
      if (!valid) {
        console.error('[TG Auth] Invalid initData signature');
        return new Response(
          JSON.stringify({ error: 'Invalid Telegram data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      // Check auth_date freshness (5 min window)
      const authDate = parseInt(data['auth_date'] || '0');
      if (Date.now() / 1000 - authDate > 300) {
        return new Response(
          JSON.stringify({ error: 'Authentication expired. Please reopen the app.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const user = JSON.parse(data['user'] || '{}');
      const telegramId = user.id;
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      const username = user.username || '';
      const photoUrl = user.photo_url || '';
      const languageCode = user.language_code || 'en';

      if (!telegramId) {
        return new Response(
          JSON.stringify({ error: 'No user data in Telegram init' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('[TG Auth] Telegram user:', { telegramId, username, firstName });

      // Check if telegram_users row exists
      const { data: existingTgUser } = await supabase
        .from('telegram_users')
        .select('*, profiles:user_id (id, display_name, handle, avatar_url)')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      let userId: string;

      if (existingTgUser?.user_id && existingTgUser?.is_linked) {
        // Existing linked user — sign them in
        userId = existingTgUser.user_id;
        console.log('[TG Auth] Existing linked user:', userId);

        // Update telegram user info
        await supabase
          .from('telegram_users')
          .update({
            telegram_username: username || existingTgUser.telegram_username,
            telegram_first_name: firstName || existingTgUser.telegram_first_name,
            telegram_last_name: lastName || existingTgUser.telegram_last_name,
            preferred_language: languageCode,
            updated_at: new Date().toISOString(),
          })
          .eq('telegram_id', telegramId);

        // Update profile avatar if they don't have one and Telegram provides one
        if (photoUrl) {
          const profile = existingTgUser.profiles as any;
          if (profile && !profile.avatar_url) {
            await supabase
              .from('profiles')
              .update({ avatar_url: photoUrl })
              .eq('id', userId);
          }
        }
      } else {
        // New user — create auth account + profile + telegram link
        const displayName = [firstName, lastName].filter(Boolean).join(' ') || `User ${telegramId}`;
        const handle = username || `tg_${telegramId}`;
        const email = `tg_${telegramId}@telegram.afuchat.app`;

        // Check if email already exists (from previous signup)
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingAuth = existingUsers?.users?.find(u => u.email === email);

        if (existingAuth) {
          userId = existingAuth.id;
          console.log('[TG Auth] Reusing existing auth user:', userId);
        } else {
          // Create new auth user
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: crypto.randomUUID(), // Random password, they'll use TG to login
            email_confirm: true,
            user_metadata: {
              telegram_id: telegramId,
              display_name: displayName,
              avatar_url: photoUrl,
            }
          });

          if (createError) {
            console.error('[TG Auth] Create user error:', createError.message);
            throw createError;
          }
          userId = newUser.user!.id;
          console.log('[TG Auth] Created new auth user:', userId);
        }

        // Ensure profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!existingProfile) {
          // Check handle uniqueness
          let finalHandle = handle;
          const { data: handleCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('handle', handle)
            .maybeSingle();

          if (handleCheck) {
            finalHandle = `${handle}_${telegramId}`;
          }

          await supabase.from('profiles').insert({
            id: userId,
            display_name: displayName,
            handle: finalHandle,
            avatar_url: photoUrl || null,
            language: languageCode,
            country: null,
          });
          console.log('[TG Auth] Created profile:', finalHandle);
        }

        // Upsert telegram_users link
        if (existingTgUser) {
          await supabase
            .from('telegram_users')
            .update({
              user_id: userId,
              is_linked: true,
              telegram_username: username,
              telegram_first_name: firstName,
              telegram_last_name: lastName,
              preferred_language: languageCode,
              updated_at: new Date().toISOString(),
            })
            .eq('telegram_id', telegramId);
        } else {
          await supabase.from('telegram_users').insert({
            telegram_id: telegramId,
            user_id: userId,
            is_linked: true,
            telegram_username: username,
            telegram_first_name: firstName,
            telegram_last_name: lastName,
            preferred_language: languageCode,
          });
        }

        console.log('[TG Auth] Linked telegram user');
      }

      // Generate session tokens
      const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: `tg_${telegramId}@telegram.afuchat.app`,
      });

      if (authError) throw authError;

      // Use the OTP to verify and get tokens
      const magicUrl = new URL(authData.properties.action_link);
      const token = magicUrl.searchParams.get('token');

      // Verify the OTP to get actual session tokens
      const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          type: 'magiclink',
          token,
          redirect_to: `${req.headers.get('origin') || 'https://afuchat.com'}/home`,
        }),
      });

      // If verify gives us a redirect with tokens, parse them
      // Otherwise fall back to magic link approach
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        if (verifyData.access_token) {
          return new Response(
            JSON.stringify({
              success: true,
              access_token: verifyData.access_token,
              refresh_token: verifyData.refresh_token,
              user_id: userId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fallback: return magic link for client-side verification
      return new Response(
        JSON.stringify({
          success: true,
          magicLink: authData.properties.action_link,
          token,
          type: 'magiclink',
          user_id: userId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== MODE 2: Legacy telegramIdentifier lookup (non-TMA) =====
    if (telegramIdentifier) {
      console.log('[TG Auth] Legacy identifier mode');

      const cleanIdentifier = telegramIdentifier.replace('@', '').trim();
      const isPhoneNumber = /^\+?\d+$/.test(cleanIdentifier);

      let telegramUser: any = null;
      let profile: any = null;

      if (isPhoneNumber) {
        const { data: linkedUsers, error } = await supabase
          .from('telegram_users')
          .select(`*, profiles:user_id (id, phone_number, display_name, handle, avatar_url)`)
          .eq('is_linked', true);

        if (error) throw error;

        const matched = linkedUsers?.find(u => {
          const p = u.profiles as any;
          if (p?.phone_number) {
            const cleanPhone = p.phone_number.replace(/\D/g, '');
            const searchPhone = cleanIdentifier.replace(/\D/g, '');
            return cleanPhone.includes(searchPhone) || searchPhone.includes(cleanPhone);
          }
          return false;
        });

        if (matched) {
          telegramUser = matched;
          profile = matched.profiles;
        }
      } else {
        const { data, error } = await supabase
          .from('telegram_users')
          .select(`*, profiles:user_id (id, display_name, handle, avatar_url)`)
          .ilike('telegram_username', cleanIdentifier)
          .eq('is_linked', true)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          telegramUser = data;
          profile = data.profiles;
        }
      }

      if (!telegramUser || !telegramUser.user_id) {
        return new Response(
          JSON.stringify({ error: 'Authentication failed. Please check your credentials or sign up via @AfuChatBot' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(telegramUser.user_id);
      if (authError || !authUser?.user) {
        return new Response(
          JSON.stringify({ error: 'User account not found.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.user.email!,
        options: { redirectTo: `${req.headers.get('origin') || 'https://afuchat.com'}/home` }
      });

      if (linkError) throw linkError;

      const magicLinkUrl = new URL(linkData.properties.action_link);

      return new Response(
        JSON.stringify({
          success: true,
          magicLink: linkData.properties.action_link,
          token: magicLinkUrl.searchParams.get('token'),
          type: magicLinkUrl.searchParams.get('type'),
          email: authUser.user.email,
          telegramId: telegramUser.telegram_id,
          displayName: profile?.display_name || telegramUser.telegram_first_name,
          handle: profile?.handle
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Missing initData or telegramIdentifier' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    console.error('[TG Auth] Error:', error);
    const msg = error instanceof Error ? error.message : 'Authentication failed';
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
