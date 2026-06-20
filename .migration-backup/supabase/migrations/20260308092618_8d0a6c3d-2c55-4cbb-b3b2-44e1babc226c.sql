-- Replace with simpler, reliable public domain music URLs
DELETE FROM music_tracks;

INSERT INTO music_tracks (title, artist, audio_url, genre, is_featured) VALUES
  ('Gymnopedie No.1', 'Erik Satie', 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Gymnopedie_No._1.ogg', 'Classical', true),
  ('Clair de Lune', 'Claude Debussy', 'https://upload.wikimedia.org/wikipedia/commons/8/80/Clair_de_lune_%28Debussy%29.ogg', 'Classical', true),
  ('Fur Elise', 'Ludwig van Beethoven', 'https://upload.wikimedia.org/wikipedia/commons/5/55/Beethoven_-_F%C3%BCr_Elise.ogg', 'Classical', true),
  ('Moonlight Sonata', 'Ludwig van Beethoven', 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Piano_Sonata_No._14_in_C_Sharp_Minor_%22Moonlight_Sonata%22_-_I._Adagio_sostenuto.ogg', 'Classical', true),
  ('Spring - Four Seasons', 'Antonio Vivaldi', 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Vivaldi_-_Four_Seasons_1_Spring_-_1._Allegro.ogg', 'Classical', true),
  ('Canon in D', 'Johann Pachelbel', 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Pachelbel%27s_Canon.ogg', 'Classical', true),
  ('Prelude in C Major', 'J.S. Bach', 'https://upload.wikimedia.org/wikipedia/commons/1/15/Bach_-_Pair_of_Preludes_%281%29.ogg', 'Classical', true),
  ('Waltz of the Flowers', 'Tchaikovsky', 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Tchaikovsky_-_Waltz_of_the_Flowers.ogg', 'Classical', true),
  ('Hungarian Rhapsody No.2', 'Franz Liszt', 'https://upload.wikimedia.org/wikipedia/commons/2/26/Franz_Liszt_-_Hungarian_Rhapsody_no._2%2C_orchestral.ogg', 'Classical', true),
  ('The Blue Danube', 'Johann Strauss II', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Johann_Strauss_II_-_An_der_sch%C3%B6nen_blauen_Donau.ogg', 'Classical', true);