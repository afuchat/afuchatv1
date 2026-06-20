import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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

    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Either imageUrl or imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare image content
    let imageContent;
    if (imageBase64) {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        }
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      };
    }

    console.log("Calling Lovable AI for image description...");

    // Call Lovable AI with vision
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an accessibility expert that generates concise, descriptive alt text for images. Focus on the main subject, actions, and relevant details. Keep descriptions under 125 characters when possible, but be thorough when needed. Do not start with 'An image of' or 'A picture of' - just describe what you see. Generate accessible alt text for this image. Be specific and descriptive."
              },
              imageContent
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate description" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("Invalid Lovable AI response:", data);
      return new Response(
        JSON.stringify({ error: "No description generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const description = data.choices[0].message.content.trim();

    if (!description) {
      console.error("No description in response:", data);
      return new Response(
        JSON.stringify({ error: "No description generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generated description:", description);

    return new Response(
      JSON.stringify({ 
        description,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating image description:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
