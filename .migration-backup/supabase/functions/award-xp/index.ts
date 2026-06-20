import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface XPRequest {
  userId: string;
  actionType: string;
  xpAmount: number;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, actionType, xpAmount, metadata = {} }: XPRequest = await req.json();

    // Call the award_xp function
    const { error } = await supabaseClient.rpc('award_xp', {
      p_user_id: userId,
      p_action_type: actionType,
      p_xp_amount: xpAmount,
      p_metadata: metadata
    });

    if (error) {
      console.error('Error awarding XP:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user earned any achievements
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('xp, current_grade')
      .eq('id', userId)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        xp: profile?.xp || 0,
        grade: profile?.current_grade || 'Newcomer'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in award-xp function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});