import { escapeHtml, pageShell, type SiteContext } from './layout';
import { websiteJsonLd } from '../lib/seo';

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export type FeaturedSpot = {
  slug: string;
  title: string;
  neighborhood: string;
  category: string;
  one_liner: string | null;
  photo_url: string | null;
  avg_rating: number | null;
  rating_count: number;
};

export type FeaturedNeighborhood = {
  slug: string;
  name: string;
  borough: string;
  vibe: string | null;
  photo_url: string | null;
  spot_count: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ratingStars(avg: number | null, count: number): string {
  if (avg == null || count === 0) return '';
  const full = Math.round(avg);
  const stars = '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
  return `<span class="featured-card-rating" aria-label="${avg.toFixed(1)} out of 5 stars">${stars} <span class="rating-num">${avg.toFixed(1)}</span> <span class="rating-count">(${count})</span></span>`;
}

const CATEGORY_PILLS: { emoji: string; label: string; slug: string }[] = [
  { emoji: '\uD83C\uDF55', label: 'Food', slug: 'food' },
  { emoji: '\u2615', label: 'Coffee', slug: 'coffee' },
  { emoji: '\uD83C\uDF78', label: 'Bars', slug: 'bars' },
  { emoji: '\uD83C\uDF07', label: 'Rooftops', slug: 'rooftops' },
  { emoji: '\uD83D\uDC40', label: 'Views', slug: 'views' },
  { emoji: '\uD83C\uDF33', label: 'Parks', slug: 'parks' },
  { emoji: '\uD83C\uDFA8', label: 'Museums', slug: 'museums' },
  { emoji: '\uD83C\uDD93', label: 'Free', slug: 'free' },
];

/* ------------------------------------------------------------------ */
/*  Section builders                                                   */
/* ------------------------------------------------------------------ */

function heroSection(site?: SiteContext): string {
  const pills = CATEGORY_PILLS.map(
    (c) =>
      `<a href="/search?category=${encodeURIComponent(c.slug)}" class="category-pill">${c.emoji} ${escapeHtml(c.label)}</a>`,
  ).join('\n          ');

  const heroTitle = site?.heroTitle ?? 'Skip the tourist traps.\nHere\'s where real New Yorkers actually go.';
  const heroSubtitle = site?.heroSubtitle ?? 'Curated by locals, not algorithms. Hidden gems, honest tips, zero BS.';
  const titleParts = heroTitle.split('\n');

  return `<section class="hero">
    <div class="container">
      <h1 class="hero-title">${titleParts.map((p) => escapeHtml(p)).join('<br>')}</h1>
      <p class="hero-subtitle">${escapeHtml(heroSubtitle)}</p>
      <form action="/search" class="hero-search-form" role="search">
        <div class="hero-search-wrapper">
          <input type="search" name="q" class="hero-search-input" placeholder="tacos, rooftops, coffee, bookstores..." aria-label="Search spots">
          <button type="submit" class="btn btn-primary hero-search-btn">Search</button>
        </div>
        <div id="hero-suggest-dropdown" class="hero-suggest-dropdown" hidden></div>
      </form>
      <div class="category-pills" role="navigation" aria-label="Browse by category">
        ${pills}
      </div>
    </div>
  </section>`;
}

function featuredSection(spots: FeaturedSpot[]): string {
  if (spots.length === 0) return '';

  const cards = spots
    .map((spot) => {
      const img = spot.photo_url
        ? `<img src="${escapeHtml(spot.photo_url)}" alt="${escapeHtml(spot.title)}" class="featured-card-img" loading="lazy">`
        : `<div class="featured-card-img featured-card-img--placeholder" aria-hidden="true"></div>`;

      const liner = spot.one_liner
        ? `<p class="featured-card-liner">${escapeHtml(spot.one_liner)}</p>`
        : '';

      const rating = ratingStars(spot.avg_rating, spot.rating_count);

      return `<a href="/spots/${encodeURIComponent(spot.slug)}" class="featured-card">
        ${img}
        <div class="featured-card-body">
          <h3>${escapeHtml(spot.title)}</h3>
          <p class="featured-card-meta">${escapeHtml(spot.neighborhood)} &middot; ${escapeHtml(spot.category)}</p>
          ${liner}
          ${rating}
        </div>
      </a>`;
    })
    .join('\n      ');

  return `<section class="featured-section">
    <div class="container">
      <h2 class="section-title">${escapeHtml('Hidden Gems')}</h2>
      <p class="section-subtitle">${escapeHtml('The spots locals keep to themselves')}</p>
      <div class="featured-grid">
        ${cards}
      </div>
      <a href="/search" class="section-cta">${escapeHtml('Explore all spots')} &rarr;</a>
    </div>
  </section>`;
}

function neighborhoodsSection(neighborhoods: FeaturedNeighborhood[]): string {
  if (neighborhoods.length === 0) return '';

  const cards = neighborhoods
    .map((hood) => {
      const img = hood.photo_url
        ? `<img src="${escapeHtml(hood.photo_url)}" alt="${escapeHtml(hood.name)}" class="hood-card-img" loading="lazy">`
        : `<div class="hood-card-img hood-card-img--placeholder" aria-hidden="true"></div>`;

      const vibe = hood.vibe
        ? `<p class="hood-card-vibe">${escapeHtml(hood.vibe)}</p>`
        : '';

      return `<a href="/search?neighborhood=${encodeURIComponent(hood.name)}" class="hood-card">
        ${img}
        <div class="hood-card-body">
          <h3>${escapeHtml(hood.name)}</h3>
          <p class="hood-card-meta">${escapeHtml(hood.borough)}</p>
          ${vibe}
          <p class="hood-card-count">${hood.spot_count} ${hood.spot_count === 1 ? 'spot' : 'spots'}</p>
        </div>
      </a>`;
    })
    .join('\n      ');

  return `<section class="neighborhoods-section">
    <div class="container">
      <h2 class="section-title">${escapeHtml('Explore by Neighborhood')}</h2>
      <p class="section-subtitle">${escapeHtml('Every neighborhood has a personality. Find yours.')}</p>
      <div class="hood-grid">
        ${cards}
      </div>
    </div>
  </section>`;
}

function newsletterSection(): string {
  return `<section class="newsletter-section">
    <div class="container">
      <div class="newsletter-box">
        <h2>${escapeHtml('Get weekly hidden gems \u2014 free')}</h2>
        <p>${escapeHtml("One email a week. The best spots locals don't tell tourists about.")}</p>
        <form id="newsletter-form" class="newsletter-form">
          <input type="email" name="email" placeholder="your@email.com" required>
          <button type="submit" class="btn btn-primary">${escapeHtml('Subscribe')}</button>
        </form>
        <p id="newsletter-status" role="status" aria-live="polite"></p>
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function landingPageHtml(opts?: {
  featuredSpots?: FeaturedSpot[];
  neighborhoods?: FeaturedNeighborhood[];
  site?: SiteContext;
}): string {
  const spots = opts?.featuredSpots ?? [];
  const hoods = opts?.neighborhoods ?? [];
  const site = opts?.site;

  const body = [
    heroSection(site),
    featuredSection(spots),
    neighborhoodsSection(hoods),
    newsletterSection(),
  ].join('\n');

  return pageShell(
    {
      title: site?.metaTitle ?? 'FinderNYC \u2014 Skip the Tourist Traps. Real NYC Hidden Gems.',
      description: site?.metaDescription ?? 'Discover where real New Yorkers actually go. Hidden gems, local tips, and honest recommendations.',
      path: '/',
      structuredData: [websiteJsonLd(site)],
      site,
    },
    body,
  );
}
