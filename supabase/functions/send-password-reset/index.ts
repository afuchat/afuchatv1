import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePasswordResetEmailHtml(displayName: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - AfuChat</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #111318; color: #fafafa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #111318;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 500px; width: 100%; border-collapse: collapse;">
          
          <!-- Logo -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <span style="font-size: 24px; font-weight: 700; color: #00C2CB; letter-spacing: -0.5px;">AfuChat</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #1a1d24; border-radius: 12px; padding: 40px;">
              
              <!-- Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">🔐</span>
              </div>

              <!-- Title -->
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #fafafa; text-align: center;">
                Reset Your Password
              </h1>

              <!-- Message -->
              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #a1a1aa; text-align: center;">
                Hi ${displayName}, we received a request to reset your password. Click the button below to create a new one.
              </p>

              <!-- Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${resetLink}" style="display: inline-block; background-color: #00C2CB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Reset Password
                </a>
              </div>

              <!-- Link fallback -->
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #71717a; text-align: center; word-break: break-all;">
                Or copy this link: <a href="${resetLink}" style="color: #00C2CB; text-decoration: none;">${resetLink}</a>
              </p>

              <!-- Expiry -->
              <div style="background-color: #222630; border-radius: 8px; padding: 12px 16px; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
                  ⏰ This link expires in 1 hour
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #52525b;">
                Didn't request this? You can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #3f3f46;">
                © ${new Date().getFullYear()} AfuChat · <a href="https://afuchat.com" style="color: #00C2CB; text-decoration: none;">afuchat.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetLink, displayName } = await req.json();

    if (!email || !resetLink) {
      throw new Error("Email and resetLink are required");
    }

    const userName = displayName || email.split("@")[0];
    const html = generatePasswordResetEmailHtml(userName, resetLink);

    console.log(`Sending password reset email to: ${email}`);

    const { data, error } = await resend.emails.send({
      from: "AfuChat <noreply@afuchat.com>",
      to: [email],
      subject: "🔐 Reset Your AfuChat Password",
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Password reset email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
