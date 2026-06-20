import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // Get expired stories
    const { data: expiredStories, error: fetchError } = await supabaseClient
      .from('stories')
      .select('id, media_url')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired stories:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredStories?.length || 0} expired stories to permanently delete`);

    if (expiredStories && expiredStories.length > 0) {
      const storyIds = expiredStories.map(s => s.id);

      // 1. Delete related story_views first (FK constraint)
      const { error: viewsError } = await supabaseClient
        .from('story_views')
        .delete()
        .in('story_id', storyIds);

      if (viewsError) {
        console.error('Error deleting story views:', viewsError);
      }

      // 2. Delete media files from storage
      for (const story of expiredStories) {
        try {
          const url = new URL(story.media_url);
          const pathParts = url.pathname.split('/');
          const fileName = pathParts.slice(pathParts.indexOf('stories') + 1).join('/');

          if (fileName) {
            const { error: storageError } = await supabaseClient.storage
              .from('stories')
              .remove([fileName]);

            if (storageError) {
              console.error(`Error deleting file ${fileName}:`, storageError);
            }
          }
        } catch (error) {
          console.error('Error processing story media:', error);
        }
      }

      // 3. Permanently delete story records from database
      const { error: deleteError } = await supabaseClient
        .from('stories')
        .delete()
        .lt('expires_at', now);

      if (deleteError) {
        console.error('Error deleting expired stories:', deleteError);
        throw deleteError;
      }

      console.log(`Permanently deleted ${expiredStories.length} expired stories (records + media + views)`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: expiredStories?.length || 0,
        message: 'Expired stories permanently deleted'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup-expired-stories function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
