# FinderNYC Pivot: Tourist Guide MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot findernyc.com from an event discovery SaaS to a content-first city tourist guide with spot pages ("local friend" vibe), search (families.care style), ratings, and local tips.

**Architecture:** Cloudflare Workers + Hono (keep existing), D1 database (new schema for spots/guides/neighborhoods), SSR string templates (same pattern as current site). Strip all SaaS routes/features. Add search API, suggest API, ratings API, tips API. Landing page gets a hero search bar with category pills.

**Tech Stack:** Hono, Drizzle ORM, Cloudflare D1, esbuild, CSS custom properties (existing design tokens), string template SSR

---

## File Structure

**Create:**
- `src/db/schema.ts` — REPLACE: new schema (spots, spot_tips, neighborhoods, guides, guide_spots, ratings, newsletter_subscribers)
- `src/db/migrations/0001_findernyc_pivot.sql` — migration SQL for new tables
- `src/templates/layout.ts` — shared HTML shell (head, nav, footer) extracted from content-page.ts
- `src/templates/landing.ts` — REPLACE: hero search + featured spots + neighborhood grid + newsletter
- `src/templates/spot.ts` — spot page template ("local friend" vibe)
- `src/templates/search.ts` — search results page template
- `src/routes/api/search.ts` — REPLACE: full-text search + suggest endpoints
- `src/routes/api/ratings.ts` — POST rating for a spot
- `src/routes/api/tips.ts` — POST local tip for a spot
- `src/routes/api/newsletter.ts` — POST email signup
- `src/routes/pages.ts` — SSR page routes (spot, search, landing)
- `src/assets/js/main.ts` — REPLACE: minimal client JS (search, ratings, tips form, mobile nav)
- `src/assets/css/styles.css` — REPLACE: keep design tokens + reset + nav, add spot/search/landing styles
- `src/index.ts` — REPLACE: stripped down, only new routes
- `src/lib/seo.ts` — JSON-LD helpers for Place, Article, BreadcrumbList
- `src/seed.ts` — seed script to populate D1 with initial spots

**Delete (or ignore — no need to actively delete, just stop importing):**
- `src/routes/api/ai.ts`, `fraud.ts`, `availability.ts`, `experiments.ts`, `inquiries.ts`, `scheduling.ts`, `experience.ts`, `integrations.ts`, `dashboards.ts`, `partners.ts`, `config.ts`, `saved-searches.ts`, `waitlist.ts`
- `src/assets/js/contact.ts`, `content-workflow.ts`
- `src/templates/contact.ts` (simplify later)

**Keep as-is:**
- `src/db/client.ts` — `createDb()` wrapper
- `drizzle.config.ts`
- `wrangler.toml` (D1 bindings unchanged)

---

## Task 1: New Database Schema

**Files:**
- Replace: `src/db/schema.ts`
- Create: `src/db/migrations/0001_findernyc_pivot.sql`

- [ ] **Step 1: Write the new Drizzle schema**

Replace `src/db/schema.ts` entirely with the new schema containing tables: `spots`, `spot_tips`, `neighborhoods`, `guides`, `guide_spots`, `ratings`, `newsletter_subscribers`. The `spots` table includes all "local friend" fields: `title` (catchy hook), `description`, `one_liner`, `pro_tip`, `subway`, `while_here`, `best_time`, `avoid_time`, `budget_note`, `vibe_tags` (JSON array), `price_level`, geo fields, `published` boolean.

Key types:
- Use `integer('id').primaryKey({ autoIncrement: true })` for all IDs
- Use `integer('field', { mode: 'timestamp_ms' }).$defaultFn(() => new Date())` for timestamps
- Use `integer('field', { mode: 'boolean' }).notNull().default(false)` for booleans
- Use `text('field')` for all string fields
- Use `real('field')` for lat/lng

- [ ] **Step 2: Write the raw SQL migration**

Create `src/db/migrations/0001_findernyc_pivot.sql` with:
- DROP old tables (alert_delivery_attempts, saved_searches, analytics_events, waitlist_entries, leads)
- CREATE all new tables
- CREATE VIRTUAL TABLE spots_fts USING fts5(name, title, one_liner, neighborhood, category, content=spots, content_rowid=id)
- CREATE triggers: spots_ai (AFTER INSERT), spots_ad (AFTER DELETE), spots_au (AFTER UPDATE) to keep FTS in sync
- CREATE indexes on: spots(borough), spots(category), spots(neighborhood), spots(published), spot_tips(spot_id), ratings(spot_id), guide_spots(guide_id), guide_spots(spot_id), guides(published), guides(type)

