import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
 
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
 
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: 'Authorization header required' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const jwt = authHeader.replace('Bearer ', '');
     const payload = JSON.parse(atob(jwt.split('.')[1]));
     const userId = payload.sub;
 
     if (!userId) {
       return new Response(
         JSON.stringify({ error: 'User ID not found' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
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
 
     const { prompt, model, editImage } = await req.json();
 
     if (!prompt || typeof prompt !== 'string') {
       return new Response(
         JSON.stringify({ error: 'Prompt is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
     if (!LOVABLE_API_KEY) {
       throw new Error('LOVABLE_API_KEY not configured');
     }
 
     // Use the image generation model
     const imageModel = model || 'google/gemini-2.5-flash-image';
     
     console.log('Generating image with model:', imageModel, 'prompt:', prompt.substring(0, 100));
 
     // Build messages for image generation
     const messages: any[] = [];
     
     if (editImage) {
       // Image editing mode
       messages.push({
         role: 'user',
         content: [
           { type: 'text', text: prompt },
           { type: 'image_url', image_url: { url: editImage } }
         ]
       });
     } else {
       // Text-to-image mode
       messages.push({
         role: 'user',
         content: prompt
       });
     }
 
     const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${LOVABLE_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         model: imageModel,
         messages: messages,
         modalities: ['image', 'text'],
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error('Image generation error:', response.status, errorText);
       
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
       throw new Error(`Image generation error: ${response.status}`);
     }
 
     const data = await response.json();
     
     const textContent = data.choices?.[0]?.message?.content || '';
     const images = data.choices?.[0]?.message?.images || [];
 
     if (images.length === 0) {
       return new Response(JSON.stringify({ 
         reply: textContent || 'I was unable to generate an image. Please try a different prompt.',
         images: []
       }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
    // Upload generated images to storage with AfuAI watermark indicator in metadata
    const uploadedImages: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i]?.image_url?.url;
      if (!imageData) continue;

      // Extract base64 data
      const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        uploadedImages.push(imageData); // Return as-is if not base64
        continue;
      }

      const [, imageType, base64Data] = base64Match;
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to storage with AfuAI watermark metadata
      const fileName = `${userId}/${Date.now()}-${i}-afuai.${imageType}`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('ai-generated-images')
        .upload(fileName, imageBuffer, {
          contentType: `image/${imageType}`,
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Fall back to base64 URL if upload fails
        uploadedImages.push(imageData);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('ai-generated-images')
          .getPublicUrl(fileName);
        uploadedImages.push(publicUrl);
      }
    }
 
     // Award XP for using AI image generation
     await supabaseAdmin.rpc('award_xp', {
       p_user_id: userId,
       p_action_type: 'use_ai',
       p_xp_amount: 10,
       p_metadata: { action: 'generate_ai_image' }
     });
 
     return new Response(JSON.stringify({ 
       reply: textContent || 'Here is your generated image!',
       images: uploadedImages
     }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error) {
     console.error('Error in generate-ai-image:', error);
     return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });