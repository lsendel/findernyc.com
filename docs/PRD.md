# FinderNYC.com — Product Requirements Document

**Version:** 2.0 (pivot from event discovery to city tourist guide)
**Date:** 2026-04-08
**Status:** Draft

---

## 1. Product Vision

A travel guide site that feels like advice from a local friend, not another tourist brochure.

**Core promise:** "Skip the tourist traps. Here's where real New Yorkers actually go."

**Model:** Content-first directory (families.care playbook) — SSR pages for SEO, fast edge delivery, repeatable content formats that scale to multiple cities.

### 1.1 What This Is NOT

- Not a SaaS platform (no dashboards, no partner portals)
- Not a booking engine (affiliate links, not transactions)
- Not an AI product (AI generates content offline, not at runtime)
- Not an events calendar (curated evergreen guides, not time-sensitive listings)

---

## 2. Target Audience

| Segment | Description | What They Search |
|---------|-------------|-----------------|
| **First-timers** | First visit to NYC, overwhelmed by options | "where to stay in NYC first time", "JFK to Manhattan cheap" |
| **Repeat visitors** | Tired of generic Top 10 lists, want deeper cuts | "best tacos Bushwick", "hidden bars East Village" |
| **Budget travelers** | 25-40 years old, want quality without overpaying | "rooftop bars NYC under $20", "free things to do NYC" |
| **Remote workers** | Digital nomads, need functional spaces | "best cafes to work from NYC wifi", "coworking Brooklyn" |

---

## 3. Content Types & Formats

All content follows a repeatable, research-friendly format. Every page is under 800 words, casual tone ("your friend who lives here").

### 3.1 Quick Lists ("3-5 Places")

**Format:** Title + intro (2 sentences) + 3-5 spots, each with:
- Name + neighborhood
- One-liner: "Best for..."
- Pro tip (timing, what to order, what to avoid)
- Google Maps link
- Optional photo

**Examples:**
- "3 Coffee Shops to Work From in Williamsburg (Good Wi-Fi + Quiet)"
- "5 Taco Spots Locals Love in Jackson Heights"
- "3 Rooftops With Sunset Views Under $20"
- "4 Bookstores Worth the Trip in Manhattan"

**SEO targets:** "[thing] in [neighborhood]", "best [thing] [city]"

### 3.2 Micro-Itineraries (1-Day Plans)

**Format:** Title + audience + 4-6 stops in order, with:
- Time of day for each stop
- Walking/subway directions between stops
- Budget estimate (total for the day)
- Google My Map embed (all stops pinned)

**Examples:**
- "Perfect 1 Day in NYC If You're Staying in Midtown"
- "Rainy Day in NYC With Kids (Indoor Only)"
- "One Night Layover at JFK: Food + Views in Queens"
- "Brooklyn Saturday: Coffee to Cocktails"

**SEO targets:** "[city] one day itinerary", "what to do in [city] in one day"

### 3.3 Neighborhood Cheat Sheets

**Format:** One page per neighborhood with:
- Vibe check (2 sentences)
- Best for: [type of traveler]
- Top 3 eats / Top 3 walks / Top 1 bar
- Safety & getting around
- "Stay here if..." / "Skip if..."
- Nearby neighborhoods to also check

**Examples:**
- "Quick Guide to Bushwick: Where to Walk, Eat, and Stay"
- "Is the Bronx Safe for Tourists? Honest Pros and Cons"
- "Harlem in 3 Hours: What to See and Where to Eat"

**SEO targets:** "[neighborhood] guide", "[neighborhood] safe for tourists"

### 3.4 Practical Tips ("Before You Book")

**Format:** Problem/question as title + clear answer + specific recommendations

**Examples:**
- "What Area to Stay in NYC (First-Time Visitors)"
- "How to Get From JFK to Manhattan (Cheap vs Easy)"
- "5 Scams and Tourist Traps to Avoid in NYC"
- "NYC Subway for Beginners: What Nobody Tells You"
- "Tipping in NYC: When, How Much, and When NOT To"

**SEO targets:** "[city] tips first time", "[city] tourist mistakes"

### 3.5 Versus / Comparison Pages

**Format:** Side-by-side comparison with clear recommendation

**Examples:**
- "Williamsburg vs Bushwick: Where to Stay?"
- "Top of the Rock vs Empire State Building: Which View?"
- "Staten Island Ferry vs Circle Line: Free vs Paid NYC Views"

**SEO targets:** "[A] vs [B] NYC"

### 3.6 Seasonal / Timely Guides

**Format:** Month-specific or seasonal recommendations, updated annually

**Examples:**
- "NYC in December: What's Actually Worth Doing"
- "Best Rooftops to Open in Spring 2026"
- "Where to Watch July 4th Fireworks (Without the Crowds)"

**SEO targets:** "NYC in [month]", "things to do NYC [season]"

---

## 4. Data Model

### 4.1 Core Entities

```
spots
  id              TEXT PRIMARY KEY
  name            TEXT NOT NULL
  slug            TEXT NOT NULL UNIQUE
  neighborhood    TEXT NOT NULL
  borough         TEXT NOT NULL  -- Manhattan, Brooklyn, Queens, Bronx, Staten Island
  category        TEXT NOT NULL  -- coffee, food, bar, park, museum, view, shop
  one_liner       TEXT           -- "Best for remote work, worst for dates"
  pro_tip         TEXT           -- "Go before 7pm to avoid the crowd"
  price_level     INTEGER        -- 1-4 ($, $$, $$$, $$$$)
  latitude        REAL
  longitude       REAL
  google_maps_url TEXT
  photo_url       TEXT
  source          TEXT           -- where we found it (reddit, blog, google maps)
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP
  updated_at      TEXT DEFAULT CURRENT_TIMESTAMP

guides
  id              TEXT PRIMARY KEY
  title           TEXT NOT NULL
  slug            TEXT NOT NULL UNIQUE
  type            TEXT NOT NULL  -- quick-list, itinerary, neighborhood, practical, versus, seasonal
  neighborhood    TEXT           -- NULL for city-wide guides
  borough         TEXT
  excerpt         TEXT NOT NULL  -- meta description, 150 chars
  body_html       TEXT NOT NULL  -- rendered HTML content
  body_md         TEXT NOT NULL  -- markdown source (for editing)
  cover_photo_url TEXT
  seo_title       TEXT
  seo_description TEXT
  published       INTEGER DEFAULT 0
  published_at    TEXT
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP
  updated_at      TEXT DEFAULT CURRENT_TIMESTAMP

guide_spots (join table)
  guide_id        TEXT REFERENCES guides(id)
  spot_id         TEXT REFERENCES spots(id)
  position        INTEGER        -- order in the guide
  context         TEXT           -- guide-specific note about this spot

neighborhoods
  id              TEXT PRIMARY KEY
  name            TEXT NOT NULL
  slug            TEXT NOT NULL UNIQUE
  borough         TEXT NOT NULL
  vibe            TEXT           -- "artsy and gritty", "family-friendly", "upscale"
  best_for        TEXT           -- "budget travelers, foodies"
  safety_notes    TEXT
  getting_around  TEXT
  stay_here_if    TEXT
  skip_if         TEXT
  latitude        REAL
  longitude       REAL

ratings
  id              TEXT PRIMARY KEY
  spot_id         TEXT REFERENCES spots(id) NOT NULL
  score           INTEGER NOT NULL  -- 1-5
  session_id      TEXT              -- fingerprint to prevent spam (no auth)
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP
```

**Computed (not stored):** `avg_rating` and `rating_count` are calculated per spot via `SELECT AVG(score), COUNT(*) FROM ratings WHERE spot_id = ?`. Cached in KV for 1 hour.

### 4.2 Additional Fields for Spot Pages (the "local friend" vibe)

