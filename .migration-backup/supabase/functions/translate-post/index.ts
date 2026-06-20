import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    // Check premium subscription if user is authenticated
    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      const userId = payload.sub;

      if (userId) {
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
      }
    }

    const { text, targetLanguage } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'ar': 'Arabic',
      'sw': 'Swahili',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    const systemPrompt = `You are a professional translator. Translate the given text to ${targetLangName}. 
Only return the translated text, nothing else. 
Preserve @mentions, hashtags, and emojis exactly as they appear.
If the text is already in ${targetLangName}, return it unchanged.`;

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
          { role: 'user', content: text }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Translation API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        text: text.substring(0, 100),
        targetLanguage
      });

      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI service payment required' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (response.status === 503) {
        return new Response(JSON.stringify({ 
          error: 'Translation service temporarily unavailable' 
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Translation API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from Lovable AI');
    }
    
    const translatedText = data.choices[0].message.content;

    return new Response(JSON.stringify({ translatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in translate-post:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
