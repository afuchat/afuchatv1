import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PESAPAL_CONSUMER_KEY = Deno.env.get('PESAPAL_CONSUMER_KEY')!;
const PESAPAL_CONSUMER_SECRET = Deno.env.get('PESAPAL_CONSUMER_SECRET')!;

// Production PesaPal API URLs
const PESAPAL_AUTH_URL = 'https://pay.pesapal.com/v3/api/Auth/RequestToken';
const PESAPAL_SUBMIT_ORDER_URL = 'https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest';
const PESAPAL_REGISTER_IPN_URL = 'https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN';
const PESAPAL_GET_STATUS_URL = 'https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus';

// ACoin pricing: 1 ACoin = $0.01 USD
const ACOIN_PRICE_USD = 0.01;

// Exchange rates to USD (approximate)
const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  'UGX': 0.00027,
  'KES': 0.0078,
  'TZS': 0.00039,
  'USD': 1,
  'NGN': 0.00065,
  'GHS': 0.067,
  'ZAR': 0.055,
  'RWF': 0.00078,
  'ZMW': 0.038,
  'MWK': 0.00058,
};

// Country to currency mapping
const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string }> = {
  'uganda': { code: 'UGX', symbol: 'UGX' },
  'kenya': { code: 'KES', symbol: 'KES' },
  'tanzania': { code: 'TZS', symbol: 'TZS' },
  'nigeria': { code: 'NGN', symbol: '₦' },
  'ghana': { code: 'GHS', symbol: 'GH₵' },
  'south africa': { code: 'ZAR', symbol: 'R' },
  'rwanda': { code: 'RWF', symbol: 'RWF' },
  'zambia': { code: 'ZMW', symbol: 'ZMW' },
  'malawi': { code: 'MWK', symbol: 'MWK' },
  'default': { code: 'USD', symbol: '$' },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to log steps
const logStep = (step: string, details?: any) => {
  console.log(`[PESAPAL] ${step}`, details ? JSON.stringify(details) : '');
};

// Get PesaPal auth token
async function getPesapalToken(): Promise<string> {
  logStep('Requesting PesaPal auth token');
  
  const response = await fetch(PESAPAL_AUTH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  });

  const data = await response.json();
  
  if (data.error || !data.token) {
    logStep('Auth failed', data);
    throw new Error(data.message || 'Failed to authenticate with PesaPal');
  }
  
  logStep('Auth successful', { expiryDate: data.expiryDate });
  return data.token;
}

// Register IPN URL and get notification_id
async function registerIPN(token: string, ipnUrl: string): Promise<string> {
  logStep('Registering IPN URL', { url: ipnUrl });
  
  const response = await fetch(PESAPAL_REGISTER_IPN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'POST',
    }),
  });

  const data = await response.json();
  
  if (data.error || !data.ipn_id) {
    logStep('IPN registration failed', data);
    throw new Error(data.message || 'Failed to register IPN URL');
  }
  
  logStep('IPN registered', { ipn_id: data.ipn_id });
  return data.ipn_id;
}

// Get currency based on user country
function getCurrencyForCountry(country: string | null): { code: string; symbol: string } {
  if (!country) return COUNTRY_CURRENCY['default'];
  const lowerCountry = country.toLowerCase();
  return COUNTRY_CURRENCY[lowerCountry] || COUNTRY_CURRENCY['default'];
}

