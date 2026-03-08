import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hmacSha256(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateInitData(initData: string, botToken: string): Promise<{ valid: boolean; data: Record<string, string> }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false, data: {} };

    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = await hmacSha256('WebAppData', botToken);
    const checkHashBytes = await hmacSha256(secretKey, dataCheckString);
    const checkHash = bytesToHex(checkHashBytes);

    const data: Record<string, string> = {};
    for (const [k, v] of params.entries()) data[k] = v;

    return { valid: checkHash === hash, data };
  } catch (err) {
    console.error('[TG Auth] Validation error:', err);
    return { valid: false, data: {} };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { initData, telegramIdentifier, linkToUserId } = body;

    console.log('[TG Auth] Request received:', { hasInitData: !!initData, hasTelegramIdentifier: !!telegramIdentifier, hasLinkToUserId: !!linkToUserId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!botToken) {
      console.error('[TG Auth] TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ===== MODE 1: Telegram Mini App initData =====
    if (initData) {
      console.log('[TG Auth] initData mode - validating...');

      const { valid, data } = await validateInitData(initData, botToken);
      
      if (!valid) {
        console.error('[TG Auth] Invalid initData signature');
        return new Response(
          JSON.stringify({ error: 'Invalid Telegram authentication' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      console.log('[TG Auth] initData validated successfully');

      // Check auth_date freshness (5 min window)
      const authDate = parseInt(data['auth_date'] || '0');
      if (Date.now() / 1000 - authDate > 300) {
        console.log('[TG Auth] Auth expired, age:', Date.now() / 1000 - authDate);
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
      let photoUrl = user.photo_url || '';
      const languageCode = user.language_code || 'en';

      // Fetch photo from Bot API if missing
      if (!photoUrl && telegramId) {
        try {
          const photosRes = await fetch(
            `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
          );
          const photosData = await photosRes.json();
          if (photosData.ok && photosData.result?.total_count > 0) {
            const fileId = photosData.result.photos[0][0].file_id;
            const fileRes = await fetch(
              `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
            );
            const fileData = await fileRes.json();
            if (fileData.ok && fileData.result?.file_path) {
              photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
            }
          }
        } catch (e) {
          console.log('[TG Auth] Could not fetch profile photo:', e);
        }
      }

      if (!telegramId) {
        return new Response(
          JSON.stringify({ error: 'No user data in Telegram init' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('[TG Auth] Telegram user:', { telegramId, username, firstName });

      // ===== LINK MODE: Link existing account to Telegram =====
      if (linkToUserId) {
        console.log('[TG Auth] Link mode — linking Telegram to user:', linkToUserId);

        // Verify the user exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', linkToUserId)
          .maybeSingle();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        // Check if this Telegram is already linked to another user
        const { data: existingTgUser } = await supabase
          .from('telegram_users')
          .select('user_id, is_linked')
          .eq('telegram_id', telegramId)
          .maybeSingle();

        if (existingTgUser?.is_linked && existingTgUser.user_id !== linkToUserId) {
          return new Response(
            JSON.stringify({ error: 'This Telegram account is already linked to another user' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          );
        }

        // Upsert telegram_users link
        if (existingTgUser) {
          await supabase
            .from('telegram_users')
            .update({
              user_id: linkToUserId,
              is_linked: true,
              telegram_username: username || existingTgUser.user_id,
              telegram_first_name: firstName,
              telegram_last_name: lastName,
              preferred_language: languageCode,
              updated_at: new Date().toISOString(),
            })
            .eq('telegram_id', telegramId);
        } else {
          await supabase.from('telegram_users').insert({
            telegram_id: telegramId,
            user_id: linkToUserId,
            is_linked: true,
            telegram_username: username,
            telegram_first_name: firstName,
            telegram_last_name: lastName,
            preferred_language: languageCode,
          });
        }

        // Update avatar if missing
        if (photoUrl) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', linkToUserId)
            .maybeSingle();
          
          if (userProfile && !userProfile.avatar_url) {
            await supabase
              .from('profiles')
              .update({ avatar_url: photoUrl })
              .eq('id', linkToUserId);
          }
        }

        console.log('[TG Auth] Successfully linked Telegram to existing user');
        return new Response(
          JSON.stringify({ success: true, linked: true, user_id: linkToUserId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== NORMAL LOGIN/SIGNUP MODE =====
      const { data: existingTgUser } = await supabase
        .from('telegram_users')
        .select('*, profiles:user_id (id, display_name, handle, avatar_url)')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      let userId: string;
      const email = `tg_${telegramId}@telegram.afuchat.app`;

      if (existingTgUser?.user_id && existingTgUser?.is_linked) {
        // Existing linked user — sign them in
        userId = existingTgUser.user_id;
        console.log('[TG Auth] Existing linked user:', userId);

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

        // Try to create user first; if email already exists, fetch via generateLink
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: {
            telegram_id: telegramId,
            display_name: displayName,
            avatar_url: photoUrl,
          }
        });

        if (createError && createError.message?.includes('already been registered')) {
          // User exists — get their ID via generateLink
          const { data: linkCheck } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email,
          });
          if (linkCheck?.user?.id) {
            userId = linkCheck.user.id;
            console.log('[TG Auth] Reusing existing auth user:', userId);
          } else {
            throw new Error('Could not find existing user');
          }
        } else if (createError) {
          console.error('[TG Auth] Create user error:', createError.message);
          throw createError;
        } else {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: crypto.randomUUID(),
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

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!existingProfile) {
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

      // Generate session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (linkError) {
        console.error('[TG Auth] Magic link error:', linkError.message);
        throw linkError;
      }

      const magicUrl = new URL(linkData.properties.action_link);
      const token = magicUrl.searchParams.get('token');

      return new Response(
        JSON.stringify({
          success: true,
          token,
          type: 'magiclink',
          user_id: userId,
          email,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== MODE 2: Legacy telegramIdentifier lookup =====
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
