import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Curated list of real royalty-free music from reliable public CDNs
const REAL_TRACKS = [
  // Lofi / Chill
  { title: "Lofi Study", artist: "FASSounds", genre: "lofi", audio_url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3", is_featured: true },
  { title: "Good Night", artist: "FASSounds", genre: "lofi", audio_url: "https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3", is_featured: false },
  { title: "Lofi Chill", artist: "BoDLeKs", genre: "lofi", audio_url: "https://cdn.pixabay.com/download/audio/2024/11/04/audio_4956b4edd1.mp3", is_featured: true },
  { title: "Chill Lofi Song", artist: "Lexin Music", genre: "lofi", audio_url: "https://cdn.pixabay.com/download/audio/2023/07/19/audio_e4d2378c2b.mp3", is_featured: false },
  // Hip-hop / Beats
  { title: "Hip Hop 02", artist: "DayFox", genre: "hip-hop", audio_url: "https://cdn.pixabay.com/download/audio/2022/01/20/audio_4add39cce0.mp3", is_featured: true },
  { title: "Powerful Beat", artist: "SuperPhat", genre: "hip-hop", audio_url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_3481b70271.mp3", is_featured: false },
  { title: "Abstract Fashion", artist: "QubeSounds", genre: "hip-hop", audio_url: "https://cdn.pixabay.com/download/audio/2023/09/25/audio_1b4c9e0fd1.mp3", is_featured: true },
  // Pop / Trending
  { title: "Upbeat Pop", artist: "Lesfm", genre: "pop", audio_url: "https://cdn.pixabay.com/download/audio/2022/10/18/audio_2dba704a0f.mp3", is_featured: true },
  { title: "Happy Day", artist: "TuGuedes", genre: "pop", audio_url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_276f75a730.mp3", is_featured: false },
  { title: "Summer Walk", artist: "Olexy", genre: "pop", audio_url: "https://cdn.pixabay.com/download/audio/2022/08/25/audio_4f3b0a8791.mp3", is_featured: true },
  { title: "Energy", artist: "Winnie The Moog", genre: "pop", audio_url: "https://cdn.pixabay.com/download/audio/2023/04/12/audio_4ec10e1a5f.mp3", is_featured: false },
  // EDM / Electronic
  { title: "Phonk", artist: "KaizanBlu", genre: "phonk", audio_url: "https://cdn.pixabay.com/download/audio/2023/08/30/audio_4bfac78a5d.mp3", is_featured: true },
  { title: "Drive Breakbeat", artist: "RockOT", genre: "electronic", audio_url: "https://cdn.pixabay.com/download/audio/2024/03/18/audio_e6c07a13de.mp3", is_featured: false },
  { title: "Cyberpunk", artist: "Evgeny Bardyuzha", genre: "electronic", audio_url: "https://cdn.pixabay.com/download/audio/2023/10/02/audio_4c0277e44c.mp3", is_featured: true },
  // Afrobeat / African
  { title: "Afro Beat", artist: "Joseph McDade", genre: "afrobeat", audio_url: "https://cdn.pixabay.com/download/audio/2023/06/22/audio_35570a1e0c.mp3", is_featured: true },
  { title: "African Drums", artist: "Music Unlimited", genre: "afrobeat", audio_url: "https://cdn.pixabay.com/download/audio/2022/04/18/audio_04e3a63df7.mp3", is_featured: true },
  { title: "Amapiano Vibes", artist: "SoulProdMusic", genre: "amapiano", audio_url: "https://cdn.pixabay.com/download/audio/2023/11/27/audio_1c50b3d0f9.mp3", is_featured: true },
  { title: "African Journey", artist: "PNGroove", genre: "afrobeat", audio_url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_7f3e301faa.mp3", is_featured: false },
  // R&B / Soul
  { title: "Warm Memories", artist: "PremiumTrax", genre: "r&b", audio_url: "https://cdn.pixabay.com/download/audio/2023/01/16/audio_0e79bf3312.mp3", is_featured: false },
  { title: "Smooth RnB", artist: "SoulProdMusic", genre: "r&b", audio_url: "https://cdn.pixabay.com/download/audio/2023/05/08/audio_3c3cb0a76b.mp3", is_featured: true },
  // Cinematic / Motivational
  { title: "Inspiring Cinematic", artist: "RomanSenykMusic", genre: "cinematic", audio_url: "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d04cf85a46.mp3", is_featured: true },
  { title: "Motivation", artist: "Lesfm", genre: "motivational", audio_url: "https://cdn.pixabay.com/download/audio/2023/03/23/audio_4e58eb7a46.mp3", is_featured: false },
  // Trending / Viral sounds
  { title: "Trap Future Bass", artist: "Oleg Fedak", genre: "trap", audio_url: "https://cdn.pixabay.com/download/audio/2022/05/13/audio_257112842c.mp3", is_featured: true },
  { title: "Electronic Rock King", artist: "AlexiAction", genre: "rock", audio_url: "https://cdn.pixabay.com/download/audio/2022/10/12/audio_870b52a8dc.mp3", is_featured: false },
  { title: "Freestyle Type Beat", artist: "prod.riddiman", genre: "hip-hop", audio_url: "https://cdn.pixabay.com/download/audio/2023/02/28/audio_8ca49a30bb.mp3", is_featured: true },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clear old placeholder tracks
    await supabase.from("music_tracks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert real tracks
    const tracksToInsert = REAL_TRACKS.map((t) => ({
      title: t.title,
      artist: t.artist,
      genre: t.genre,
      audio_url: t.audio_url,
      is_featured: t.is_featured,
      usage_count: Math.floor(Math.random() * 500) + 10,
      duration_seconds: 6,
    }));

    const { data, error } = await supabase
      .from("music_tracks")
      .insert(tracksToInsert)
      .select();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inserted ${data?.length} real music tracks`);
    return new Response(
      JSON.stringify({ success: true, count: data?.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
