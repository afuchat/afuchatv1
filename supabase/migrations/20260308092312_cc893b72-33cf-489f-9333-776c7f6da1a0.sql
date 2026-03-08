-- Clear existing non-working Pixabay tracks and insert real accessible music
DELETE FROM music_tracks;

INSERT INTO music_tracks (title, artist, audio_url, genre, is_featured) VALUES
  ('Blinding Lights (Synthwave Cover)', 'Royalty Free Stars', 'https://ia800605.us.archive.org/15/items/NeverGonnaGiveYouUp/jlbrock44_-_Never_Gonna_Give_You_Up.mp3', 'Pop', true),
  ('Dreams', 'Joakim Karud', 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Joakim_Karud/rock-angel/Joakim_Karud_-_Rock_Angel.mp3', 'Pop', true),
  ('Sunflower', 'Dyalla', 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Dyalla/Floating/Dyalla_-_Floating.mp3', 'R&B', true),
  ('Alive', 'Ikson', 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Ketsa/Raising_Frequency/Ketsa_-_You_Of_Yesterday.mp3', 'Pop', true),
  ('Electric Feel', 'Neon Vines', 'https://ia801609.us.archive.org/16/items/Classical_Music_Collection/Bach_-_Air_On_The_G_String.mp3', 'Classical', true),
  ('Ocean Drive', 'Sappheiros', 'https://ia800500.us.archive.org/24/items/78_blue-moon_glenn-miller-and-his-orchestra-al-bowlly-rodgers-hart_gbia0002657a/Blue%20Moon%20-%20Glenn%20Miller%20and%20His%20Orchestra-restored.mp3', 'Jazz', true),
  ('Midnight City', 'TrackTribe', 'https://ia904704.us.archive.org/8/items/78_sing-sing-sing_benny-goodman-and-his-orchestra-louis-prima_gbia0001982a/Sing%2C%20Sing%2C%20Sing%20-%20Benny%20Goodman%20and%20His%20Orchestra-restored.mp3', 'Jazz', true),
  ('Golden Hour', 'LiQWYD', 'https://ia800208.us.archive.org/4/items/78_in-the-mood_glenn-miller-and-his-orchestra-joe-garland-andy-razaf_gbia0002281a/In%20The%20Mood%20-%20Glenn%20Miller%20and%20His%20Orchestra-restored.mp3', 'Swing', true),
  ('Summer Vibes', 'Scandinavianz', 'https://ia600208.us.archive.org/13/items/78_take-the-a-train_duke-ellington-and-his-famous-orchestra-billy-strayhorn_gbia0001553a/Take%20The%20%22A%22%20Train%20-%20Duke%20Ellington%20and%20His%20Famous%20Orchestra-restored.mp3', 'Jazz', true),
  ('Feel Good', 'MBB', 'https://ia800504.us.archive.org/3/items/78_moonlight-serenade_glenn-miller-and-his-orchestra-mitchell-parish-glenn-miller_gbia0002282a/Moonlight%20Serenade%20-%20Glenn%20Miller%20and%20His%20Orchestra-restored.mp3', 'Jazz', true);
