# FinderNYC SEO Strategy

## Goal

Make SEO automatic for the pages that should rank, predictable for the pages that should not, and reusable across every FinderNYC domain.

## What is automated

### 1. Metadata defaults

All rendered pages should use `buildPageSeo()` from [src/lib/page-seo.ts](/Users/lsendel/Projects/findernyc.com/src/lib/page-seo.ts).

This centralizes:

- title formatting
- description trimming
- canonical URL generation per domain
- Open Graph image defaults
- article metadata for editorial pages
- noindex behavior for search pages

### 2. Structured data

Use [src/lib/seo.ts](/Users/lsendel/Projects/findernyc.com/src/lib/seo.ts) for page-level JSON-LD.

Current pattern:

- Landing page: `WebSite` + `CollectionPage` + featured `ItemList`
- Spot pages: `Place` + breadcrumb
- Guides index: `CollectionPage` + `ItemList`
- Guide detail: `Article` + breadcrumb
- Neighborhoods index: `CollectionPage` + `ItemList`
- Search page: noindex, no ranking-oriented structured data

### 3. Sitemap generation

The sitemap should be generated from live content in [src/index.ts](/Users/lsendel/Projects/findernyc.com/src/index.ts) using `sitemapXml()`.

Rules:

- include all static public pages
- include all published spots
- include all published guides
- emit `lastmod` from content timestamps when available
- use the active site domain from `SiteContext`

### 4. Domain-aware canonicals

Canonical URLs must always resolve from [src/site/context.ts](/Users/lsendel/Projects/findernyc.com/src/site/context.ts), not from hard-coded global constants in page templates.

This keeps FinderNYC, Hidden City Gems, Miami, and MMEEXX on their own canonical domains.

## Indexation policy

### Index

- `/`
- `/guides`
- `/guides/:slug`
- `/spots/:slug`
- `/neighborhoods`
- `/about`
- `/privacy`
- `/terms`

### Noindex

- `/search`

Search results are too query-fragmented to be useful landing pages for organic search. Ranking pages should be stable editorial pages and spot detail pages instead.

## Content strategy

### Spots

Each spot page should target:

- one place
- one neighborhood context
- one useful “why go” angle
- one concise one-liner for snippet extraction

### Guides

Guide pages should use `seoTitle` and `seoDescription` when present in the database. If not present, fall back to title + excerpt automatically.

Guides are the primary scalable editorial SEO surface because they can rank for broader local-intent searches:

- neighborhood guides
- “best rooftop in X”
- museum / park / coffee area roundups
- “things to do in X without tourist traps”

### Neighborhood pages

The current neighborhood index supports browsing and internal linking. If the product later adds `/neighborhoods/:slug`, those pages should become major ranking targets.

## Internal linking rules

- Landing page should link to spots, neighborhoods, and guides.
- Spot pages should link to nearby spots and neighborhood search flows.
- Guide pages should link to relevant spots and neighborhoods.
- Neighborhood browsing should send users into search and eventually into spot detail pages.

The SEO goal is not just metadata. It is a crawlable internal path from broad discovery to specific locations.

## Future upgrades

- add dedicated neighborhood detail pages with editorial copy
- add guide-to-spot relationship rendering on guide pages
- generate social images per guide or neighborhood
- store SEO fields for spots, not only guides
- add image sitemap support once content images are stable