- [ ] **Step 3: Apply migration to D1**

Run: `cd /Users/lsendel/Projects/findernyc.com && wrangler d1 execute findernyc-production --remote --file=src/db/migrations/0001_findernyc_pivot.sql`

- [ ] **Step 4: Verify migration**

Run: `wrangler d1 execute findernyc-production --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"`

Expected tables: guide_spots, guides, neighborhoods, newsletter_subscribers, ratings, spot_tips, spots, spots_fts

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/migrations/0001_findernyc_pivot.sql
git commit -m "feat: pivot schema — spots, guides, neighborhoods, ratings, FTS5 search"
```

---

## Task 2: Shared Layout Template + SEO Helpers

**Files:**
- Create: `src/templates/layout.ts`
- Create: `src/lib/seo.ts`

- [ ] **Step 1: Create shared layout template**

Create `src/templates/layout.ts` with exports:
- `SITE_NAME = 'FinderNYC'`
- `SITE_URL = 'https://findernyc.com'`
- `escapeHtml(value: string): string` — HTML entity escaping
- `fontHeadHtml(): string` — Google Fonts preconnect + Manrope link
- `navHtml(options?: { activePath?: string }): string` — desktop + mobile nav with links to: /search (Explore), /neighborhoods, /guides, /about. Mobile hamburger with drawer.
- `footerHtml(): string` — brand, tagline, links (About, Privacy, Terms), copyright
- `mobileNavScript(): string` — hamburger toggle, drawer open/close, escape key, focus management
- `pageShell(meta: PageMeta, bodyHtml: string): string` — full HTML document with head (meta, OG, robots, canonical, fonts, CSS, structured data scripts), body (nav, main, footer, mobile nav script, client JS)
- Type: `PageMeta = { title, description, path, noindex?, structuredData?: unknown[] }`

Nav links for the new site: Explore (/search), Neighborhoods (/neighborhoods), Guides (/guides), About (/about).

- [ ] **Step 2: Create SEO helpers**

Create `src/lib/seo.ts` with exports:
- `placeJsonLd(spot)` — Schema.org Place with geo, aggregateRating, address
- `breadcrumbJsonLd(items: Array<{name, url}>)` — Schema.org BreadcrumbList
- `websiteJsonLd()` — Schema.org WebSite with SearchAction pointing to /search?q=

- [ ] **Step 3: Commit**

```bash
git add src/templates/layout.ts src/lib/seo.ts
git commit -m "feat: shared layout shell + SEO helpers"
```

---

## Task 3: Spot Page Template

**Files:**
- Create: `src/templates/spot.ts`

- [ ] **Step 1: Write the spot page template**

Create `src/templates/spot.ts` with:

Type `SpotPageData` containing all spot fields + `avg_rating`, `rating_count`, `tips` array, `related_spots` array.

Function `spotPageHtml(spot: SpotPageData): string` that renders:

```
<article class="spot-page">
  <header class="spot-hero">
    [photo if available]
    <h1>{catchy title}</h1>
    <p class="spot-meta">{neighborhood} · {borough} · {category} · {price}</p>
  </header>
  <div class="spot-content container">
    <section class="spot-body">
      [description paragraphs — split on double newlines]
      <div class="pro-tip">Pro tip: ...</div>
      <div class="getting-there">🚇 Subway: ...</div>
      <div class="while-here">While you're in {neighborhood}: ...</div>
      <div class="budget-note">Budget: ...</div>
      <div class="best-time">Best time: ...</div>
      [Google Maps link if available]
    </section>
    [vibe tags as spans]
    <section class="spot-rating" data-spot-id="{id}">
      [5 clickable star buttons, filled up to rounded avg]
      <p>average {avg}/5 from {count} locals</p>
    </section>
    <section class="locals-say">
      <h2>What locals are saying</h2>
      [blockquotes with cite]
    </section>
    <section class="submit-tip">
      <h3>Know something about this spot? Drop your tip below</h3>
      <form id="tip-form" data-spot-id="{id}">
        <textarea name="text" ...></textarea>
        <input name="author_name" ...>
        <input name="author_area" ...>
        <button>Share your tip</button>
        <p id="tip-status" role="status" aria-live="polite"></p>
      </form>
    </section>
    <section class="nearby-spots">
      <h2>More in {neighborhood}</h2>
      [spot cards grid]
    </section>
  </div>
