import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ACoin pricing: 1 ACoin = $0.01
const ACOIN_PRICE_USD = 0.01;
// Rate: 100 ACoin = 77 Stars (0.77 stars per ACoin)
const STARS_PER_ACOIN = 0.77;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, acoinAmount, telegramPaymentChargeId, telegramUserId, providerPaymentChargeId } = await req.json();

    console.log('Telegram ACoin payment request:', { action, userId, acoinAmount, telegramUserId });

    if (action === 'create-invoice') {
      // Create a Telegram payment invoice for ACoin purchase
      if (!userId || !acoinAmount || acoinAmount < 1) {
        return new Response(
          JSON.stringify({ error: 'Invalid user or ACoin amount' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Calculate stars: 100 ACoin = 77 Stars (0.77 per ACoin)
      const starsAmount = Math.max(1, Math.ceil(acoinAmount * STARS_PER_ACOIN));
      const priceUSD = acoinAmount * ACOIN_PRICE_USD;

      // Get user's telegram_id
      const { data: telegramUser } = await supabase
        .from('telegram_users')
        .select('telegram_id')
        .eq('user_id', userId)
        .single();

      if (!telegramUser?.telegram_id) {
        return new Response(
          JSON.stringify({ error: 'User not linked to Telegram. Please link your account first.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Create invoice link using Telegram Bot API
      const invoicePayload = {
        chat_id: telegramUser.telegram_id,
        title: `${acoinAmount} ACoin`,
        description: `Purchase ${acoinAmount.toLocaleString()} ACoin for your AfuChat wallet`,
        payload: JSON.stringify({ userId, acoinAmount, type: 'acoin_purchase' }),
        currency: 'XTR', // Telegram Stars
        prices: [{ label: `${acoinAmount} ACoin`, amount: starsAmount }],
        provider_token: '', // Empty for Telegram Stars
      };

      const invoiceResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendInvoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      const invoiceResult = await invoiceResponse.json();
      console.log('Invoice creation result:', invoiceResult);

      if (!invoiceResult.ok) {
        console.error('Failed to create invoice:', invoiceResult);
        return new Response(
          JSON.stringify({ error: 'Failed to create payment invoice', details: invoiceResult }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invoice sent to Telegram',
          starsAmount,
          priceUSD: priceUSD.toFixed(2)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'confirm-payment') {
      // This is called when Telegram sends a successful_payment update
      if (!userId || !acoinAmount || !telegramPaymentChargeId) {
        return new Response(
          JSON.stringify({ error: 'Missing payment confirmation data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if this payment has already been processed
      const { data: existingTx } = await supabase
        .from('acoin_transactions')
        .select('id')
        .eq('metadata->>telegram_charge_id', telegramPaymentChargeId)
        .single();

      if (existingTx) {
        console.log('Payment already processed:', telegramPaymentChargeId);
        return new Response(
          JSON.stringify({ success: true, message: 'Payment already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Get user's current ACoin balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('acoin')
        .eq('id', userId)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Update user's ACoin balance
      const newBalance = (profile.acoin || 0) + acoinAmount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ acoin: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update ACoin balance:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to credit ACoin' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Record the transaction
      await supabase.from('acoin_transactions').insert({
        user_id: userId,
        amount: acoinAmount,
        transaction_type: 'telegram_purchase',
        metadata: {
          telegram_charge_id: telegramPaymentChargeId,
          provider_charge_id: providerPaymentChargeId,
          price_usd: (acoinAmount * ACOIN_PRICE_USD).toFixed(2)
        }
      });

      console.log(`Successfully credited ${acoinAmount} ACoin to user ${userId}`);

      return new Response(
        JSON.stringify({ success: true, newBalance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'get-packages') {
      // Return available ACoin packages: min 50, rate 100 ACoin = 77 Stars
      const packages = [
        { acoin: 50, stars: 39, priceUSD: '0.50' },
        { acoin: 100, stars: 77, priceUSD: '1.00' },
        { acoin: 250, stars: 193, priceUSD: '2.50' },
        { acoin: 500, stars: 385, priceUSD: '5.00' },
        { acoin: 1000, stars: 770, priceUSD: '10.00' },
      ];

      return new Response(
        JSON.stringify({ packages, acoinPriceUSD: ACOIN_PRICE_USD }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: any) {
    console.error('Telegram ACoin payment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