```
spot_tips (local comments — the "What locals are saying" section)
  id              TEXT PRIMARY KEY
  spot_id         TEXT REFERENCES spots(id) NOT NULL
  text            TEXT NOT NULL       -- "Best free view in the city. Took my girlfriend, she loved it."
  author_name     TEXT                -- "Carlos"
  author_area     TEXT                -- "Queens" (optional, adds credibility)
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP

spot_details (extended spot info for the casual friend-style page)
  spot_id         TEXT PRIMARY KEY REFERENCES spots(id)
  subway          TEXT                -- "7 train to Vernon Boulevard, three-minute walk"
  while_here      TEXT                -- "The deli right under the rooftop does an insane bacon egg and cheese"
  best_time       TEXT                -- "Right before golden hour"
  avoid_time      TEXT                -- "Weekends after 6pm"
  budget_note     TEXT                -- "Completely free. BYOB."
  vibe_tags       TEXT                -- JSON array: ["sunset","quiet","free","byob"]
```

### 4.3 What We DON'T Store

- No user accounts (phase 1)
- No booking data (affiliate links only)
- No real-time availability

---

## 5. Page Architecture & UX

### 5.1 Public Pages

```
/                                   Landing page (hero search + featured spots + guides grid)
/search?q=...&neighborhood=...      Search results (spots + guides, filterable)
/spots/:slug                        Individual spot page (SSR) — THE core page
/guides                             All guides index
/guides/:slug                       Individual guide page (SSR)
/neighborhoods                      All neighborhoods grid
/neighborhoods/:slug                Neighborhood cheat sheet (SSR)
/tips                               Practical tips index
/about                              About FinderNYC
/sitemap.xml                        Dynamic sitemap
/robots.txt                         Robots
/llms.txt                           LLM-friendly site summary
```

### 5.2 SSR Strategy (families.care playbook)

- All spot, guide, and neighborhood pages are **server-side rendered** at the edge
- HTML served from Cloudflare Workers with `Cache-Control` headers
- KV cache for rendered pages (same pattern as families.care edge-pages.ts)
- No SPA shell needed — this is a content site, not an app
- Structured data (JSON-LD) on every page: Article, Place, BreadcrumbList, FAQPage

### 5.3 The Spot Page — "Local Friend" Vibe

This is the signature page. Every spot page reads like a text from your friend who lives there.