</article>
```

Uses `pageShell()` with Place + Breadcrumb structured data.

All user-facing text must go through `escapeHtml()`.

- [ ] **Step 2: Commit**

```bash
git add src/templates/spot.ts
git commit -m "feat: spot page template — local friend vibe with ratings, tips, related spots"
```

---

## Task 4: Search Results Page Template

**Files:**
- Create: `src/templates/search.ts`

- [ ] **Step 1: Write the search results page template**

Create `src/templates/search.ts` with:

Constants:
- `CATEGORIES` array: food/coffee/bar/rooftop/view/park/museum/shop/free with emoji
- `BOROUGHS` array: All/Manhattan/Brooklyn/Queens/Bronx/Staten Island

Types: `SearchResultSpot`, `SearchResultGuide`

Helper `spotCardHtml(spot)` — card with photo, title, meta (neighborhood, borough, category), rating, one_liner, price + subway.

Helper `guideCardHtml(guide)` — inline card with badge "📖 Guide", title, excerpt.

Function `searchPageHtml(opts)` that renders:
```
<section class="search-page">
  <div class="container">
    [search bar with input, hidden filters, suggest dropdown]
    [filter rows: category pills, borough pills, sort pills]
    [result count]
    [results grid: spot cards interleaved with guide cards every 4th item]
    [empty state if no results]
  </div>
</section>
```

Filter pills link to `/search?q=...&category=...&borough=...&sort=...` — server-side filtering, no JS needed.

Uses `pageShell()` with noindex: true (search pages shouldn't be indexed).

- [ ] **Step 2: Commit**

```bash
git add src/templates/search.ts
git commit -m "feat: search results page template with spot cards, guide cards, filters"
```

---

## Task 5: Landing Page Template

**Files:**
- Replace: `src/templates/landing.ts`

- [ ] **Step 1: Rewrite the landing page**

Replace `src/templates/landing.ts`. The new landing page has:

Types: `FeaturedSpot`, `FeaturedNeighborhood`

Function `landingPageHtml(opts?)` that renders:
```
<section class="hero">
  <h1>Skip the tourist traps.<br>Here's where real New Yorkers actually go.</h1>
  <p>Curated by locals, not algorithms. Hidden gems, honest tips, zero BS.</p>
  [hero search form with input + submit + suggest dropdown]
  [category pills: 🍕 Food, ☕ Coffee, 🍸 Bars, ...]
</section>

<section class="featured-section"> (if spots available)
  <h2>Hidden Gems</h2>
  [featured spot cards grid — 6 cards]
  <a href="/search">Explore all spots →</a>
</section>

<section class="neighborhoods-section"> (if neighborhoods available)
  <h2>Explore by Neighborhood</h2>
  [neighborhood cards grid — 8 cards with name, borough, vibe, spot count]
</section>

<section class="newsletter-section">
  <h2>Get weekly hidden gems — free</h2>
  [email input + subscribe button]
