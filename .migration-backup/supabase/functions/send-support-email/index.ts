import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: SupportEmailRequest = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Helper function to send email via Resend API
    const sendEmail = async (emailData: any): Promise<ResendResponse> => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      return response.json();
    };

    // Send email to support
    const supportEmailResponse = await sendEmail({
      from: "AfuChat Support <onboarding@resend.dev>",
      to: ["support@afuchat.com"],
      reply_to: email,
      subject: `Support Request: ${subject}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    // Send confirmation email to user
    const confirmationEmailResponse = await sendEmail({
      from: "AfuChat Support <onboarding@resend.dev>",
      to: [email],
      subject: "We received your support request",
      html: `
        <h1>Thank you for contacting AfuChat Support, ${name}!</h1>
        <p>We have received your support request and will get back to you as soon as possible.</p>
        
        <h2>Your Request Details:</h2>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        
        <hr />
        <p>Our support team typically responds within 24-48 hours.</p>
        <p>Best regards,<br>AfuChat Support Team</p>
        <p style="color: #666; font-size: 12px;">If you need urgent assistance, you can also email us directly at support@afuchat.com</p>
      `,
    });

    console.log("Support email sent successfully:", supportEmailResponse);
    console.log("Confirmation email sent successfully:", confirmationEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Your support request has been sent successfully" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send support email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