**Reference example (the vibe we're targeting):**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Secret Rooftop in Queens With Zero Tourists

The LIC Landing rooftop in Long Island City is
completely free and almost nobody knows about it.
Perfect sunset views, zero tourists, and you can
bring your own drinks.

Pro tip: Get there right before golden hour. Grab
a six-pack from the deli downstairs first.

🚇 Subway: 7 train to Vernon Boulevard, 3-min walk.

While you're in LIC, the deli right under the
rooftop does an insane bacon egg and cheese.

⭐ Rate this spot  (average 4.8/5 from 47 locals)

What locals are saying
━━━━━━━━━━━━━━━━━━━━━━
"Best free view in the city. Took my girlfriend,
 she loved it." — Carlos, Queens

"Go on weekdays. Weekends get a little busy
 after 6." — Sarah

"The sunset here is better than Brooklyn Bridge
 Park." — Mike

Know a better spot? Drop your tip below 👇

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spot page anatomy (HTML structure):**

```html
<article class="spot-page">
  <!-- Hero: full-bleed photo or gradient -->
  <header class="spot-hero">
    <h1>{catchy title — NOT the spot name}</h1>
    <p class="spot-meta">{neighborhood} · {borough} · {category}</p>
  </header>

  <!-- Body: casual 2-3 paragraph description -->
  <section class="spot-body">
    <p>{opening hook — what makes this place special}</p>

    <div class="pro-tip">
      <strong>Pro tip:</strong> {actionable insider advice}
    </div>

    <div class="getting-there">
      🚇 <strong>Subway:</strong> {line + stop + walk time}
    </div>

    <div class="while-here">
      <strong>While you're in {neighborhood}:</strong> {nearby bonus}
    </div>
  </section>

  <!-- Vibe tags -->
  <div class="vibe-tags">
    <span class="tag">sunset</span>
    <span class="tag">free</span>
    <span class="tag">byob</span>
    <span class="tag">no tourists</span>
  </div>

  <!-- Interactive rating -->
  <section class="spot-rating">
    <div class="stars">{clickable 1-5 stars}</div>
    <p>average {avg}/5 from {count} locals</p>
  </section>

  <!-- Local comments -->
  <section class="locals-say">
    <h2>What locals are saying</h2>
    {for each tip:}
    <blockquote>
      <p>"{text}"</p>
      <cite>— {name}, {area}</cite>
    </blockquote>
  </section>

  <!-- Submit tip form -->
  <section class="submit-tip">
    <h3>Know a better spot? Drop your tip below 👇</h3>
    <form>
      <textarea placeholder="What should people know about this spot?"></textarea>
      <input type="text" placeholder="Your name (optional)" />
      <button type="submit">Share your tip</button>
    </form>
  </section>

  <!-- Related spots in same neighborhood -->
  <section class="nearby-spots">
    <h2>More in {neighborhood}</h2>
    {3-4 spot cards}
  </section>
</article>
```

**Tone rules for spot descriptions:**
- Write like you're texting a friend: "this place is insane", "nobody knows about it", "trust me on this one"
- Always lead with what makes it DIFFERENT, not what it IS
- Title should be a hook, not a name: "Secret Rooftop in Queens With Zero Tourists" not "LIC Landing Rooftop Bar"
- Pro tips must be ACTIONABLE: timing, what to order, what to skip
- Include the spot name naturally in the first paragraph, not as the title
- Subway/transit directions are mandatory
- "While you're here" creates internal linking opportunities

### 5.4 Search — families.care Style

The search is the primary discovery mechanism, adapted from families.care's hero search pattern.

**Hero Search (Landing Page):**

```
┌─────────────────────────────────────────────────┐
│  Skip the tourist traps.                        │
│  Here's where real New Yorkers actually go.     │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 🔍  tacos, rooftops, coffee, bookstores…  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐          │
│  │ 🍕 Food │ │ 🍸 Bars  │ │ ☕ Café │ ...      │
│  └─────────┘ └──────────┘ └─────────┘          │
│                                                 │
│  📍 Showing spots in: Manhattan (edit)          │
└─────────────────────────────────────────────────┘
```

**Search behavior (families.care playbook):**

1. **Empty state:** Show quick category pills (Food, Bars, Coffee, Views, Free, Museums, Parks, Shopping)
2. **As user types (2+ chars, 300ms debounce):** Show suggestion dropdown:
   ```
   ┌─ SPOTS ─────────────────────────────────
   │  LIC Landing Rooftop · Queens · view
   │  Los Tacos No. 1 · Chelsea · food
   ├─ GUIDES ────────────────────────────────
   │  3 Rooftops With Sunset Views Under $20
   │  5 Taco Spots Locals Love in Jackson Heights
   ├─ NEIGHBORHOODS ─────────────────────────
   │  Williamsburg, Brooklyn
   │  Jackson Heights, Queens
   └─────────────────────────────────────────
   ```
3. **On submit:** Navigate to `/search?q={query}&neighborhood={filter}`
4. **Keyboard:** Arrow keys navigate, Enter selects, Escape closes, `/` focuses from anywhere

**Search Results Page:**

```
┌─ Search bar (compact, sticky) ─────────────────┐
│ 🔍 tacos                          📍 All NYC   │
└─────────────────────────────────────────────────┘

┌─ Filters (inline pills) ───────────────────────┐
│ All · Food · Bars · Coffee · Views · Free · ... │
│ Borough: All · Manhattan · Brooklyn · Queens    │
│ Sort: Relevance · Rating · Newest               │
└─────────────────────────────────────────────────┘

┌─ Results ───────────────────────────────────────┐
│                                                 │
│  ┌──────────┐  Los Tacos No. 1                  │
│  │  [photo] │  Chelsea, Manhattan · food         │
│  │          │  ⭐ 4.9/5 (83 locals)              │
│  └──────────┘  "Best street tacos outside Mexico"│
│                $  · 🚇 A/C/E to 14th St         │
│                                                 │
│  ┌──────────┐  Birria-Landia                    │
│  │  [photo] │  Jackson Heights, Queens · food    │
│  │          │  ⭐ 4.7/5 (62 locals)              │
│  └──────────┘  "Worth the trip to Queens"        │
│                $  · 🚇 7 to 82nd St             │
│                                                 │
│  ── RELATED GUIDE ─────────────────────────     │
│  📖 5 Taco Spots Locals Love in Jackson Heights │
│  ───────────────────────────────────────────    │
│                                                 │
│  ┌──────────┐  Taqueria Al Pastor               │
│  │  [photo] │  Bushwick, Brooklyn · food         │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

**Key search UX decisions:**
- Results mix **spots** and **related guides** (guides appear inline when relevant)
- Each spot card shows: photo, name, neighborhood, rating, one-liner, price level, subway
- Clicking a spot card → spot page (the "local friend" vibe page)
- Clicking a guide → guide page
- No pagination needed initially (load 20 results, lazy-load more on scroll)
- Empty results: "No spots yet for '{query}'. Know one? Tell us 👇"

**Search API:**

```
GET /api/search?q={query}&category={slug}&borough={slug}&neighborhood={slug}&sort={relevance|rating|newest}

Response:
{
  spots: [{
    name, slug, neighborhood, borough, category,
    one_liner, price_level, photo_url,
    avg_rating, rating_count,
    subway           // from spot_details
  }],
  guides: [{        // related guides matching the query
    title, slug, type, excerpt, cover_photo_url
  }],
  total: number
}
```

**Suggest API (typeahead):**

```
GET /api/search/suggest?q={query}

Response:
{
  spots: [{ name, slug, neighborhood, category }],
  guides: [{ title, slug, type }],
  neighborhoods: [{ name, slug, borough }]
}
```

### 5.5 Landing Page Structure

**Keep from current site:**
- Hero section design energy (gradient, typography, CTA placement)
- Mobile-responsive nav
- FAQ accordion
- Clean card grid layout
- Manrope font + color scheme (dark blue + amber accent)

**Replace:**
- Remove: persona paths, smart search filters, AI features, ops console, inquiry profile, scheduling panel, pricing section, partner section
- Add: **Hero search bar** (families.care style, with category pills)
- Add: **Featured spots** (3-4 highest rated, card grid)
- Add: **Latest guides** carousel (3-4 newest published)
- Add: **Neighborhood grid** (borough tabs → neighborhood cards with vibe + photo)
- Add: **"What kind of trip?"** quick filter (first-time / foodie / budget / nightlife / family) → pre-filtered search
- Add: Email capture ("Get weekly hidden gems — free")
- Add: Social proof ("Curated by locals, not algorithms")

---

## 6. Technical Architecture

### 6.1 Stack (reuse existing)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Cloudflare Workers | Keep existing wrangler.toml |
| Framework | Hono | Keep, simplify routes |
| Database | Cloudflare D1 | New schema (spots, guides, neighborhoods, ratings) |
| ORM | Drizzle | Keep |
| Styling | Tailwind CSS | **Switch from raw CSS** — faster iteration, consistent with families.care |
| Build | esbuild | Keep for client JS |
| Content | Markdown → HTML | Guides authored in markdown, rendered at build/publish time |
| Cache | Cloudflare Cache API + KV | SSR page cache, same as families.care |

### 6.2 What to Remove from Codebase

Delete or gut these modules (they belong to the old event-discovery concept):

- `src/templates/landing.ts` — rewrite (keep layout/styling DNA, remove all SaaS sections)
- AI concierge, shortlist, negotiation, document helper routes
- Fraud detection routes
- Scheduling/calendar integration
- Partner/agency workspace
- Ops console
- Feature flag / experiment framework
- Availability sync
- Saved searches / alerts system
- Waitlist automation

Keep:
- Hono app skeleton + middleware
- D1 database binding
- Analytics events table (simplify to page views + rating events)
- Lead capture (simplify to email-only newsletter signup)
- Static asset serving
- robots.txt, sitemap.xml, llms.txt (update content)

### 6.3 File Structure (target)

```
src/
  index.ts                 # Hono app entry, route registration
  routes/
    pages.ts               # SSR page routes (landing, guides, neighborhoods)
    api.ts                 # API routes (ratings, newsletter, sitemap)
  templates/
    layout.ts              # Shared HTML shell (head, nav, footer)
    landing.ts             # Landing page template
    guide.ts               # Guide page template
    neighborhood.ts        # Neighborhood page template
    guides-index.ts        # Guides listing page
    neighborhoods-index.ts # Neighborhoods listing page
  db/
    schema.ts              # Drizzle schema (spots, guides, neighborhoods, ratings)
    migrations/            # Drizzle migration files
  content/
    guides/                # Markdown source files for guides
    neighborhoods/         # Markdown source files for neighborhoods
  lib/
    markdown.ts            # Markdown → HTML renderer
    seo.ts                 # JSON-LD, meta tags, OG tags
    cache.ts               # KV/Cache API helpers
  assets/
    styles.css             # Tailwind build output
    main.ts                # Minimal client JS (ratings, mobile nav, newsletter form)
```

---

## 7. Content Pipeline

### 7.1 Phase 1: Manual Research + AI Drafting

1. **Research** spots using Google Maps, Reddit, TikTok, blogs
2. **Add spots** to D1 via admin script or simple CLI
3. **Draft guide** in markdown (AI-assisted, human-edited)
4. **Publish** via CLI script: `npm run publish:guide -- --slug "3-coffee-shops-williamsburg"`
5. Guide is rendered to HTML, cached in KV, sitemap updated

### 7.2 Phase 2: Scalable Pipeline (month 2+)

- Batch content generation (similar to families.care Anthropic batch pipeline)
- AI drafts from spot database → human review → publish
- Automated sitemap + social media post generation

### 7.3 Content Calendar (Month 1)

**Week 1 (Launch — 10 pages):**
1. Landing page
2. "What Area to Stay in NYC (First-Time Visitors)" — practical
3. "How to Get From JFK to Manhattan (Cheap vs Easy)" — practical
4. "Quick Guide to Williamsburg" — neighborhood
5. "Quick Guide to Lower East Side" — neighborhood
6. "3 Coffee Shops to Work From in Williamsburg" — quick list
7. "5 Taco Spots Locals Love in Jackson Heights" — quick list
8. "Perfect 1 Day in NYC If You're Staying in Midtown" — itinerary
9. "5 Scams and Tourist Traps to Avoid in NYC" — practical
10. "3 Rooftops With Sunset Views Under $20" — quick list

**Week 2-4 (scale to 30 pages):**
- 5 more neighborhood guides (Bushwick, Harlem, Chelsea, Astoria, DUMBO)
- 5 more quick lists (bars, brunch, pizza, bookstores, free activities)
- 5 more practical tips (subway, tipping, safety, weather packing, walking routes)
- 5 more itineraries (Brooklyn day, Queens food crawl, rainy day, date night, family)

---

## 8. Monetization

### 8.1 Phase 1 (Month 1-3): Affiliate Links

| Partner | Integration | Commission |
|---------|------------|------------|
| Booking.com | Hotel links in "where to stay" guides | 25-40% |
| GetYourGuide | Tour/experience links in itineraries | 8% |
| Viator | Activity links | 8% |
| Amazon | Travel gear in practical tips | 4% |

Implementation: Simple `<a>` tags with affiliate tracking parameters. No JS SDK needed.

### 8.2 Phase 2 (Month 3-6): Display Ads

- Mediavine or Raptive (requires 50K sessions/month)
- One ad unit per guide page (non-intrusive, after intro)

### 8.3 Phase 3 (Month 6+): Premium Content

- Paid email newsletter ("Weekly Hidden Gems")
- Downloadable neighborhood PDF guides ($5-10)
- Sponsored guides (local businesses pay for featured placement)

---

## 9. SEO Strategy

### 9.1 Technical SEO

- SSR for all content pages (no client-side rendering for bots)
- Structured data: Article (guides), Place (spots), BreadcrumbList, FAQPage
- Clean URLs: `/guides/3-coffee-shops-williamsburg`
- XML sitemap with lastmod dates
- `llms.txt` for AI search engines
- Fast TTFB (<100ms from Cloudflare edge)
- Core Web Vitals: target all green

### 9.2 Content SEO

- Target long-tail keywords: "[thing] in [neighborhood] NYC"
- Internal linking: every guide links to related neighborhoods and guides
- Every spot links back to all guides it appears in
- Neighborhood pages link to all guides mentioning that neighborhood

### 9.3 LLM / AI Search Optimization

- Structured, scannable content (headers, lists, bold key info)
- Direct answers to questions in first paragraph
- FAQ schema on practical tip pages
- `llms.txt` with site structure and content summary

---

## 10. Multi-City Expansion (Phase 2)

### 10.1 Domain Strategy

| City | Domain | Timeline |
|------|--------|----------|
| NYC | findernyc.com | Now |
| Miami | experiences.miami | Month 2 |
| All cities | hiddencitygems.com | Month 3 (umbrella brand) |

### 10.2 Architecture for Multi-City

- Same codebase, different D1 databases per city
- Shared templates, city-specific content
- `hiddencitygems.com/nyc`, `hiddencitygems.com/miami` or subdomains
- Content pipeline repeatable: same formats, new city data

---

## 11. Success Metrics

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Pages live | 10 | 30 | 100 |
| Monthly visitors | 500 | 5,000 | 25,000 |
| Avg time on page | >1.5min | >2min | >2min |
| Affiliate click rate | — | 10% | 12% |
| Email subscribers | 50 | 500 | 2,000 |
| Domain authority | — | 10 | 20 |

---

## 12. Implementation Phases

### Phase 1: MVP (Week 1-2)

**Goal:** Landing page with search + 10 spot pages live on findernyc.com

- [ ] New D1 schema (spots, spot_details, spot_tips, guides, neighborhoods, ratings)
- [ ] Strip landing page: hero search bar + category pills + featured spots grid + neighborhood grid + email capture
- [ ] **Spot page template** (SSR) — the "local friend" vibe page with all sections
- [ ] **Search results page** — spot cards + inline guide cards + filters (category, borough, sort)
- [ ] **Search API** — full-text search on spots (name, one_liner, neighborhood) + guide title/excerpt
- [ ] **Suggest API** — typeahead for spots, guides, neighborhoods (300ms debounce)
- [ ] **Star rating** — clickable stars on spot pages, POST to `/api/ratings`, session-based dedup
- [ ] **Local tips display** — render spot_tips as blockquotes with author attribution
- [ ] **Tip submission form** — POST to `/api/tips`, stored in spot_tips, no auth required
- [ ] Newsletter signup (email capture → D1)
- [ ] Sitemap + structured data (Place, Article, BreadcrumbList)
- [ ] Seed 30-40 spots across 5-6 neighborhoods (research + AI draft)
- [ ] First 10 spot pages published
- [ ] Deploy to findernyc.com

### Phase 2: Guides + Content Scale (Week 3-4)

- [ ] Guide page template (SSR) — quick lists, itineraries, practical tips
- [ ] Neighborhood cheat sheet template (SSR)
- [ ] Guides index + neighborhood index pages
- [ ] Content CLI tools (`npm run spot:add`, `npm run guide:publish`)
- [ ] AI-assisted draft pipeline (spot research → draft → human review)
- [ ] 10 guide pages + 5 neighborhood pages published
- [ ] Affiliate link integration (Booking, GetYourGuide, Viator)
- [ ] Google Search Console + GA4 setup
- [ ] Social sharing meta tags + OG images

### Phase 3: Growth (Month 2-3)

- [ ] Email newsletter system (weekly hidden gems digest)
- [ ] "Related spots" + "Related guides" on every page
- [ ] Tip moderation queue (simple admin page)
- [ ] Miami expansion (experiences.miami)
- [ ] Social content templates (Instagram/TikTok cards auto-generated from spot data)

### Phase 4: Scale (Month 3-6)

- [ ] hiddencitygems.com umbrella launch (multi-city)
- [ ] Display ads integration (Mediavine/Raptive at 50K sessions)
- [ ] Premium content (paid neighborhood PDF guides)
- [ ] UGC: "locals' picks" — user-submitted spots with review queue
- [ ] Multi-city content pipeline (same formats, new city databases)