</section>
```

Uses `pageShell()` with WebSite structured data + SearchAction.

- [ ] **Step 2: Commit**

```bash
git add src/templates/landing.ts
git commit -m "feat: landing page — hero search, featured spots, neighborhood grid, newsletter"
```

---

## Task 6: API Routes

**Files:**
- Replace: `src/routes/api/search.ts`
- Create: `src/routes/api/ratings.ts`
- Create: `src/routes/api/tips.ts`
- Create: `src/routes/api/newsletter.ts`

- [ ] **Step 1: Write search + suggest API**

Replace `src/routes/api/search.ts` with a Hono router:

`GET /` — Full-text search. Accepts: `q`, `category`, `borough`, `neighborhood`, `sort` (relevance|rating|newest). Uses FTS5 MATCH for text queries, raw SQL filters for category/borough/neighborhood. Joins ratings for avg_rating/rating_count. Returns `{ spots: [...], guides: [...], total: number }`.

`GET /suggest` — Typeahead. Accepts: `q` (min 2 chars). Runs 3 parallel queries: spots FTS (LIMIT 5), guides LIKE title (LIMIT 3), neighborhoods LIKE name (LIMIT 3). Returns `{ spots, guides, neighborhoods }`.

FTS5 query uses `q + '*'` for prefix matching.

- [ ] **Step 2: Write ratings API**

Create `src/routes/api/ratings.ts`:

`POST /` — Accepts `{ spot_id, score, session_id? }`. Validates score 1-5. If session_id exists, check for existing rating and UPDATE instead of INSERT (dedup). Returns `{ success: true }`.

- [ ] **Step 3: Write tips API**

Create `src/routes/api/tips.ts`:

`POST /` — Accepts `{ spot_id, text, author_name?, author_area? }`. Validates text length (10-500 chars). Inserts with approved=1 (auto-approve for now). Returns `{ success: true }`.

- [ ] **Step 4: Write newsletter API**

Create `src/routes/api/newsletter.ts`:

`POST /` — Accepts `{ email }`. Validates email format. INSERT with UNIQUE constraint catch (already subscribed). Returns `{ success: true, message }`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/search.ts src/routes/api/ratings.ts src/routes/api/tips.ts src/routes/api/newsletter.ts
git commit -m "feat: search/suggest/ratings/tips/newsletter API routes"
```

---

## Task 7: Page Routes (SSR)

**Files:**
- Create: `src/routes/pages.ts`

- [ ] **Step 1: Write SSR page routes**

Create `src/routes/pages.ts` as a Hono router with 3 routes:

`GET /` — Landing page. Queries top 6 published spots by avg_rating + top 8 neighborhoods by spot_count. Passes to `landingPageHtml()`.

`GET /spots/:slug` — Spot page. Queries spot by slug (WHERE published=1), plus tips (WHERE approved=1, LIMIT 10), plus related spots (same neighborhood, LIMIT 4). Returns 404 if not found. Passes to `spotPageHtml()`.

`GET /search` — Search results page. Reads q/category/borough/neighborhood/sort from query params. Builds the same SQL as the search API but renders HTML via `searchPageHtml()`. This is SSR — the page works without JavaScript.

All queries join ratings for avg_rating/rating_count using correlated subqueries.

- [ ] **Step 2: Commit**

```bash
git add src/routes/pages.ts
git commit -m "feat: SSR page routes — landing, spot, search"
```

---

## Task 8: Rewrite App Entry (index.ts)

**Files:**
- Replace: `src/index.ts`

- [ ] **Step 1: Strip down index.ts**

Replace `src/index.ts` with minimal Hono app:
- Import and mount: `pagesRouter` at `/`, `searchRouter` at `/api/search`, `ratingsRouter` at `/api/ratings`, `tipsRouter` at `/api/tips`, `newsletterRouter` at `/api/newsletter`
- Simple static routes: `/about` (placeholder), `/privacy`, `/terms`
- `/robots.txt` — Allow all + sitemap URL
- `/sitemap.xml` — Dynamic: query published spots + guides slugs, generate XML
- `/llms.txt` — Site description + URL patterns
- `/favicon.ico` — redirect to placeholder
- `app.onError` — generic JSON error response
- Env type: just `{ Bindings: { DB: D1Database } }`

Remove ALL old imports (ai, fraud, scheduling, experiments, etc).

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: stripped index.ts — only spot/search/rating/tip/newsletter routes"
```

---

## Task 9: Client-Side JavaScript

**Files:**
- Replace: `src/assets/js/main.ts`
- Modify: `package.json` (build:client script)

- [ ] **Step 1: Write minimal client JS**

Replace `src/assets/js/main.ts` with 4 modules in one IIFE:

1. **Session ID** — `getSessionId()`: read/write `fnc_sid` in localStorage, generate via `crypto.randomUUID()`.

2. **Search Suggest** — `initSearchSuggest(inputId, dropdownId)`: on input (debounce 300ms, min 2 chars), fetch `/api/search/suggest?q=`, build dropdown with sections (Spots/Guides/Neighborhoods) using `textContent` for user data (NOT setting raw text content as markup — use DOM methods: `createElement`, `textContent`). Close on click-outside and Escape.

3. **Star Ratings** — `initRatings()`: find `.spot-rating`, read `data-spot-id` from tip form, attach click handlers to `.star` buttons, POST to `/api/ratings`, update star fill classes and text on success.

4. **Tip Form** — `initTipForm()`: attach submit handler to `#tip-form`, validate text length, POST to `/api/tips`, show status message, reset form on success.

