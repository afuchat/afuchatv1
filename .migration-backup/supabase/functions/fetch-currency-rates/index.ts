import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseCurrency = 'USD' } = await req.json().catch(() => ({}));
    
    const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY');
    if (!apiKey) {
      throw new Error('Exchange rate API key not configured');
    }

    // Fetch rates from FastForex API
    const response = await fetch(
      `https://api.fastforex.io/fetch-all?from=${baseCurrency}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FastForex API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Return the rates
    return new Response(
      JSON.stringify({
        success: true,
        base: data.base,
        rates: data.results,
        lastUpdate: data.updated,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch currency rates';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
