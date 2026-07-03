INSERT INTO neighborhoods (
  name, slug, borough, vibe, best_for, safety_notes, getting_around, stay_here_if, skip_if, photo_url, latitude, longitude
)
VALUES (
  'Harlem',
  'harlem',
  'manhattan',
  'Historic, musical, and full of neighborhood institutions. Go for jazz, soul food, brownstone blocks, and a pace that still feels lived in.',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  borough = excluded.borough,
  vibe = excluded.vibe;

INSERT INTO spots (
  name, slug, title, neighborhood, borough, category, description, one_liner, pro_tip, subway, while_here,
  best_time, avoid_time, budget_note, vibe_tags, price_level, latitude, longitude, google_maps_url, photo_url,
  source, published, created_at, updated_at
)
VALUES (
  'L''Industrie Pizzeria',
  'best-slice-brooklyn-after-midnight',
  'Best Slice in Brooklyn After Midnight',
  'Williamsburg',
  'brooklyn',
  'pizza',
  'L''Industrie is one of those rare New York pizza spots that deserves the hype and still feels like a local move late at night. The crust stays crisp, the cheese actually tastes like something, and the slice still lands when the rest of the neighborhood is winding down. If you are in Williamsburg after midnight and want one reliable move, this is it.' || char(10) || char(10) ||
  'The crowd is a mix of locals, cooks getting off shift, and people trying to salvage a night with one very good slice. Keep it simple. Start with a plain slice, then decide if you need another. This is the kind of place that reminds you pizza in New York does not need a big speech around it. It just needs to be good.',
  'L''Industrie never disappoints at 2am.',
  'Show up after midnight and order one plain slice first. If the burrata slice is still up, grab that second.',
  'L to Bedford Ave, then walk south toward Metropolitan Ave',
  'Walk Bedford for a late coffee or head toward Domino Park if you want a quieter finish to the night.',
  'After midnight on a weeknight',
  'Friday and Saturday from 8-10pm when the dinner line swells',
  'Slices around $5-7. Cash moves fastest when the line is long.',
  '["pizza","late-night","brooklyn","locals","worth-it"]',
  1,
  NULL, NULL, NULL, NULL,
  NULL,
  1,
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  title = excluded.title,
  neighborhood = excluded.neighborhood,
  borough = excluded.borough,
  category = excluded.category,
  description = excluded.description,
  one_liner = excluded.one_liner,
  pro_tip = excluded.pro_tip,
  subway = excluded.subway,
  while_here = excluded.while_here,
  best_time = excluded.best_time,
  avoid_time = excluded.avoid_time,
  budget_note = excluded.budget_note,
  vibe_tags = excluded.vibe_tags,
  price_level = excluded.price_level,
  published = excluded.published,
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000;

INSERT INTO spots (
  name, slug, title, neighborhood, borough, category, description, one_liner, pro_tip, subway, while_here,
  best_time, avoid_time, budget_note, vibe_tags, price_level, latitude, longitude, google_maps_url, photo_url,
  source, published, created_at, updated_at
)
VALUES (
  'St. Nick''s Pub',
  'free-jazz-nights-harlem-locals-love',
  'Free Jazz Nights Harlem Locals Love',
  'Harlem',
  'manhattan',
  'bar',
  'St. Nick''s Pub has the kind of Harlem jazz-night energy that expensive downtown venues spend a lot of money trying to fake. The room is tight, the band is close, and the whole thing feels like you stumbled into something that has been good for a long time without needing outside approval. When the right group is playing, the whole place locks in.' || char(10) || char(10) ||
  'This is not a polished concert hall. That is exactly the point. It is a neighborhood room with real musicians, people who know when to clap, and enough noise around the edges to make it feel alive. If you want a jazz night that feels local instead of packaged for tourists, start here.',
  'St. Nick''s Pub on Wednesdays. Real vibes.',
  'Go on Wednesday before 8pm if you want a seat near the band. Bring cash for drinks and tips.',
  'A/B/C/D to 125th St, then walk west',
  'Walk Frederick Douglass Blvd after the set if you want soul food or one more drink.',
  'Wednesday night, 7:30-10pm',
  'Friday after 10pm when the room gets much louder',
  'No big-ticket cover strategy here, just drinks, tips, and a little patience.',
  '["jazz","harlem","live-music","bar","locals"]',
  2,
  NULL, NULL, NULL, NULL,
  NULL,
  1,
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  title = excluded.title,
  neighborhood = excluded.neighborhood,
  borough = excluded.borough,
  category = excluded.category,
  description = excluded.description,
  one_liner = excluded.one_liner,
  pro_tip = excluded.pro_tip,
  subway = excluded.subway,
  while_here = excluded.while_here,
  best_time = excluded.best_time,
  avoid_time = excluded.avoid_time,
  budget_note = excluded.budget_note,
  vibe_tags = excluded.vibe_tags,
  price_level = excluded.price_level,
  published = excluded.published,
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000;

INSERT INTO spots (
  name, slug, title, neighborhood, borough, category, description, one_liner, pro_tip, subway, while_here,
  best_time, avoid_time, budget_note, vibe_tags, price_level, latitude, longitude, google_maps_url, photo_url,
  source, published, created_at, updated_at
)
VALUES (
  'Utopia Bagels',
  'best-bagel-nyc-not-ess-a-bagel',
  'Best Bagel in NYC That Isn''t Ess-a-Bagel',
  'Queens',
  'queens',
  'food',
  'Utopia Bagels is the answer people from Queens give when they are tired of Manhattan-only bagel discourse. The bagels come out shiny, properly boiled, and sturdy enough to hold an aggressive amount of cream cheese without collapsing. The scallion cream cheese is the move, and the whole experience feels less performative than the usual tourist favorites.' || char(10) || char(10) ||
  'This is the kind of breakfast stop you build a morning around. You go a little out of your way, you order more than you meant to, and you immediately understand why people stay loyal to it. If someone tells you the best bagel in the city requires a Queens detour, this is what they mean.',
  'Utopia Bagel in Queens. Fresh boiled, stupid good scallion cream cheese.',
  'Go early and order one to eat right away plus one extra for later. The scallion cream cheese is not optional.',
  'Q46 from Kew Gardens or a short cab if you are already in central Queens',
  'Take the bagels to a park bench and eat slowly instead of carrying them back into Manhattan.',
  'Early weekend morning',
  'Sunday after 11am when the family line gets long',
  'Bagels are cheap enough to justify ordering a backup.',
  '["bagels","queens","breakfast","classic","worth-the-trip"]',
  1,
  NULL, NULL, NULL, NULL,
  NULL,
  1,
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  title = excluded.title,
  neighborhood = excluded.neighborhood,
  borough = excluded.borough,
  category = excluded.category,
  description = excluded.description,
  one_liner = excluded.one_liner,
  pro_tip = excluded.pro_tip,
  subway = excluded.subway,
  while_here = excluded.while_here,
  best_time = excluded.best_time,
  avoid_time = excluded.avoid_time,
  budget_note = excluded.budget_note,
  vibe_tags = excluded.vibe_tags,
  price_level = excluded.price_level,
  published = excluded.published,
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000;

INSERT INTO spots (
  name, slug, title, neighborhood, borough, category, description, one_liner, pro_tip, subway, while_here,
  best_time, avoid_time, budget_note, vibe_tags, price_level, latitude, longitude, google_maps_url, photo_url,
  source, published, created_at, updated_at
)
VALUES (
  'Upstate Craft Beer & Oyster Bar',
  'best-dollar-oysters-east-village',
  'Best Dollar Oysters in the East Village',
  'East Village',
  'manhattan',
  'food',
  'Dollar-oyster happy hours in New York can feel fake once you actually arrive. This one does not. The room stays small enough to feel useful, the oysters move fast enough to stay fresh, and the whole thing still feels like a move locals text each other instead of blasting all over TikTok.' || char(10) || char(10) ||
  'The right way to do this is simple: get there early, sit at the bar, order oysters and one cold drink, then decide if the night is staying there or moving somewhere else in the East Village. It is a clean, low-drama win when you want something that feels like a secret but is actually dependable.',
  'Happy hour that actually feels like a secret. Go before 7pm.',
  'Be there before 6pm if you want a bar seat and the easiest first round.',
  'F to 2nd Ave or 6 to Astor Place, then walk east',
  'Keep the night going on Avenue B or cut through Tompkins Square Park if you want some air first.',
  'Weekday happy hour before 7pm',
  'Friday after work when every stool disappears immediately',
  'Dollar oysters during happy hour, drinks separate.',
  '["oysters","happy-hour","east-village","locals","bar-food"]',
  2,
  NULL, NULL, NULL, NULL,
  NULL,
  1,
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  title = excluded.title,
  neighborhood = excluded.neighborhood,
  borough = excluded.borough,
  category = excluded.category,
  description = excluded.description,
  one_liner = excluded.one_liner,
  pro_tip = excluded.pro_tip,
  subway = excluded.subway,
  while_here = excluded.while_here,
  best_time = excluded.best_time,
  avoid_time = excluded.avoid_time,
  budget_note = excluded.budget_note,
  vibe_tags = excluded.vibe_tags,
  price_level = excluded.price_level,
  published = excluded.published,
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000;

INSERT INTO spots (
  name, slug, title, neighborhood, borough, category, description, one_liner, pro_tip, subway, while_here,
  best_time, avoid_time, budget_note, vibe_tags, price_level, latitude, longitude, google_maps_url, photo_url,
  source, published, created_at, updated_at
)
VALUES (
  'Jackson Heights Food Crawl',
  'jackson-heights-food-crawl-tourist-spot',
  'Jackson Heights Food Crawl That Beats Any Tourist Spot',
  'Queens',
  'queens',
  'food',
  'If you only do one food crawl outside Manhattan, make it Jackson Heights. The whole point is that you can walk a few blocks and hit Colombian bakeries, Tibetan momo counters, Thai snacks, and random stalls that look better than most planned dinner reservations. It feels alive in a way a polished tourist food hall never can.' || char(10) || char(10) ||
  'Do not overplan this one. The best version is loose: one stop because the grill smoke smells right, another because a line looks local, then one more because someone at the last place told you where to go next. Jackson Heights rewards curiosity more than structure, which is why it is one of the best food neighborhoods in the city.',
  'Colombian, Thai, and Tibetan all within three blocks. Pure flavor.',
  'Show up hungry and split everything. Momos first, then arepas, then whatever looks busiest on Roosevelt.',
  '7/E/F/M/R to Jackson Heights-Roosevelt Ave',
  'Walk 74th St and Roosevelt with no fixed plan. The point is to follow the lines and steam coming off the grills.',
  'Saturday afternoon',
  'Right at lunch rush if you hate waiting between stops',
  'Easy to keep under $25 a person if you share smartly.',
  '["food-crawl","queens","jackson-heights","street-food","multi-stop"]',
  1,
  NULL, NULL, NULL, NULL,
  NULL,
  1,
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  title = excluded.title,
  neighborhood = excluded.neighborhood,
  borough = excluded.borough,
  category = excluded.category,
  description = excluded.description,
  one_liner = excluded.one_liner,
  pro_tip = excluded.pro_tip,
  subway = excluded.subway,
  while_here = excluded.while_here,
  best_time = excluded.best_time,
  avoid_time = excluded.avoid_time,
  budget_note = excluded.budget_note,
  vibe_tags = excluded.vibe_tags,
  price_level = excluded.price_level,
  published = excluded.published,
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000;

INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved, created_at)
SELECT s.id, 'One plain slice and one special is the move. Eat it standing outside while the block is still loud.', 'Nico', 'Greenpoint', 1, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM spots s
WHERE s.slug = 'best-slice-brooklyn-after-midnight'
  AND NOT EXISTS (
    SELECT 1 FROM spot_tips t
    WHERE t.spot_id = s.id
      AND t.text = 'One plain slice and one special is the move. Eat it standing outside while the block is still loud.'
  );

INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved, created_at)
SELECT s.id, 'Wednesday is the night. Get there early enough to hear the room warm up before the set really takes off.', 'Aisha', 'Harlem', 1, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM spots s
WHERE s.slug = 'free-jazz-nights-harlem-locals-love'
  AND NOT EXISTS (
    SELECT 1 FROM spot_tips t
    WHERE t.spot_id = s.id
      AND t.text = 'Wednesday is the night. Get there early enough to hear the room warm up before the set really takes off.'
  );

INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved, created_at)
SELECT s.id, 'Scallion cream cheese deserves the hype. Order extra napkins and do not wait until noon.', 'Evan', 'Forest Hills', 1, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM spots s
WHERE s.slug = 'best-bagel-nyc-not-ess-a-bagel'
  AND NOT EXISTS (
    SELECT 1 FROM spot_tips t
    WHERE t.spot_id = s.id
      AND t.text = 'Scallion cream cheese deserves the hype. Order extra napkins and do not wait until noon.'
  );

INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved, created_at)
SELECT s.id, 'Be in your seat before 6 and order a cold beer right away. The whole thing works better if you start early.', 'Maya', 'Alphabet City', 1, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM spots s
WHERE s.slug = 'best-dollar-oysters-east-village'
  AND NOT EXISTS (
    SELECT 1 FROM spot_tips t
    WHERE t.spot_id = s.id
      AND t.text = 'Be in your seat before 6 and order a cold beer right away. The whole thing works better if you start early.'
  );

INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved, created_at)
SELECT s.id, 'Do not build a perfect route. The best version is wandering and following the busiest counter each time.', 'Rafi', 'Jackson Heights', 1, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM spots s
WHERE s.slug = 'jackson-heights-food-crawl-tourist-spot'
  AND NOT EXISTS (
    SELECT 1 FROM spot_tips t
    WHERE t.spot_id = s.id
      AND t.text = 'Do not build a perfect route. The best version is wandering and following the busiest counter each time.'
  );
