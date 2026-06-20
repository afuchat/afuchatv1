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
    const payload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { from, to, cc, subject, text, html } = payload;
    if (!from || !to) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderEmail = typeof from === "string" ? from : from.email || from;
    const toList = Array.isArray(to) ? to : [to];
    const ccList = Array.isArray(cc) ? cc : cc ? [cc] : [];

    // Create the email record
    const { data: email, error: emailErr } = await supabase
      .from("afumail_emails")
      .insert({
        sender_id: null,
        sender_email: senderEmail,
        subject: subject || "(No Subject)",
        body_text: text || "",
        body_html: html || null,
        is_draft: false,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (emailErr || !email) {
      console.error("Failed to create inbound email:", emailErr);
      return new Response(JSON.stringify({ error: "Failed to store email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process recipients and deliver to internal mailboxes
    const allRecipients = [
      ...toList.map((e: string) => ({ email: e, type: "to" })),
      ...ccList.map((e: string) => ({ email: e, type: "cc" })),
    ];

    for (const r of allRecipients) {
      const addr = typeof r.email === "string" ? r.email : r.email;

      // Use the resolve function to find the user (handles mailbox, aliases, plus-addressing)
      let recipientId: string | null = null;
      if (addr.endsWith("@afuchat.com")) {
        const { data: resolvedId } = await supabase.rpc("resolve_afumail_recipient", {
          p_email: addr.toLowerCase(),
        });
        recipientId = resolvedId || null;
      }

      await supabase.from("afumail_recipients").insert({
        email_id: email.id,
        recipient_email: addr,
        recipient_id: recipientId,
        recipient_type: r.type,
      });

      // Deliver to internal user's inbox
      if (recipientId) {
        await supabase.from("afumail_user_emails").insert({
          user_id: recipientId,
          email_id: email.id,
          folder: "inbox",
          is_read: false,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AfuMail inbound error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
