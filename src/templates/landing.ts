import type { LandingPageViewModel } from '../application/content/presenters';
import { buildPageSeo } from '../lib/page-seo';
import { collectionPageJsonLd, itemListJsonLd, websiteJsonLd } from '../lib/seo';
import { escapeHtml, pageShell } from './layout';
import type { SiteContext } from '../site/context';

const CATEGORY_PILLS: { label: string; slug: string }[] = [
  { label: 'Food', slug: 'food' },
  { label: 'Rooftops', slug: 'rooftop' },
  { label: 'Coffee', slug: 'coffee' },
  { label: 'Bars', slug: 'bar' },
  { label: 'Free', slug: 'free' },
  { label: 'Pizza', slug: 'pizza' },
  { label: 'Views', slug: 'view' },
];

const CURATED_HOME_GEMS = [
  {
    slug: 'lic-landing-rooftop',
    title: 'Secret Rooftop in Queens With Zero Tourists',
    description: 'Free sunset views, bring your own drinks. Locals only.',
    tag: 'Queens',
  },
  {
    slug: 'best-slice-brooklyn-after-midnight',
    title: 'Best Slice in Brooklyn After Midnight',
    description: "Square Sicilian slices that are actually worth the late-night detour.",
    tag: 'Greenpoint',
  },
  {
    slug: 'free-jazz-nights-harlem-locals-love',
    title: 'Free Jazz Nights Harlem Locals Love',
    description: 'Real Harlem jazz, not the tourist version.',
    tag: 'Harlem',
  },
  {
    slug: 'best-bagel-nyc-not-ess-a-bagel',
    title: "Best Bagel in NYC That Isn't Ess-a-Bagel",
    description: 'Hand-rolled Queens bagels with scallion cream cheese that actually tastes right.',
    tag: 'Queens',
  },
  {
    slug: 'best-dollar-oysters-east-village',
    title: 'Best Dollar Oysters in the East Village',
    description: 'Dollar oysters and a cheap-drinks window that still feels worth knowing about.',
    tag: 'East Village',
  },
  {
    slug: 'jackson-heights-food-crawl-tourist-spot',
    title: 'Jackson Heights Food Crawl That Beats Any Tourist Spot',
    description: 'Colombian, Thai, and Tibetan all within three blocks. Pure flavor.',
    tag: 'Queens',
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Section builders                                                   */
/* ------------------------------------------------------------------ */

function heroSection(site?: SiteContext): string {
  const pills = CATEGORY_PILLS.map(
    (c) =>
      `<a href="/hidden-gems?category=${encodeURIComponent(c.slug)}" class="pill category-pill">${escapeHtml(c.label)}</a>`,
  ).join('\n          ');

  const heroTitle = site?.heroTitle ?? 'Skip the tourist traps.\nHere\'s where real New Yorkers actually go.';
  const titleParts = heroTitle.split('\n');

  return `<section class="hero">
    <div class="hero-media" aria-hidden="true"></div>
    <div class="hero-veil" aria-hidden="true"></div>
    <div class="container hero-layout">
      <div class="hero-copy">
        <h1 class="hero-title">${titleParts.map((p) => escapeHtml(p)).join('<br>')}</h1>
        <form action="/hidden-gems" class="hero-search-form" role="search">
          <div class="search-bar">
            <input id="hero-search-input" type="text" name="q" class="hero-search-input" placeholder="Tacos, rooftops, coffee, hidden bars..." aria-label="Search spots">
          </div>
          <div id="hero-suggest-dropdown" class="hero-suggest-dropdown suggest-dropdown" hidden></div>
        </form>
        <div class="category-pills" role="navigation" aria-label="Browse by category">
          ${pills}
        </div>
      </div>
    </div>
  </section>`;
}

function editorialSection(site?: SiteContext): string {
  const cityName = site?.city ?? 'the city';
  return `<section class="editorial-section">
    <div class="container editorial-grid">
      <div class="editorial-intro">
        <p class="eyebrow">How to use FinderNYC</p>
        <h2 class="section-title section-title--left">Explore ${escapeHtml(cityName)} like someone texted you the good places.</h2>
        <p class="section-subtitle section-subtitle--left">This is not a bucket list. It is a local recommendations engine for food, views, neighborhoods, and practical detours that actually fit together.</p>
      </div>
      <div class="editorial-steps">
        <article class="editorial-step">
          <span class="editorial-step-number">01</span>
          <h3>Pick a mood</h3>
          <p>Late-night tacos, sunset rooftops, quiet parks, museums, bookstores, bars with actual atmosphere.</p>
        </article>
        <article class="editorial-step">
          <span class="editorial-step-number">02</span>
          <h3>Narrow by neighborhood</h3>
          <p>Search by where you are or where you are headed so each recommendation makes sense in context.</p>
        </article>
        <article class="editorial-step">
          <span class="editorial-step-number">03</span>
          <h3>Follow the local chain</h3>
          <p>Use nearby spots, guide pages, and timing notes to turn one recommendation into a whole stretch of city.</p>
        </article>
      </div>
    </div>
  </section>`;
}

function renderGemCard(
  spot: (typeof CURATED_HOME_GEMS)[number],
): string {
  return `<a href="/spots/${encodeURIComponent(spot.slug)}" class="gem-card">
    <div class="gem-card-copy">
      <h3>${escapeHtml(spot.title)}</h3>
      <p>${escapeHtml(spot.description)}</p>
      <span class="tag">${escapeHtml(spot.tag)}</span>
    </div>
  </a>`;
}

function featuredSection(): string {
  const cards = CURATED_HOME_GEMS.map((spot) => renderGemCard(spot)).join('\n          ');
  return `<section class="featured">
    <div class="container">
      <h2>${escapeHtml('Hidden Gems Right Now')}</h2>
      <div class="gem-grid">
        ${cards}
      </div>
    </div>
  </section>`;
}

function neighborhoodsSection(neighborhoods: LandingPageViewModel['neighborhoods']): string {
  if (neighborhoods.length === 0) return '';

  const cards = neighborhoods
    .map((hood) => {
      const img = hood.photoUrl
        ? `<img src="${escapeHtml(hood.photoUrl)}" alt="${escapeHtml(hood.name)}" class="hood-card-img" loading="lazy">`
        : `<div class="hood-card-img hood-card-img--placeholder" aria-hidden="true"></div>`;

      const vibe = hood.vibe
        ? `<p class="hood-card-vibe">${escapeHtml(hood.vibe)}</p>`
        : '';

      return `<a href="/hidden-gems?neighborhood=${encodeURIComponent(hood.name)}" class="hood-card">
        ${img}
        <div class="hood-card-body">
          <h3>${escapeHtml(hood.name)}</h3>
          <p class="hood-card-meta">${escapeHtml(hood.borough)}</p>
          ${vibe}
          <p class="hood-card-count">${hood.spotCount} ${hood.spotCount === 1 ? 'spot' : 'spots'}</p>
        </div>
      </a>`;
    })
    .join('\n      ');

  return `<section class="neighborhoods-section">
    <div class="container">
      <div class="section-header">
        <div>
          <p class="eyebrow">Neighborhoods</p>
          <h2 class="section-title section-title--left">${escapeHtml('Explore the city by feel, not just by category')}</h2>
        </div>
        <p class="section-subtitle section-subtitle--left">${escapeHtml('Each neighborhood has its own rhythm. Start there, then find the places that make sense once you are on that block.')}</p>
      </div>
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
        <div class="newsletter-copy">
          <p class="eyebrow">Weekly drop</p>
          <h2>${escapeHtml('Get one good city email a week')}</h2>
          <p>${escapeHtml("Fresh local recommendations, neighborhood ideas, and the kind of spots people usually share in a text thread instead of a travel guide.")}</p>
        </div>
        <form id="newsletter-form" class="newsletter-form">
          <input type="email" name="email" placeholder="your@email.com" aria-label="Email address" required>
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
  featuredSpots?: LandingPageViewModel['featuredSpots'];
  neighborhoods?: LandingPageViewModel['neighborhoods'];
  site?: SiteContext;
}): string {
  const hoods = opts?.neighborhoods ?? [];
  const site = opts?.site;

  const body = [
    heroSection(site),
    featuredSection(),
    editorialSection(site),
    neighborhoodsSection(hoods),
    newsletterSection(),
  ].join('\n');

  const structuredData = [
    websiteJsonLd(site),
    collectionPageJsonLd(
      {
        name: `${site?.name ?? 'FinderNYC'} Local Picks`,
        description: site?.metaDescription ?? 'Discover local recommendations, neighborhoods, and guides.',
        path: '/',
      },
      site,
    ),
    itemListJsonLd(
      CURATED_HOME_GEMS.map((spot) => ({
        name: spot.title,
        url: `${site?.url ?? 'https://findernyc.com'}/spots/${spot.slug}`,
      })),
    ),
  ];

  return pageShell(
    buildPageSeo({
      title: site?.metaTitle ?? 'FinderNYC \u2014 Skip the Tourist Traps. Real NYC Hidden Gems.',
      description: site?.metaDescription ?? 'Discover where real New Yorkers actually go. Hidden gems, local tips, and honest recommendations.',
      path: '/',
      structuredData,
      site,
      imagePath: '/images/hero.jpg',
    }),
    body,
  );
}
