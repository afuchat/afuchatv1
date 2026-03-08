import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const { to, cc, bcc, subject, body_text, body_html } = await req.json();

    if (!to || !Array.isArray(to) || to.length === 0) {
      return new Response(JSON.stringify({ error: "Recipients required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender mailbox
    const { data: senderEmail } = await supabase.rpc("get_or_create_mailbox", { p_user_id: userId });
    if (!senderEmail) throw new Error("Could not create mailbox");

    // Create email record
    const { data: email, error: emailErr } = await supabase
      .from("afumail_emails")
      .insert({
        sender_id: userId,
        sender_email: senderEmail,
        subject: subject || "(No Subject)",
        body_text: body_text || "",
        body_html: body_html || null,
        is_draft: false,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (emailErr || !email) throw new Error("Failed to create email: " + emailErr?.message);

    // Add sender's sent folder entry
    await supabase.from("afumail_user_emails").insert({
      user_id: userId, email_id: email.id, folder: "sent", is_read: true,
    });

    // Process recipients
    const allRecipients: { email: string; type: string }[] = [];
    for (const addr of to) allRecipients.push({ email: addr, type: "to" });
    for (const addr of (cc || [])) allRecipients.push({ email: addr, type: "cc" });
    for (const addr of (bcc || [])) allRecipients.push({ email: addr, type: "bcc" });

    const recipientInserts = [];
    const internalDeliveries = [];

    for (const r of allRecipients) {
      // Check if internal @afuchat.com address
      if (r.email.endsWith("@afuchat.com")) {
        const handle = r.email.replace("@afuchat.com", "");
        const { data: recipientProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("handle", handle)
          .single();

        recipientInserts.push({
          email_id: email.id,
          recipient_email: r.email,
          recipient_id: recipientProfile?.id || null,
          recipient_type: r.type,
        });

        if (recipientProfile) {
          internalDeliveries.push({
            user_id: recipientProfile.id,
            email_id: email.id,
            folder: "inbox",
            is_read: false,
          });
        }
      } else {
        // External email - send via Resend
        recipientInserts.push({
          email_id: email.id,
          recipient_email: r.email,
          recipient_id: null,
          recipient_type: r.type,
        });
      }
    }

    // Insert recipients
    if (recipientInserts.length > 0) {
      await supabase.from("afumail_recipients").insert(recipientInserts);
    }

    // Deliver to internal users
    if (internalDeliveries.length > 0) {
      await supabase.from("afumail_user_emails").insert(internalDeliveries);
    }

    // Send external emails via Resend
    const externalRecipients = allRecipients.filter(r => !r.email.endsWith("@afuchat.com"));
    if (externalRecipients.length > 0) {
      const resendTo = externalRecipients.filter(r => r.type === "to").map(r => r.email);
      const resendCc = externalRecipients.filter(r => r.type === "cc").map(r => r.email);
      const resendBcc = externalRecipients.filter(r => r.type === "bcc").map(r => r.email);

      const resendPayload: Record<string, unknown> = {
        from: senderEmail,
        to: resendTo.length > 0 ? resendTo : undefined,
        cc: resendCc.length > 0 ? resendCc : undefined,
        bcc: resendBcc.length > 0 ? resendBcc : undefined,
        subject: subject || "(No Subject)",
        text: body_text || "",
        html: body_html || undefined,
      };

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      });

      if (!resendRes.ok) {
        const err = await resendRes.text();
        console.error("Resend error:", err);
        // Don't fail - email is saved internally
      } else {
        await resendRes.text();
      }
    }

    return new Response(JSON.stringify({ success: true, email_id: email.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AfuMail send error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
