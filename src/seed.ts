/**
 * Seed script — generates SQL INSERT statements for 10 NYC spots, tips, and neighborhoods.
 *
 * Usage:
 *   npx tsx src/seed.ts > seed.sql
 *   wrangler d1 execute findernyc-production --remote --file=seed.sql
 */

function sq(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

function nullable(s: string | null): string {
  return s === null ? "NULL" : sq(s);
}

const now = Date.now();

// ─── Spots ──────────────────────────────────────────────────────────────────

interface Spot {
  name: string;
  slug: string;
  title: string;
  neighborhood: string;
  borough: string;
  category: string;
  description: string;
  one_liner: string;
  pro_tip: string;
  subway: string;
  while_here: string;
  best_time: string;
  avoid_time: string | null;
  budget_note: string;
  vibe_tags: string[];
  price_level: number;
}

const spots: Spot[] = [
  {
    name: "LIC Landing",
    slug: "lic-landing-rooftop",
    title: "Secret Rooftop in Queens With Zero Tourists",
    neighborhood: "Long Island City",
    borough: "queens",
    category: "rooftop",
    description:
      "LIC Landing is one of those places that makes you feel like you cracked the code on New York. It sits right on the waterfront in Long Island City with the entire Manhattan skyline stretched out in front of you — and somehow, nobody from out of town knows it exists. The vibes lean chill beer garden: picnic tables, string lights, food vendors rotating through.\n\nCome at sunset and grab a spot near the railing. The light hitting Midtown from across the East River is genuinely unreal. On weekends there's usually live music or a DJ, but it never gets obnoxious. This is where Queens locals go when they want skyline views without the Times Square energy.",
    one_liner: "Waterfront beer garden with the best skyline view you've never heard of.",
    pro_tip: "Get there 45 minutes before sunset to claim a railing spot. Bring a light jacket — it gets windy off the river.",
    subway: "7 to Vernon Blvd–Jackson Ave, then a 10-minute walk toward the water",
    while_here: "Walk along the Gantry Plaza State Park waterfront path. The old gantry cranes are lit up at night and look incredible.",
    best_time: "Weekday sunset, May through October",
    avoid_time: "Weekend afternoons in peak summer — it gets packed",
    budget_note: "Beers $8-12, food truck plates $10-15. No cover.",
    vibe_tags: ["skyline-views", "chill", "waterfront", "beer-garden", "sunset"],
    price_level: 2,
  },
  {
    name: "Los Tacos No. 1",
    slug: "los-tacos-no-1-chelsea",
    title: "The Only Taco Spot in Manhattan Worth Standing in Line For",
    neighborhood: "Chelsea",
    borough: "manhattan",
    category: "food",
    description:
      "Los Tacos No. 1 started inside Chelsea Market and became the kind of place where the line itself is part of the experience. The corn tortillas are made fresh right in front of you — you can hear them slapping the press — and the adobada is legitimately some of the best in the city. It's a counter-service operation, no frills, just excellent tacos.\n\nThe Chelsea Market location is the original and still the best. The space is tiny and loud and you'll probably end up eating standing up, which is exactly right. Don't overthink the menu: adobada, carne asada, and a nopal if you're feeling virtuous. Three tacos and a horchata and you're out for under twenty bucks.",
    one_liner: "Fresh-pressed tortillas and adobada tacos in the middle of Chelsea Market.",
    pro_tip: "Go at 11:30am right when they open to skip the line. The adobada sells out on busy days.",
    subway: "A/C/E to 14th St, L to 8th Ave — Chelsea Market is right there",
    while_here: "Walk the High Line — the entrance at 14th St is a two-minute walk from Chelsea Market.",
    best_time: "Weekday lunch, right at opening",
    avoid_time: "Saturday 12-2pm — the line wraps around the market",
    budget_note: "$4-5 per taco, $3 horchata. Cash and card accepted.",
    vibe_tags: ["tacos", "counter-service", "iconic", "cheap-eats", "no-frills"],
    price_level: 1,
  },
  {
    name: "Bemelmans Bar",
    slug: "bemelmans-bar-upper-east-side",
    title: "The Most Beautiful Bar in New York That Nobody Under 30 Knows About",
    neighborhood: "Upper East Side",
    borough: "manhattan",
    category: "bar",
    description:
      "Bemelmans Bar inside The Carlyle hotel is the kind of place that makes you sit up straighter. The walls are covered in murals by Ludwig Bemelmans — the guy who created Madeline — and they've been there since 1947. There's live jazz most nights, the lighting is the color of honey, and the bartenders wear white jackets. It's old New York in the best possible way.\n\nYes, a martini here costs $28. But you're paying for an experience that hasn't changed in seventy years, and honestly it's worth it once. The crowd skews older and well-dressed, which is part of the charm. Slip in on a Tuesday and you might get a booth. This is the bar you bring someone to when you want to impress them without trying too hard.",
    one_liner: "Jazz, murals, and $28 martinis in a bar that hasn't changed since 1947.",
    pro_tip: "Go on a Tuesday or Wednesday — no cover for the jazz, and you can actually get a seat. Dress smart casual at minimum.",
    subway: "6 to 77th St, walk one block west to Madison Ave",
    while_here: "The Met is a 10-minute walk south. Or just stroll Madison Ave and window-shop.",
    best_time: "Tuesday or Wednesday evening, 7-9pm",
    avoid_time: "Friday and Saturday nights — packed with a cover charge",
    budget_note: "Cocktails $25-30, $20 cover on weekends for live jazz. No cover weeknights.",
    vibe_tags: ["classic", "jazz", "romantic", "upscale", "old-new-york"],
    price_level: 4,
  },
  {
    name: "Devoción",
    slug: "devocion-williamsburg",
    title: "3-Story Coffee Temple in Williamsburg With a Living Wall",
    neighborhood: "Williamsburg",
    borough: "brooklyn",
    category: "coffee",
    description:
      "Devoción takes the idea of a third-wave coffee shop and turns it into something that feels almost sacred. The Williamsburg flagship is three stories of exposed brick, towering ceilings, and an actual living wall of tropical plants climbing up the back. The beans come direct from Colombia — they roast on-site — and you can taste the difference. Their pour-over is exceptional.\n\nIt's a genuinely beautiful space to sit and work or just exist for a while. The ground floor is the main cafe, the upper floors have more seating and better light. Weekday mornings it's mostly freelancers and the occasional fashion shoot. The cortado here is one of the best in Brooklyn, no contest.",
    one_liner: "Three stories of Colombian coffee and a living wall that belongs in a museum.",
    pro_tip: "Head upstairs for the best natural light and fewer crowds. The cold brew on nitro is dangerously smooth.",
    subway: "L to Bedford Ave, 5-minute walk south on Grand St",
    while_here: "Domino Park is two blocks away — grab your coffee to go and sit by the waterfront.",
    best_time: "Weekday morning, 8-10am",
    avoid_time: null,
    budget_note: "Coffee $5-7, pastries $4-6. Laptop-friendly with outlets.",
    vibe_tags: ["coffee", "aesthetic", "work-friendly", "plants", "colombian"],
    price_level: 2,
  },
  {
    name: "Birria-Landia",
    slug: "birria-landia-jackson-heights",
    title: "Food Truck Birria Tacos That Are Worth the Trip to Queens",
    neighborhood: "Jackson Heights",
    borough: "queens",
    category: "food",
    description:
      "Birria-Landia is a food truck that became a phenomenon. Parked on Roosevelt Ave in Jackson Heights, it serves birria tacos — slow-braised beef in a rich, red consommé — that are crispy, cheesy, and dripping with flavor. You dip them in the broth and it's one of those eating experiences that recalibrates your standards for what a taco can be.\n\nThe truck runs late, which is part of its identity. This is where you end up at midnight after a night out, standing on a Queens sidewalk with red broth running down your wrists, absolutely not caring. The line can be long but it moves fast. Get the quesabirria tacos and a cup of consommé. That's the order. Don't deviate.",
    one_liner: "Midnight birria tacos on a Queens sidewalk — messy, perfect, legendary.",
    pro_tip: "They open around 7pm and run past midnight. The sweet spot is 9-10pm — after dinner rush, before the bar crowd.",
    subway: "7 to 82nd St–Jackson Heights, walk south on Roosevelt Ave",
    while_here: "Jackson Heights is one of the most diverse neighborhoods on Earth. Walk down 74th St for incredible Indian food too.",
    best_time: "Weeknight around 9pm",
    avoid_time: "Friday/Saturday after midnight — the line can be 45+ minutes",
    budget_note: "$3-4 per taco, $5 consommé. Cash only.",
    vibe_tags: ["late-night", "street-food", "iconic", "birria", "cash-only"],
    price_level: 1,
  },
  {
    name: "The Cloisters",
    slug: "the-cloisters-washington-heights",
    title: "A Medieval Castle in Upper Manhattan That Most Tourists Miss",
    neighborhood: "Washington Heights",
    borough: "manhattan",
    category: "museum",
    description:
      "The Cloisters is a branch of the Met built from actual pieces of medieval European monasteries, reassembled on a hilltop in Fort Tryon Park overlooking the Hudson River. It sounds fake, but it's real — Romanesque archways, Gothic chapels, a garden planted with species documented in medieval manuscripts. The Unicorn Tapestries alone are worth the trip.\n\nMost tourists never make it above 86th Street, which means The Cloisters is genuinely peaceful in a way that the main Met building never is. You can wander through cloistered courtyards with nobody else around. The gardens are spectacular in spring and fall. Pair it with a walk through Fort Tryon Park and you've got one of the best half-days in New York.",
    one_liner: "Medieval monasteries reassembled on a hilltop with Hudson River views.",
    pro_tip: "Your Met ticket works here same day (and vice versa). Go on a weekday morning in October when the gardens peak.",
    subway: "A to 190th St, take the elevator up and walk through Fort Tryon Park",
    while_here: "Fort Tryon Park has incredible Hudson River views. New Leaf Restaurant inside the park is solid for lunch.",
    best_time: "Weekday morning, especially October for fall foliage",
    avoid_time: null,
    budget_note: "Suggested admission $30 (pay what you wish for NY residents). Free with Met membership.",
    vibe_tags: ["museum", "peaceful", "medieval", "gardens", "hidden-gem"],
    price_level: 2,
  },
  {
    name: "DUMBO Archway",
    slug: "dumbo-archway-brooklyn",
    title: "The Instagram Bridge Shot Everyone Takes (And a Better Spot Nearby)",
    neighborhood: "DUMBO",
    borough: "brooklyn",
    category: "view",
    description:
      "You've seen the photo: the Manhattan Bridge perfectly framed through the brick buildings on Washington Street in DUMBO. It's one of the most photographed spots in New York for a reason — it's stunning. The Archway underneath the Manhattan Bridge overpass has become a gathering spot with markets, performances, and public art.\n\nHere's the local move though: after you get your bridge photo, walk five minutes to the Pebble Beach waterfront. The view of the Brooklyn Bridge with Lower Manhattan behind it is arguably better, and there are about 90% fewer people. The whole DUMBO waterfront from Pebble Beach to Brooklyn Bridge Park is one of the best walks in the city.",
    one_liner: "The famous bridge shot, plus a locals-only waterfront walk most visitors skip.",
    pro_tip: "For the classic Washington St photo, go before 9am on a weekday. Then walk to Pebble Beach for the real view.",
    subway: "F to York St or A/C to High St–Brooklyn Bridge",
    while_here: "Brooklyn Bridge Park is right here. Jane's Carousel is gorgeous, and Time Out Market has solid food options.",
    best_time: "Early morning for photos, golden hour for the waterfront",
    avoid_time: "Weekend afternoons — extremely crowded around the bridge photo spot",
    budget_note: "Free. Budget for an overpriced coffee at one of the DUMBO cafes ($6-8).",
    vibe_tags: ["views", "photography", "waterfront", "iconic", "walkable"],
    price_level: 1,
  },
  {
    name: "Abraço",
    slug: "abraco-east-village",
    title: "Tiny East Village Espresso Bar With a Cult Following",
    neighborhood: "East Village",
    borough: "manhattan",
    category: "coffee",
    description:
      "Abraço is barely bigger than a closet. There are maybe four seats. The espresso is flawless. That's the whole pitch, and it's been enough to make this one of the most beloved coffee shops in New York for over fifteen years. The olive oil cake is legendary — people write about it in food magazines.\n\nThe owner Jamie is usually behind the machine and he treats every shot like it matters. There's no Wi-Fi, no outlets, no pretense of being a workspace. You come here to drink an exceptional cortado, maybe eat a slice of cake, and then get on with your day. It's espresso bar culture the way it works in Italy — stand, sip, go. The East Village needs more places like this.",
    one_liner: "Four seats, perfect espresso, legendary olive oil cake. That's it.",
    pro_tip: "Get there when they open at 8am. The olive oil cake sells out by noon most days.",
    subway: "L to 1st Ave or 6 to Astor Place, short walk east on 7th St",
    while_here: "Tompkins Square Park is a block away. St. Marks Place for vintage shopping and cheap eats.",
    best_time: "Weekday morning, right at open",
    avoid_time: "Weekend brunch hours — tiny space means a wait",
    budget_note: "Espresso $4, cortado $5, olive oil cake $5. Cash and card.",
    vibe_tags: ["espresso", "tiny", "cult-favorite", "no-wifi", "east-village"],
    price_level: 2,
  },
  {
    name: "Prospect Park Long Meadow",
    slug: "prospect-park-long-meadow",
    title: "Central Park Gets All the Press But This Brooklyn Park Is Better",
    neighborhood: "Prospect Heights",
    borough: "brooklyn",
    category: "park",
    description:
      "Long Meadow in Prospect Park is a mile-long stretch of open grass that feels like actual countryside dropped into Brooklyn. Olmsted and Vaux — the same duo behind Central Park — designed this one too, and they considered it their masterpiece. On a sunny weekend, it fills with picnics, frisbee games, drum circles, and dogs running free in the morning hours.\n\nThe key difference from Central Park: space. You can actually spread a blanket here without being on top of strangers. The Nethermead and Ravine deeper in the park feel like genuine forest. There's a lake, a boathouse, a bandshell — everything Central Park has but with a fraction of the crowds. Brooklynites are protective of this place for good reason.",
    one_liner: "A mile of open meadow, drum circles, and more space than Central Park ever gives you.",
    pro_tip: "Enter at Grand Army Plaza for the full Long Meadow experience. Off-leash dog hours are before 9am — great energy.",
    subway: "2/3 to Grand Army Plaza or B/Q to Prospect Park",
    while_here: "The Brooklyn Museum and Brooklyn Botanic Garden are both at the park's east edge. Smorgasburg is nearby on weekends.",
    best_time: "Sunday afternoon in spring or early fall",
    avoid_time: null,
    budget_note: "Free. Bring your own picnic supplies from the Grand Army Plaza farmers market (Saturday mornings).",
    vibe_tags: ["park", "picnic", "spacious", "dog-friendly", "brooklyn-classic"],
    price_level: 1,
  },
  {
    name: "PDT",
    slug: "pdt-east-village",
    title: "A Speakeasy Hidden Inside a Hot Dog Shop in the East Village",
    neighborhood: "East Village",
    borough: "manhattan",
    category: "bar",
    description:
      "PDT — Please Don't Tell — is a cocktail bar hidden behind a phone booth inside Crif Dogs, a hot dog shop on St. Marks Place. You walk in, pick up the rotary phone, and if they have room, the back wall of the booth swings open into one of the best cocktail bars in New York. It's theatrical and ridiculous and the drinks are genuinely excellent.\n\nThe cocktail program has been influential since PDT opened in 2007 — these are the people who helped kick off the whole speakeasy revival. The space is intimate: dark wood, taxidermy on the walls, maybe 40 seats. Reservations are technically available but walking in and trying the phone is more fun. If you have to wait, you're waiting in a hot dog shop, which is honestly not a bad consolation prize.",
    one_liner: "Pick up a phone booth receiver in a hot dog shop. The wall opens. You're welcome.",
    pro_tip: "Try calling the phone at 5:30pm right when they open on a weeknight — best chance of walking right in.",
    subway: "6 to Astor Place or L to 3rd Ave, walk to St. Marks Place",
    while_here: "You're on St. Marks — the whole strip is worth exploring. Grab a Crif Dog while you wait (the Spicy Redneck is the move).",
    best_time: "Early weeknight, 5:30-7pm",
    avoid_time: "Friday/Saturday after 9pm — long waits and crowded inside",
    budget_note: "Cocktails $18-22. No cover. Hot dogs at Crif Dogs are $5-8.",
    vibe_tags: ["speakeasy", "cocktails", "hidden", "date-night", "theatrical"],
    price_level: 3,
  },
];

// ─── Tips ───────────────────────────────────────────────────────────────────

interface Tip {
  spot_slug: string;
  text: string;
  author_name: string;
  author_area: string;
}

const tips: Tip[] = [
  {
    spot_slug: "lic-landing-rooftop",
    text: "Best free view in the city. Took my girlfriend here, she loved it.",
    author_name: "Carlos",
    author_area: "Queens",
  },
  {
    spot_slug: "lic-landing-rooftop",
    text: "Go on a Wednesday around 6pm. Half the crowd, same sunset.",
    author_name: "Priya",
    author_area: "Astoria",
  },
  {
    spot_slug: "los-tacos-no-1-chelsea",
    text: "The adobada is non-negotiable. I've been coming here since they opened and it's never let me down.",
    author_name: "Mike",
    author_area: "Hell's Kitchen",
  },
  {
    spot_slug: "los-tacos-no-1-chelsea",
    text: "Skip the line by going at 11:30 on a Tuesday. Three tacos, out in 10 minutes.",
    author_name: "Daniela",
    author_area: "Chelsea",
  },
  {
    spot_slug: "birria-landia-jackson-heights",
    text: "Came here at midnight after a concert. Best drunk food decision of my life.",
    author_name: "Jordan",
    author_area: "Bushwick",
  },
  {
    spot_slug: "birria-landia-jackson-heights",
    text: "Bring cash and napkins. Lots of napkins. The consommé is everything.",
    author_name: "Rosa",
    author_area: "Jackson Heights",
  },
  {
    spot_slug: "abraco-east-village",
    text: "The olive oil cake here changed my understanding of what cake can be. Not exaggerating.",
    author_name: "Lena",
    author_area: "East Village",
  },
  {
    spot_slug: "pdt-east-village",
    text: "Brought my parents here from Ohio. My dad picked up the phone and his face when the wall opened was priceless.",
    author_name: "Sarah",
    author_area: "Murray Hill",
  },
  {
    spot_slug: "pdt-east-village",
    text: "The Benton's Old Fashioned is still the best cocktail on the menu. Don't sleep on it.",
    author_name: "Dave",
    author_area: "Williamsburg",
  },
  {
    spot_slug: "bemelmans-bar-upper-east-side",
    text: "Wore a blazer on a Tuesday night, had the whole banquette to myself. Felt like 1955 in the best way.",
    author_name: "Marcus",
    author_area: "Harlem",
  },
];

// ─── Neighborhoods ──────────────────────────────────────────────────────────

interface Neighborhood {
  name: string;
  slug: string;
  borough: string;
  vibe: string;
}

const neighborhoods: Neighborhood[] = [
  {
    name: "Williamsburg",
    slug: "williamsburg",
    borough: "brooklyn",
    vibe: "Creative energy meets waterfront living. Brooklyn's most famous neighborhood for good reason — cafes, vintage shops, and some of the best food in the city.",
  },
  {
    name: "East Village",
    slug: "east-village",
    borough: "manhattan",
    vibe: "Punk rock roots with a modern edge. Dive bars next to ramen shops next to speakeasies. Still the most interesting neighborhood in Manhattan.",
  },
  {
    name: "Long Island City",
    slug: "long-island-city",
    borough: "queens",
    vibe: "Waterfront Queens with Manhattan skyline views. Art galleries, breweries, and rooftop bars without the Manhattan price tag.",
  },
  {
    name: "Chelsea",
    slug: "chelsea",
    borough: "manhattan",
    vibe: "Art galleries, the High Line, and Chelsea Market. A polished neighborhood that still knows how to have a good time.",
  },
  {
    name: "Jackson Heights",
    slug: "jackson-heights",
    borough: "queens",
    vibe: "The most diverse neighborhood in the world, no exaggeration. Incredible food from every continent within a few blocks.",
  },
  {
    name: "DUMBO",
    slug: "dumbo",
    borough: "brooklyn",
    vibe: "Cobblestone streets, bridge views, and waterfront parks. Touristy in the best spots but the locals know the quiet corners.",
  },
  {
    name: "Upper East Side",
    slug: "upper-east-side",
    borough: "manhattan",
    vibe: "Museum Mile, classic bars, and old-money elegance. More interesting than people give it credit for — especially the quieter streets east of Lex.",
  },
  {
    name: "Washington Heights",
    slug: "washington-heights",
    borough: "manhattan",
    vibe: "Dominican culture, Fort Tryon Park, and The Cloisters. One of Manhattan's most underrated neighborhoods with incredible community energy.",
  },
  {
    name: "Prospect Heights",
    slug: "prospect-heights",
    borough: "brooklyn",
    vibe: "Brownstone Brooklyn at its best. Prospect Park, the Brooklyn Museum, and some of the coziest restaurants in the borough.",
  },
  {
    name: "Bushwick",
    slug: "bushwick",
    borough: "brooklyn",
    vibe: "Street art, warehouse parties, and the best late-night food in Brooklyn. Gritty, creative, and constantly evolving.",
  },
];

// ─── Generate SQL ───────────────────────────────────────────────────────────

const lines: string[] = [];

lines.push("-- Seed data: 10 NYC spots, tips, and neighborhoods");
lines.push("-- Generated by src/seed.ts");
lines.push("");

// Spots
for (const s of spots) {
  lines.push(
    `INSERT INTO spots (name, slug, title, neighborhood, borough, category, description, one_liner, pro_tip, subway, while_here, best_time, avoid_time, budget_note, vibe_tags, price_level, latitude, longitude, google_maps_url, photo_url, source, published, created_at, updated_at) VALUES (${sq(s.name)}, ${sq(s.slug)}, ${sq(s.title)}, ${sq(s.neighborhood)}, ${sq(s.borough)}, ${sq(s.category)}, ${sq(s.description)}, ${sq(s.one_liner)}, ${sq(s.pro_tip)}, ${sq(s.subway)}, ${sq(s.while_here)}, ${sq(s.best_time)}, ${nullable(s.avoid_time)}, ${sq(s.budget_note)}, ${sq(JSON.stringify(s.vibe_tags))}, ${s.price_level}, NULL, NULL, NULL, NULL, NULL, 1, ${now}, ${now});`
  );
}

lines.push("");

// Tips
for (const t of tips) {
  lines.push(
    `INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved, created_at) VALUES ((SELECT id FROM spots WHERE slug = ${sq(t.spot_slug)}), ${sq(t.text)}, ${sq(t.author_name)}, ${sq(t.author_area)}, 1, ${now});`
  );
}

lines.push("");

// Neighborhoods
for (const n of neighborhoods) {
  lines.push(
    `INSERT INTO neighborhoods (name, slug, borough, vibe, best_for, safety_notes, getting_around, stay_here_if, skip_if, photo_url, latitude, longitude) VALUES (${sq(n.name)}, ${sq(n.slug)}, ${sq(n.borough)}, ${sq(n.vibe)}, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);`
  );
}

lines.push("");

// FTS rebuild
lines.push("INSERT INTO spots_fts(spots_fts) VALUES ('rebuild');");

console.log(lines.join("\n"));
