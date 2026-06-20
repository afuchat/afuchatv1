import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting (fallback to a default)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Apply rate limiting
    if (!checkRateLimit(clientIp)) {
      console.log('Rate limit exceeded for:', clientIp);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { giftId, giftName, emoji, rarity } = await req.json();
    
    if (!giftId || !giftName || !emoji) {
      throw new Error('Gift ID, name and emoji are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if gift already has a generated image - ALWAYS return cached if exists
    const { data: existingGift } = await supabase
      .from('gifts')
      .select('image_url')
      .eq('id', giftId)
      .single();

    if (existingGift?.image_url) {
      console.log('Using cached image for gift:', giftId);
      return new Response(
        JSON.stringify({ imageUrl: existingGift.image_url }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify the gift exists in database before generating (prevents arbitrary gift creation)
    const { data: giftExists, error: giftError } = await supabase
      .from('gifts')
      .select('id, name')
      .eq('id', giftId)
      .single();

    if (giftError || !giftExists) {
      console.log('Gift not found in database:', giftId);
      return new Response(
        JSON.stringify({ error: 'Gift not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const RUNWARE_API_KEY = Deno.env.get('RUNWARE_API_KEY');
    if (!RUNWARE_API_KEY) {
      throw new Error('RUNWARE_API_KEY is not configured');
    }

    // Create TikTok-style 3D emoji gift icons - small, glossy, realistic
    const rarityStyles = {
      common: 'simple 3D emoji style, clean glossy finish, soft pastel colors, minimal design',
      uncommon: 'polished 3D emoji icon, vibrant glossy colors, smooth shading, slightly enhanced details',
      rare: 'premium 3D rendered icon, rich saturated colors, metallic sheen, crystal-clear glossy finish, subtle glow effect, highly detailed',
      epic: 'ultra-premium 3D masterpiece icon, brilliant glowing colors, glass-like reflections, golden accents, diamond-like sparkle, luxury feel',
      legendary: 'legendary hyper-detailed 3D icon, radiant golden glow, crystalline reflections, premium luxury materials, jewel-encrusted appearance, divine ethereal shine'
    };

    const style = rarityStyles[rarity as keyof typeof rarityStyles] || rarityStyles.common;
    
    const prompt = `A single small ${giftName} ${emoji} 3D emoji icon. TikTok gift style.

STYLE: ${style}

CRITICAL REQUIREMENTS:
- Small compact 3D emoji icon, NOT a realistic object
- Glossy, smooth, cartoon-3D style like TikTok/iOS emoji
- Cute, rounded, adorable design aesthetic
- Transparent PNG background - ONLY the icon visible
- NO background, NO floor, NO shadows, NO environment
- Centered, floating in transparent void
- Bright, vibrant, eye-catching colors
- Professional app icon quality
- 512x512px size

The icon should look like a premium mobile app gift sticker - small, cute, 3D glossy emoji style with ${rarity === 'rare' || rarity === 'epic' || rarity === 'legendary' ? 'premium shine, glow effects, and luxury details' : 'clean simple design'}.

IMPORTANT: Pure transparent background. Only the small 3D emoji icon should be visible.`;

    console.log('Generating image with Runware for gift:', giftId);

    const response = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          taskType: "authentication",
          apiKey: RUNWARE_API_KEY
        },
        {
          taskType: "imageInference",
          taskUUID: crypto.randomUUID(),
          positivePrompt: prompt,
          width: 512,
          height: 512,
          model: "runware:100@1",
          numberResults: 1,
          outputFormat: "PNG",
          CFGScale: 1,
          scheduler: "FlowMatchEulerDiscreteScheduler",
          steps: 4
        }
      ])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Runware API error:', response.status, errorText);
      throw new Error(`Runware API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.find((item: any) => item.taskType === 'imageInference')?.imageURL;

    if (!imageUrl) {
      throw new Error('No image data in response');
    }

    console.log('Image generated successfully for gift:', giftId);

    // Save the image URL to the database
    await supabase
      .from('gifts')
      .update({ image_url: imageUrl })
      .eq('id', giftId);

    console.log('Image URL saved to database for gift:', giftId);

    return new Response(
      JSON.stringify({ imageUrl }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating gift image:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
