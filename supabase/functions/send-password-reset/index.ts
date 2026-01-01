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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="text-align: center; padding: 30px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 15px 30px; border-radius: 12px;">
                <span style="font-size: 28px; font-weight: bold; color: #000; letter-spacing: 1px;">AfuChat</span>
              </div>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 20px; border: 1px solid #333; overflow: hidden;">
                
                <!-- Lock Icon -->
                <tr>
                  <td style="text-align: center; padding: 40px 40px 20px 40px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); width: 80px; height: 80px; border-radius: 50%; line-height: 80px;">
                      <span style="font-size: 40px;">🔐</span>
                    </div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td style="text-align: center; padding: 0 40px 10px 40px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      Password Reset Request
                    </h1>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="text-align: center; padding: 10px 40px 20px 40px;">
                    <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                      Hi <span style="color: #f59e0b; font-weight: 600;">${displayName}</span>,
                    </p>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="margin: 0; color: #d0d0d0; font-size: 16px; line-height: 1.8; text-align: center;">
                      We received a request to reset the password for your AfuChat account. Click the button below to create a new password.
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="text-align: center; padding: 10px 40px 30px 40px;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>

                <!-- Link Fallback -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="margin: 0; color: #666; font-size: 13px; text-align: center; line-height: 1.6;">
                      Or copy and paste this link into your browser:<br>
                      <a href="${resetLink}" style="color: #f59e0b; word-break: break-all; text-decoration: none;">${resetLink}</a>
                    </p>
                  </td>
                </tr>

                <!-- Expiry Warning -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 15px 20px;">
                      <p style="margin: 0; color: #f59e0b; font-size: 14px; text-align: center;">
                        ⏰ This link will expire in 1 hour for security reasons.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Security Notice -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="margin: 0; color: #888; font-size: 14px; text-align: center; line-height: 1.6;">
                      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Security Tips -->
          <tr>
            <td style="padding: 30px 0;">
              <table role="presentation" style="width: 100%; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid #222;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #888; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                      🛡️ Security Tips
                    </p>
                    <p style="margin: 0; color: #666; font-size: 12px; line-height: 1.6;">
                      Never share your password with anyone. AfuChat will never ask for your password via email or chat.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px 0 40px 0; border-top: 1px solid #222;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                © ${new Date().getFullYear()} AfuChat. All rights reserved.
              </p>
              <p style="margin: 0; color: #444; font-size: 11px;">
                This is an automated message from AfuChat. Please do not reply to this email.
              </p>
              <p style="margin: 15px 0 0 0;">
                <a href="https://afuchat.com" style="color: #f59e0b; text-decoration: none; font-size: 12px;">Visit AfuChat</a>
                <span style="color: #333; margin: 0 10px;">•</span>
                <a href="https://afuchat.com/support" style="color: #f59e0b; text-decoration: none; font-size: 12px;">Help Center</a>
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
