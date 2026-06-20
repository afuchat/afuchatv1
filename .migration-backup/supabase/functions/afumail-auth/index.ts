import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// AfuMail API edge function endpoint
const AFUMAIL_API_URL = "https://vfcukxlzqfeehhkiogpf.supabase.co/functions/v1/afumail-api";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      grant_type,
      code,
      refresh_token,
      user_id,
      redirect_uri,
      client_id,
    } = await req.json();

    // Always use server-side OAuth credentials to avoid client/server mismatches.
    const clientId = Deno.env.get("AFUMAIL_CLIENT_ID");
    const clientSecret = Deno.env.get("AFUMAIL_CLIENT_SECRET");
    const afumailAnonKey = Deno.env.get("AFUMAIL_API_ANON_KEY");

    // Log only non-sensitive info for debugging.
    console.log("AfuMail OAuth config loaded", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasAfuMailAnonKey: !!afumailAnonKey,
      providedClientId: !!client_id,
    });

    if (!clientId || !clientSecret) {
      console.error("Missing AfuMail credentials", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!afumailAnonKey) {
      console.error("Missing AFUMAIL_API_ANON_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error - missing API key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${grant_type} request for user: ${user_id}`);

    // Build form data for token exchange
    const formData = new URLSearchParams();
    formData.append("grant_type", grant_type);
    formData.append("client_id", clientId);
    formData.append("client_secret", clientSecret);

    if (grant_type === "authorization_code" && code) {
      formData.append("code", code);
      formData.append(
        "redirect_uri",
        redirect_uri || "https://afuchat.com/auth/afumail/callback",
      );
    } else if (grant_type === "refresh_token" && refresh_token) {
      formData.append("refresh_token", refresh_token);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid grant_type or missing parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Calling AfuMail API: ${AFUMAIL_API_URL}/oauth/token`);
    console.log(`Using redirect_uri: ${redirect_uri}`);

    // Call AfuMail OAuth endpoint.
    // This endpoint lives behind the AfuMail project's edge function, so it needs that project's anon key.
    // It also expects X-User-Id for routing.
    const response = await fetch(`${AFUMAIL_API_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "apikey": afumailAnonKey,
        "Authorization": `Bearer ${afumailAnonKey}`,
        "X-User-Id": user_id || "",
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log(`AfuMail response status: ${response.status}`);
    console.log(`AfuMail response body: ${responseText.slice(0, 500)}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse AfuMail response as JSON");
      return new Response(
        JSON.stringify({ error: "Invalid response from AfuMail API", details: responseText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!response.ok) {
      console.error("AfuMail OAuth token error:", data);
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in afumail-auth:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
