import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { merchant_id } = await req.json();

    console.log('Syncing products for merchant:', merchant_id);

    // Get merchant details
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchant) {
      console.error('Merchant not found:', merchantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Build the products endpoint URL
    const baseUrl = merchant.api_endpoint.replace(/\/$/, '');
    const productsUrl = `${baseUrl}/functions/v1/products`;
    
    console.log('Fetching products from:', productsUrl);

    // Use stored API key from secrets
    const apiKey = Deno.env.get('SHOPSHACH_API_KEY') || merchant.api_key;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const apiResponse = await fetch(productsUrl, { headers });
    
    if (!apiResponse.ok) {
      console.error('API fetch failed:', apiResponse.status, apiResponse.statusText);
      const errorText = await apiResponse.text();
      console.error('Error response:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch products: ${apiResponse.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const productsData = await apiResponse.json();
    console.log('Received products data:', JSON.stringify(productsData).slice(0, 500));

    // Handle different response formats
    const products = Array.isArray(productsData) ? productsData : productsData.products || productsData.data || [];

    if (!Array.isArray(products)) {
      console.error('Invalid products format:', typeof productsData);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid products format from API' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing', products.length, 'products');

    let synced = 0;
    let errors = 0;

    for (const product of products) {
      try {
        const productData = {
          merchant_id: merchant.id,
          external_id: String(product.id || product.external_id),
          name: product.name || product.title,
          description: product.description || null,
          price: parseFloat(product.price) || 0,
          stock: parseInt(product.stock || product.quantity || product.stock_quantity) || 0,
          category: product.category || null,
          image_url: product.image_url || product.imageUrl || product.image || (Array.isArray(product.image_urls) ? product.image_urls[0] : null),
          is_available: product.is_available !== false,
          updated_at: new Date().toISOString(),
        };

        console.log('Upserting product:', productData.name);

        const { error: upsertError } = await supabase
          .from('merchant_products')
          .upsert(productData, { 
            onConflict: 'merchant_id,external_id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error('Error upserting product:', product.id, upsertError);
          errors++;
        } else {
          synced++;
        }
      } catch (e) {
        console.error('Error processing product:', product.id, e);
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from('merchants')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', merchant.id);

    console.log(`Sync complete: ${synced} synced, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        errors,
        total: products.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});