UPDATE spots
SET
  description = 'Free skyline views over Manhattan, cold drinks in hand, and almost zero tourist energy. LIC Landing feels like a locals-only secret right on the waterfront.',
  one_liner = 'Free skyline views over Manhattan, cold drinks in hand, and almost zero tourist energy.',
  pro_tip = 'Arrive 30 to 45 minutes before sunset and head straight for the railing. It gets windy once the sun drops, so bring a light jacket.',
  subway = 'Take the 7 train to Vernon Blvd–Jackson Ave, then a quick 10-minute walk toward the water.',
  while_here = 'After the sunset, stroll the beautiful Gantry Plaza waterfront path. Then grab a great coffee or late bite at Sweetleaf. It is right nearby and way better than anything in Midtown.',
  best_time = 'Weekday sunsets from May through October',
  budget_note = 'Free entry. Drinks and food cost extra if you stay for a round.',
  vibe_tags = '["skyline-views","chill","waterfront","free","sunset"]',
  google_maps_url = 'https://www.google.com/maps/search/?api=1&query=LIC+Landing+Long+Island+City+NYC',
  photo_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/45-45_Center_Boulevard%2C_Long_Island_City%2C_New_York%2C_USA_-_Tower_against_cloudy_skyline.jpg',
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE slug = 'lic-landing-rooftop';