5. **Newsletter Form** — `initNewsletter()`: attach submit handler to `#newsletter-form`, POST to `/api/newsletter`, show status message.

All init functions called in `DOMContentLoaded`. Use DOM APIs (createElement, textContent, appendChild) for building suggest dropdown items — avoid setting raw strings as markup content.

- [ ] **Step 2: Update build:client script in package.json**

Change from 3 entry points to just `main.ts`:
```
"build:client": "esbuild src/assets/js/main.ts --bundle --minify --target=esnext --outdir=src/assets/js --entry-names=[name]"
```

- [ ] **Step 3: Build client JS**

Run: `cd /Users/lsendel/Projects/findernyc.com && npm run build:client`

Expected: `src/assets/js/main.js` generated.

- [ ] **Step 4: Commit**

```bash
git add src/assets/js/main.ts package.json
git commit -m "feat: client JS — search suggest, star ratings, tip form, newsletter"
```

---

## Task 10: CSS Styles

**Files:**
- Replace: `src/assets/css/styles.css`

- [ ] **Step 1: Write new CSS**

Replace `src/assets/css/styles.css`. Structure:

1. **Design tokens** — keep ALL existing `:root` variables verbatim from current file
2. **Reset** — keep existing reset verbatim
3. **Base typography** — body font, headings, links, lists
4. **Layout** — `.container` with max-width and padding
5. **Skip link** — `.skip-link` for accessibility
6. **Nav styles** — keep existing `.site-header`, `.nav-desktop`, `.nav-mobile`, `.hamburger`, `.mobile-drawer` styles (these work well)
7. **Buttons** — `.btn`, `.btn-primary` (dark blue bg, white text, amber hover)
8. **Hero section** — dark gradient background (`linear-gradient(135deg, var(--color-bg-dark), var(--color-brand-primary))`), white text, large centered h1, search form
9. **Hero search** — `.hero-search-wrap` with white background, rounded corners, icon + input + button inline
10. **Category pills** — `.category-pill` rounded buttons, `.filter-pill` for search page, `--active` variant with filled primary color
11. **Featured cards** — `.featured-grid` (CSS grid 3 cols), `.featured-card` with image top + body below, shadow on hover
12. **Neighborhood grid** — `.hood-grid` (CSS grid 4 cols), `.hood-card` with image + overlay text
13. **Newsletter** — `.newsletter-box` centered card with email input + button inline
14. **Search page** — `.search-form` with icon + input, `.search-filters` with filter rows, `.search-results-grid`
15. **Spot cards** — `.spot-card` horizontal layout (image left, body right) for search results, vertical in grid for related spots
16. **Guide cards** — `.guide-card-inline` with left border accent, badge
17. **Spot page** — `.spot-hero` full-width with overlay text, `.spot-content` centered, `.spot-body` prose styling
18. **Pro tip / getting-there / while-here / budget-note / best-time** — each with left border accent (`border-left: 4px solid var(--color-brand-accent)`), padding, light background
19. **Maps link** — inline link with arrow
20. **Vibe tags** — `.vibe-tag` rounded pill, light background, small text
21. **Ratings** — `.spot-rating`, `.stars` inline, `.star` large clickable, `.star--filled` amber color
22. **Local tips** — `.locals-say` section, `blockquote.local-tip` with left border, italic text, `cite` right-aligned
23. **Tip form** — textarea, two inputs in a row, submit button
24. **Suggest dropdown** — absolute positioned below search input, white background, shadow, `.suggest-section` headers, `.suggest-item` hover highlight
25. **Search empty state** — centered text with CTA
26. **Footer** — `.site-footer` dark background, grid layout
27. **Responsive** — `@media (max-width: 768px)`: single column grids, stacked search form, full-width cards, hamburger visible

