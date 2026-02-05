const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

interface PexelsResponse {
  page: number;
  per_page: number;
  total_results: number;
  videos: PexelsVideo[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page = 1, perPage = 10, query } = await req.json();

    const apiKey = Deno.env.get('PEXELS_API_KEY');
    if (!apiKey) {
      console.error('PEXELS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Video API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the API URL - use search if query provided, otherwise popular videos
    let apiUrl: string;
    if (query) {
      apiUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
    } else {
      // Fetch popular/trending videos
      apiUrl = `https://api.pexels.com/videos/popular?per_page=${perPage}&page=${page}`;
    }

    console.log('Fetching videos from Pexels:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pexels API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Pexels API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: PexelsResponse = await response.json();

    // Transform videos to a simplified format with vertical/short videos prioritized
    const videos = data.videos
      .filter(video => video.duration <= 60) // Only short videos (under 60 seconds)
      .map(video => {
        // Get the best quality vertical video file
        const verticalFiles = video.video_files
          .filter(f => f.height > f.width) // Vertical orientation
          .sort((a, b) => b.height - a.height); // Highest quality first

        // Fallback to any file if no vertical found
        const videoFile = verticalFiles[0] || video.video_files.sort((a, b) => b.height - a.height)[0];

        return {
          id: video.id.toString(),
          videoUrl: videoFile?.link || '',
          thumbnailUrl: video.image,
          duration: video.duration,
          width: videoFile?.width || 0,
          height: videoFile?.height || 0,
          author: {
            name: video.user.name,
            profileUrl: video.user.url,
          },
          source: 'pexels',
        };
      })
      .filter(v => v.videoUrl); // Only include videos with valid URLs

    console.log(`Fetched ${videos.length} short videos`);

    return new Response(
      JSON.stringify({
        success: true,
        videos,
        page: data.page,
        totalResults: data.total_results,
        hasMore: data.page * perPage < data.total_results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching videos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch videos';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
