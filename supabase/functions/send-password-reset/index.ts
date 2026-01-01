import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePasswordResetEmailHtml(displayName: string, resetLink: string): string {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - AfuChat</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <a href="https://afuchat.com" style="text-decoration: none;">
                <img src="https://afuchat.com/logo.jpg" alt="AfuChat" width="48" height="48" style="display: inline-block; border-radius: 12px; vertical-align: middle;" />
                <span style="font-size: 28px; font-weight: 700; color: #00C2CB; letter-spacing: -0.5px; vertical-align: middle; margin-left: 12px;">AfuChat</span>
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              
              <!-- Title -->
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
                Password Reset Request
              </h1>

              <!-- Greeting -->
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Hello ${displayName},
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                We received a request to reset the password associated with your AfuChat account. If you made this request, please click the button below to set a new password.
              </p>

              <!-- Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #00C2CB; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset My Password
                </a>
              </div>

              <!-- Expiry Notice -->
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #71717a; text-align: center;">
                This link will expire in <strong>1 hour</strong> for your security.
              </p>

              <!-- Link fallback -->
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 0; font-size: 13px; color: #00C2CB; word-break: break-all;">
                  <a href="${resetLink}" style="color: #00C2CB; text-decoration: none;">${resetLink}</a>
                </p>
              </div>

              <!-- Security Notice -->
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #18181b;">
                  Didn't request this?
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              
              <!-- Company Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <a href="https://afuchat.com" style="color: #00C2CB; text-decoration: none; font-weight: 600; font-size: 14px;">AfuChat</a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">
                      AfuChat Technologies Ltd.<br>
                      Kampala, Uganda
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <a href="https://afuchat.com/privacy" style="color: #71717a; text-decoration: none; font-size: 12px; margin: 0 8px;">Privacy Policy</a>
                    <span style="color: #d4d4d8;">|</span>
                    <a href="https://afuchat.com/terms" style="color: #71717a; text-decoration: none; font-size: 12px; margin: 0 8px;">Terms of Service</a>
                    <span style="color: #d4d4d8;">|</span>
                    <a href="https://afuchat.com/support" style="color: #71717a; text-decoration: none; font-size: 12px; margin: 0 8px;">Help Center</a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      © ${currentYear} AfuChat Technologies Ltd. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                      This is an automated message from AfuChat. Please do not reply directly to this email.<br>
                      For support, visit <a href="https://afuchat.com/support" style="color: #00C2CB; text-decoration: none;">afuchat.com/support</a>
                    </p>
                  </td>
                </tr>
              </table>

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
      from: "AfuChat <no-reply@afuchat.com>",
      to: [email],
      subject: "Reset Your AfuChat Password",
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