// Convert ACoin amount to local currency
function acoinToLocalCurrency(acoinAmount: number, currencyCode: string): number {
  const usdAmount = acoinAmount * ACOIN_PRICE_USD;
  const rate = EXCHANGE_RATES_TO_USD[currencyCode] || 1;
  return Math.ceil(usdAmount / rate);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json() : {};
    const action = body.action || url.searchParams.get('action');

    logStep('Request received', { action, method: req.method });

    // Handle IPN callback from PesaPal
    if (action === 'ipn' || url.pathname.includes('/ipn')) {
      const orderTrackingId = body.OrderTrackingId || url.searchParams.get('OrderTrackingId');
      const orderMerchantReference = body.OrderMerchantReference || url.searchParams.get('OrderMerchantReference');
      const notificationType = body.OrderNotificationType || url.searchParams.get('OrderNotificationType');

      logStep('IPN callback received', { orderTrackingId, orderMerchantReference, notificationType });

      if (!orderTrackingId || !orderMerchantReference) {
        return new Response(
          JSON.stringify({ error: 'Missing order tracking data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get transaction status from PesaPal
      const token = await getPesapalToken();
      const statusResponse = await fetch(
        `${PESAPAL_GET_STATUS_URL}?orderTrackingId=${orderTrackingId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const statusData = await statusResponse.json();
      logStep('Transaction status', statusData);

      // Update pending transaction
      const { data: pendingTx, error: findError } = await supabase
        .from('pesapal_transactions')
        .select('*')
        .eq('merchant_reference', orderMerchantReference)
        .single();

      if (findError || !pendingTx) {
        logStep('Transaction not found', { orderMerchantReference, error: findError });
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Update transaction status
      const newStatus = statusData.status_code === 1 ? 'completed' 
        : statusData.status_code === 2 ? 'failed' 
        : statusData.status_code === 3 ? 'reversed'
        : 'pending';

      await supabase
        .from('pesapal_transactions')
        .update({
          status: newStatus,
          pesapal_tracking_id: orderTrackingId,
          payment_method: statusData.payment_method,
          confirmation_code: statusData.confirmation_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingTx.id);

      // If payment completed, credit ACoin to user
      if (newStatus === 'completed' && !pendingTx.acoin_credited) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('acoin')
          .eq('id', pendingTx.user_id)
          .single();

        if (profile) {
          const newBalance = (profile.acoin || 0) + pendingTx.acoin_amount;
          
          await supabase
            .from('profiles')
            .update({ acoin: newBalance })
            .eq('id', pendingTx.user_id);

          await supabase
            .from('pesapal_transactions')
            .update({ acoin_credited: true })
            .eq('id', pendingTx.id);

          // Record in acoin_transactions
          await supabase.from('acoin_transactions').insert({
            user_id: pendingTx.user_id,
            amount: pendingTx.acoin_amount,
            transaction_type: 'pesapal_purchase',
            metadata: {
              pesapal_tracking_id: orderTrackingId,
              confirmation_code: statusData.confirmation_code,
              payment_method: statusData.payment_method,
              currency: pendingTx.currency,
              amount_paid: pendingTx.amount,
            },
          });

          logStep('ACoin credited', { userId: pendingTx.user_id, amount: pendingTx.acoin_amount });
        }
      }

      // Return acknowledgment to PesaPal
      return new Response(
        JSON.stringify({
          orderNotificationType: notificationType,
          orderTrackingId: orderTrackingId,
          orderMerchantReference: orderMerchantReference,
          status: 200,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create payment order
    if (action === 'create-order') {
      const { userId, acoinAmount, callbackUrl } = body;

      if (!userId || !acoinAmount || acoinAmount < 50) {
        return new Response(
          JSON.stringify({ error: 'Invalid user or ACoin amount (minimum 50)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get user profile for country and contact info
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, display_name, phone_number, country')
        .eq('id', userId)
        .single();

      // Get user email from auth if not in profile
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = userProfile?.email || authUser?.user?.email;

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'User email not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const currency = getCurrencyForCountry(userProfile?.country);
      const amount = acoinToLocalCurrency(acoinAmount, currency.code);

      logStep('Creating order', { userId, acoinAmount, currency: currency.code, amount });

      // Get PesaPal token
      const token = await getPesapalToken();

      // Register IPN URL
      const ipnUrl = `${SUPABASE_URL}/functions/v1/pesapal-payment?action=ipn`;
      const notificationId = await registerIPN(token, ipnUrl);

      // Generate unique merchant reference
      const merchantReference = `ACOIN-${Date.now()}-${userId.substring(0, 8)}`;

      // Determine callback URL
      const finalCallbackUrl = callbackUrl || `${SUPABASE_URL.replace('.supabase.co', '.lovableproject.com')}/wallet?payment=success`;

      // Submit order to PesaPal
      const orderPayload = {
        id: merchantReference,
        currency: currency.code,
        amount: amount,
        description: `Purchase ${acoinAmount} ACoin`,
        callback_url: finalCallbackUrl,
        cancellation_url: finalCallbackUrl.replace('success', 'cancelled'),
        notification_id: notificationId,
        billing_address: {
          email_address: email,
          phone_number: userProfile?.phone_number || '',
          first_name: userProfile?.display_name?.split(' ')[0] || 'User',
          last_name: userProfile?.display_name?.split(' ').slice(1).join(' ') || '',
          country_code: currency.code === 'UGX' ? 'UG' 
            : currency.code === 'KES' ? 'KE' 
            : currency.code === 'TZS' ? 'TZ' 
            : '',
        },
      };

      logStep('Submitting order', orderPayload);

      const orderResponse = await fetch(PESAPAL_SUBMIT_ORDER_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderResponse.json();
      logStep('Order response', orderData);

      if (orderData.error || !orderData.redirect_url) {
        return new Response(
          JSON.stringify({ error: orderData.message || 'Failed to create payment order' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Save pending transaction
      await supabase.from('pesapal_transactions').insert({
        user_id: userId,
        merchant_reference: merchantReference,
        pesapal_tracking_id: orderData.order_tracking_id,
        acoin_amount: acoinAmount,
        amount: amount,
        currency: currency.code,
        status: 'pending',
      });

      return new Response(
        JSON.stringify({
          success: true,
          redirectUrl: orderData.redirect_url,
          orderTrackingId: orderData.order_tracking_id,
          merchantReference: merchantReference,
          amount: amount,
          currency: currency.code,
          acoinAmount: acoinAmount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check transaction status
    if (action === 'check-status') {
      const { merchantReference, orderTrackingId } = body;

      if (!merchantReference && !orderTrackingId) {
        return new Response(
          JSON.stringify({ error: 'Missing reference or tracking ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get from database
      let query = supabase.from('pesapal_transactions').select('*');
      if (merchantReference) {
        query = query.eq('merchant_reference', merchantReference);
      } else {
        query = query.eq('pesapal_tracking_id', orderTrackingId);
      }

      const { data: transaction } = await query.single();

      if (!transaction) {
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // If still pending, check with PesaPal
      if (transaction.status === 'pending' && transaction.pesapal_tracking_id) {
        const token = await getPesapalToken();
        const statusResponse = await fetch(
          `${PESAPAL_GET_STATUS_URL}?orderTrackingId=${transaction.pesapal_tracking_id}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        const statusData = await statusResponse.json();
        
        if (statusData.status_code === 1) {
          transaction.status = 'completed';
          // Credit if not already done
          if (!transaction.acoin_credited) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('acoin')
              .eq('id', transaction.user_id)
              .single();

            if (profile) {
              await supabase
                .from('profiles')
                .update({ acoin: (profile.acoin || 0) + transaction.acoin_amount })
                .eq('id', transaction.user_id);

              await supabase
                .from('pesapal_transactions')
                .update({ 
                  status: 'completed',
                  acoin_credited: true,
                  payment_method: statusData.payment_method,
                  confirmation_code: statusData.confirmation_code,
                })
                .eq('id', transaction.id);

              await supabase.from('acoin_transactions').insert({
                user_id: transaction.user_id,
                amount: transaction.acoin_amount,
                transaction_type: 'pesapal_purchase',
                metadata: {
                  pesapal_tracking_id: transaction.pesapal_tracking_id,
                  confirmation_code: statusData.confirmation_code,
                  payment_method: statusData.payment_method,
                },
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          status: transaction.status,
          acoinAmount: transaction.acoin_amount,
          amount: transaction.amount,
          currency: transaction.currency,
          acoinCredited: transaction.acoin_credited,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get available packages with pricing
    if (action === 'get-packages') {
      const { country } = body;
      const currency = getCurrencyForCountry(country);
      
      const packages = [
        { acoin: 50, label: '50 ACoin' },
        { acoin: 100, label: '100 ACoin' },
        { acoin: 250, label: '250 ACoin' },
        { acoin: 500, label: '500 ACoin' },
        { acoin: 1000, label: '1,000 ACoin' },
        { acoin: 2500, label: '2,500 ACoin' },
        { acoin: 5000, label: '5,000 ACoin' },
      ].map(pkg => ({
        ...pkg,
        amount: acoinToLocalCurrency(pkg.acoin, currency.code),
        currency: currency.code,
        currencySymbol: currency.symbol,
        priceUSD: (pkg.acoin * ACOIN_PRICE_USD).toFixed(2),
      }));

      return new Response(
        JSON.stringify({ packages, currency }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: any) {
    logStep('Error', { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
