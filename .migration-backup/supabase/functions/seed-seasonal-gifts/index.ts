import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
};

interface SeasonalGift {
  name: string;
  emoji: string;
  base_xp_cost: number;
  rarity: string;
  description: string;
  season: string;
  available_from: string;
  available_until: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify admin secret token
    const adminSecret = Deno.env.get('ADMIN_SECRET_TOKEN');
    const providedSecret = req.headers.get('x-admin-secret');
    
    if (!adminSecret || providedSecret !== adminSecret) {
      console.log('Unauthorized access attempt to seed-seasonal-gifts');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const seasonalGifts: SeasonalGift[] = [
      // Valentine's Day gifts
      {
        name: "Valentine Rose",
        emoji: "🌹",
        base_xp_cost: 30,
        rarity: "rare",
        description: "A special rose for Valentine's Day",
        season: "Valentine",
        available_from: "2025-02-01",
        available_until: "2025-02-15"
      },
      {
        name: "Chocolate Box",
        emoji: "🍫",
        base_xp_cost: 25,
        rarity: "rare",
        description: "Sweet chocolates for your valentine",
        season: "Valentine",
        available_from: "2025-02-01",
        available_until: "2025-02-15"
      },
      {
        name: "Love Letter",
        emoji: "💌",
        base_xp_cost: 20,
        rarity: "rare",
        description: "Express your feelings with a love letter",
        season: "Valentine",
        available_from: "2025-02-01",
        available_until: "2025-02-15"
      },
      // Halloween gifts
      {
        name: "Pumpkin",
        emoji: "🎃",
        base_xp_cost: 35,
        rarity: "rare",
        description: "Spooky Halloween pumpkin",
        season: "Halloween",
        available_from: "2025-10-15",
        available_until: "2025-11-01"
      },
      {
        name: "Ghost",
        emoji: "👻",
        base_xp_cost: 40,
        rarity: "rare",
        description: "Friendly Halloween ghost",
        season: "Halloween",
        available_from: "2025-10-15",
        available_until: "2025-11-01"
      },
      {
        name: "Candy Corn",
        emoji: "🍭",
        base_xp_cost: 15,
        rarity: "common",
        description: "Classic Halloween treat",
        season: "Halloween",
        available_from: "2025-10-15",
        available_until: "2025-11-01"
      },
      // Christmas gifts
      {
        name: "Santa Hat",
        emoji: "🎅",
        base_xp_cost: 50,
        rarity: "legendary",
        description: "Festive Santa hat for Christmas",
        season: "Christmas",
        available_from: "2025-12-01",
        available_until: "2025-12-26"
      },
      {
        name: "Snowman",
        emoji: "⛄",
        base_xp_cost: 45,
        rarity: "rare",
        description: "Build a snowman for the holidays",
        season: "Christmas",
        available_from: "2025-12-01",
        available_until: "2025-12-26"
      },
      {
        name: "Gift Box",
        emoji: "🎁",
        base_xp_cost: 30,
        rarity: "rare",
        description: "Wrapped present for Christmas",
        season: "Christmas",
        available_from: "2025-12-01",
        available_until: "2025-12-26"
      }
    ];

    // Insert seasonal gifts
    const { data: insertedGifts, error: insertError } = await supabaseClient
      .from('gifts')
      .insert(seasonalGifts)
      .select();

    if (insertError) {
      console.error('Error inserting gifts:', insertError);
      throw insertError;
    }

    // Create gift statistics for each new gift
    const giftStats = insertedGifts.map((gift: any) => ({
      gift_id: gift.id,
      price_multiplier: 1.00,
      total_sent: 0
    }));

    const { error: statsError } = await supabaseClient
      .from('gift_statistics')
      .insert(giftStats);

    if (statsError) {
      console.error('Error inserting gift statistics:', statsError);
      throw statsError;
    }

    console.log('Seasonal gifts seeded successfully:', insertedGifts.length);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Seasonal gifts seeded successfully',
        gifts: insertedGifts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in seed-seasonal-gifts function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
