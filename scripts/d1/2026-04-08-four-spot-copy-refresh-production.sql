UPDATE spots
SET
  name = 'Paulie Gee''s Slice Shop',
  neighborhood = 'Greenpoint',
  description = 'Craving pizza at 1 a.m. after a night out? Skip the sad Manhattan slices and head to Paulie Gee''s Slice Shop in Greenpoint. Their square Sicilian-style slices are crispy, cheesy, and actually worth the trip.',
  one_liner = 'Square Sicilian slices that are actually worth the late-night detour.',
  pro_tip = 'Go late on weekends when they stay open until 2 a.m. Cash is king and the line moves fast once the bars let out. Try the Hellboy if you like hot honey and pepperoni.',
  subway = 'G to Greenpoint Ave or L to Bedford Ave, then a short walk. Address: 110 Franklin St, Brooklyn.',
  while_here = 'Grab a nightcap at one of the dive bars nearby or walk over to L''Industrie if you want thin-crust instead.',
  best_time = 'Late on weekends, especially after midnight',
  avoid_time = 'Saturday right after the bars let out if you hate waiting for your slice',
  budget_note = 'Cheap enough to do two slices and keep moving.',
  vibe_tags = '["late-night","pizza","cheap","locals"]',
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE slug = 'best-slice-brooklyn-after-midnight';

UPDATE spots
SET
  description = 'Most jazz in Manhattan costs $20+ cover and feels like a tourist show. Head up to Harlem for the real thing - intimate sessions where locals actually hang out and musicians rotate in.',
  one_liner = 'Free-ish Harlem jazz nights that still feel local instead of staged.',
  pro_tip = 'Wednesday nights are the move. Show up early, sit at the bar, and order the jerk chicken - it''s cheap and excellent.',
  subway = '3 train to 149th Street or A/B/C/D to 145th or 155th. The spot sits right in the heart of Sugar Hill.',
  while_here = 'Grab a late slice or Dominican food from the spots right next door after the set ends.',
  best_time = 'Wednesday nights',
  avoid_time = 'Late Fridays if you want the music without a packed room',
  budget_note = 'Easy to keep the whole night under $20 if you keep it simple.',
  vibe_tags = '["jazz","free","locals","authentic"]',
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE slug = 'free-jazz-nights-harlem-locals-love';

UPDATE spots
SET
  description = '$1 oysters during happy hour that don''t suck? Yes, they still exist. The Wayland and similar East Village spots still do dollar oysters with solid cocktails in a chill Alphabet City vibe.',
  one_liner = 'Dollar oysters and a cheap-drinks window that still feels worth knowing about.',
  pro_tip = 'Go weekdays from 4 to 7 p.m. Order a dozen and pair them with a cold beer or martini. It fills up fast once happy hour hits.',
  subway = 'F/J/M/Z to Delancey-Essex or L to 1st Ave. Easy walk from the rest of the East Village.',
  while_here = 'Stroll over to a cheap Thai spot or dive bar afterward - it is a perfect cheap date-night combo.',
  best_time = 'Weekday happy hour from 4 to 7 p.m.',
  avoid_time = 'Right after work on Fridays if you want a seat without a wait',
  budget_note = 'Dollar oysters during happy hour, then solid cocktails without wrecking the night.',
  vibe_tags = '["oysters","happy-hour","cheap","east-village"]',
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE slug = 'best-dollar-oysters-east-village';

UPDATE spots
SET
  description = 'Utopia Bagels in Queens still does it right - hand-rolled, boiled the old way, with that perfect crispy crust and chewy inside. The scallion cream cheese is made fresh and actually tastes like scallions.',
  one_liner = 'Hand-rolled Queens bagels with scallion cream cheese that actually tastes right.',
  pro_tip = 'Go early on weekends before 10 a.m. or the line gets brutal. Cash or card both work now.',
  subway = '7 to 111th Street in the Flushing and Whitestone direction. Worth the short trip from Manhattan.',
  while_here = 'Walk five minutes to a solid Colombian bakery for coffee - the combo is unbeatable.',
  best_time = 'Early on weekend mornings',
  avoid_time = 'After 10 a.m. on weekends when the line gets heavy',
  budget_note = 'Classic breakfast pricing. Easy to justify an extra bagel for later.',
  vibe_tags = '["bagels","breakfast","classic","queens"]',
  updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE slug = 'best-bagel-nyc-not-ess-a-bagel';

DELETE FROM spot_tips
WHERE spot_id IN (
  SELECT id FROM spots WHERE slug IN (
    'best-slice-brooklyn-after-midnight',
    'free-jazz-nights-harlem-locals-love',
    'best-dollar-oysters-east-village',
    'best-bagel-nyc-not-ess-a-bagel'
  )
);

INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved, created_at)
VALUES
  ((SELECT id FROM spots WHERE slug = 'best-slice-brooklyn-after-midnight'), 'Best late-night slice in Brooklyn, hands down.', 'Alex', 'Williamsburg', 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ((SELECT id FROM spots WHERE slug = 'best-slice-brooklyn-after-midnight'), 'The square slices hit different at 1am.', 'Maria', NULL, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ((SELECT id FROM spots WHERE slug = 'free-jazz-nights-harlem-locals-love'), 'Real Harlem jazz, not the tourist version.', 'Carlos', NULL, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ((SELECT id FROM spots WHERE slug = 'free-jazz-nights-harlem-locals-love'), 'Best night out uptown for under $20 total.', 'Priya', NULL, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ((SELECT id FROM spots WHERE slug = 'best-dollar-oysters-east-village'), 'Best $1 oyster deal left in Manhattan.', 'Sarah', NULL, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ((SELECT id FROM spots WHERE slug = 'best-dollar-oysters-east-village'), 'Go early or the good ones run out.', 'Mike', NULL, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ((SELECT id FROM spots WHERE slug = 'best-bagel-nyc-not-ess-a-bagel'), 'Better than most Manhattan spots, no question.', 'David', NULL, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ((SELECT id FROM spots WHERE slug = 'best-bagel-nyc-not-ess-a-bagel'), 'Everything bagel with scallion is stupid good.', 'Alex', NULL, 1, CAST(strftime('%s','now') AS INTEGER) * 1000);