Key visual decisions:
- Hero gradient: `var(--color-bg-dark)` to `var(--color-brand-primary)`
- Accent color for pro-tip/info boxes: `var(--color-brand-accent)` (#f59e0b amber)
- Star color: `var(--color-star)` (#f59e0b)
- Card shadows: `var(--shadow-card)` → `var(--shadow-card-hover)` on hover
- Font: Manrope throughout (already loaded)
- Spacing: use existing `--space-*` tokens

- [ ] **Step 2: Commit**

```bash
git add src/assets/css/styles.css
git commit -m "feat: CSS — hero, spot pages, search, ratings, local tips, neighborhood grid"
```

---

## Task 11: Seed Data (10 NYC Spots)

**Files:**
- Create: `src/seed.ts`

- [ ] **Step 1: Write seed script**

Create `src/seed.ts` — a TypeScript script that generates SQL INSERT statements for:

10 real NYC spots with full "local friend" content:
1. LIC Landing (rooftop, Queens) — "Secret Rooftop in Queens With Zero Tourists"
2. Los Tacos No. 1 (food, Chelsea) — "The Only Taco Spot in Manhattan Worth Standing in Line For"
3. Bemelmans Bar (bar, UES) — "The Most Beautiful Bar in New York That Nobody Under 30 Knows About"
4. Devocion (coffee, Williamsburg) — "3-Story Coffee Temple in Williamsburg With a Living Wall"
5. Birria-Landia (food, Jackson Heights) — "Food Truck Birria Tacos That Are Worth the Trip to Queens"
6. The Cloisters (museum, Washington Heights) — "A Medieval Castle in Upper Manhattan That Most Tourists Miss"
7. DUMBO Archway (view, DUMBO) — "The Instagram Bridge Shot Everyone Takes (And a Better Spot Nearby)"
8. Abraco (coffee, East Village) — "Tiny East Village Espresso Bar With a Cult Following"
9. Prospect Park Long Meadow (park, Prospect Heights) — "Central Park Gets All the Press But This Brooklyn Park Is Better"
10. PDT (bar, East Village) — "A Speakeasy Hidden Inside a Hot Dog Shop in the East Village"

Each spot has: name, slug, title, neighborhood, borough, category, description (2 paragraphs), one_liner, pro_tip, subway, while_here, best_time, avoid_time, budget_note, vibe_tags, price_level, published=1.

Plus 10 sample tips (2-3 per popular spot), and 10 neighborhoods with vibes.

Plus FTS rebuild: `INSERT INTO spots_fts(spots_fts) VALUES ('rebuild');`

Script outputs SQL to stdout: `npx tsx src/seed.ts > seed.sql`

- [ ] **Step 2: Generate and apply seed SQL**

```bash
cd /Users/lsendel/Projects/findernyc.com
npx tsx src/seed.ts > seed.sql
wrangler d1 execute findernyc-production --remote --file=seed.sql
```

- [ ] **Step 3: Verify seed data**

```bash
wrangler d1 execute findernyc-production --remote --command="SELECT count(*) as c FROM spots"
wrangler d1 execute findernyc-production --remote --command="SELECT count(*) as c FROM spot_tips"
wrangler d1 execute findernyc-production --remote --command="SELECT count(*) as c FROM neighborhoods"
```

Expected: 10, ~10, 10

- [ ] **Step 4: Commit**

```bash
git add src/seed.ts
git commit -m "feat: seed script — 10 NYC spots with tips + 10 neighborhoods"
```

---

## Task 12: Build, Deploy, Verify

**Files:** No new files — integration + deployment

- [ ] **Step 1: Build client JS**

```bash
cd /Users/lsendel/Projects/findernyc.com && npm run build:client
```

- [ ] **Step 2: Type check**

```bash
npm run typecheck
```

Fix any type errors before proceeding.

- [ ] **Step 3: Deploy to Cloudflare**

```bash
wrangler deploy
```

- [ ] **Step 4: Verify landing page**

Open https://findernyc.com — verify hero search, featured spots, neighborhood grid, newsletter form.

- [ ] **Step 5: Verify spot page**

Open https://findernyc.com/spots/lic-landing-rooftop — verify title, pro tip, subway, ratings, local tips, tip form, related spots.

- [ ] **Step 6: Verify search**

Open https://findernyc.com/search?q=tacos — verify results show Los Tacos No. 1 and Birria-Landia, filters work.

- [ ] **Step 7: Commit build artifacts**

```bash
git add -A
git commit -m "chore: build artifacts for initial deployment"
```
