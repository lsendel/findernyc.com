import type {
  SearchGuideCardViewModel,
  SearchPageViewModel,
  SearchSpotCardViewModel,
} from '../application/discovery/presenters';
import { buildPageSeo } from '../lib/page-seo';
import { escapeHtml, pageShell } from './layout';
import type { SiteContext } from '../site/context';

export const CATEGORIES = [
  { slug: 'food', label: 'Food', emoji: '🍕' },
  { slug: 'coffee', label: 'Coffee', emoji: '☕' },
  { slug: 'bar', label: 'Bars', emoji: '🍸' },
  { slug: 'rooftop', label: 'Rooftops', emoji: '🌇' },
  { slug: 'view', label: 'Views', emoji: '👀' },
  { slug: 'park', label: 'Parks', emoji: '🌳' },
  { slug: 'museum', label: 'Museums', emoji: '🎨' },
  { slug: 'shop', label: 'Shopping', emoji: '🛍️' },
  { slug: 'free', label: 'Free', emoji: '🆓' },
] as const;

export const BOROUGHS = [
  'All',
  'Manhattan',
  'Brooklyn',
  'Queens',
  'Bronx',
  'Staten Island',
] as const;

/* ── helpers ─────────────────────────────────────────────────────── */

function boroughSlug(name: string): string {
  if (name === 'All') return '';
  return name.toLowerCase().replace(/\s+/g, '_');
}

function buildFilterUrl(params: {
  query: string;
  category: string;
  borough: string;
  sort: string;
}): string {
  const qs = new URLSearchParams();
  if (params.query) qs.set('q', params.query);
  if (params.category) qs.set('category', params.category);
  if (params.borough) qs.set('borough', params.borough);
  if (params.sort && params.sort !== 'relevance') qs.set('sort', params.sort);
  const str = qs.toString();
  return `/hidden-gems${str ? `?${str}` : ''}`;
}

function priceLabel(level: number | null): string {
  if (level == null || level < 1) return '';
  return '$'.repeat(Math.min(level, 4));
}

function ratingStarsHtml(avg: number | null, count: number): string {
  if (avg == null || count === 0) return '';
  const rounded = Math.round(avg * 10) / 10;
  return `<span class="spot-rating" aria-label="${rounded} out of 5 stars, ${count} reviews">
      <span class="spot-rating-stars" aria-hidden="true">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</span>
      <span class="spot-rating-value">${rounded}</span>
      <span class="spot-rating-count">(${count})</span>
    </span>`;
}

/* ── cards ───────────────────────────────────────────────────────── */

export function spotCardHtml(spot: SearchSpotCardViewModel): string {
  const photoHtml = spot.photoUrl
    ? `<img class="spot-card-photo" src="${escapeHtml(spot.photoUrl)}" alt="${escapeHtml(spot.title)}" loading="lazy">`
    : `<div class="spot-card-photo spot-card-photo--placeholder" aria-hidden="true"></div>`;

  const metaParts = [spot.neighborhood, spot.borough, spot.category]
    .filter(Boolean)
    .map((p) => escapeHtml(p))
    .join(' · ');

  const oneLinerHtml = spot.oneLiner
    ? `<p class="spot-card-oneliner">${escapeHtml(spot.oneLiner)}</p>`
    : '';

  const price = priceLabel(spot.priceLevel);
  const subwayHtml = spot.subway
    ? `<span class="spot-card-subway">🚇 ${escapeHtml(spot.subway)}</span>`
    : '';
  const priceHtml = price
    ? `<span class="spot-card-price">${escapeHtml(price)}</span>`
    : '';

  const footerParts = [priceHtml, subwayHtml].filter(Boolean).join(' ');
  const footerHtml = footerParts
    ? `<div class="spot-card-footer">${footerParts}</div>`
    : '';

  return `<a href="/spots/${escapeHtml(spot.slug)}" class="spot-card">
    ${photoHtml}
    <div class="spot-card-body">
      <h3 class="spot-card-title">${escapeHtml(spot.title)}</h3>
      <p class="spot-card-meta">${metaParts}</p>
      ${ratingStarsHtml(spot.averageRating, spot.ratingCount)}
      ${oneLinerHtml}
      ${footerHtml}
    </div>
  </a>`;
}

export function guideCardHtml(guide: SearchGuideCardViewModel): string {
  const coverHtml = guide.coverPhotoUrl
    ? `<img class="guide-card-cover" src="${escapeHtml(guide.coverPhotoUrl)}" alt="${escapeHtml(guide.title)}" loading="lazy">`
    : '';

  return `<a href="/guides/${escapeHtml(guide.slug)}" class="guide-card-inline">
    ${coverHtml}
    <div class="guide-card-body">
      <span class="guide-card-badge">📖 Guide</span>
      <h3 class="guide-card-title">${escapeHtml(guide.title)}</h3>
      <p class="guide-card-excerpt">${escapeHtml(guide.excerpt ?? 'Local notes and neighborhood context from FinderNYC.')}</p>
    </div>
  </a>`;
}

/* ── filter pills ────────────────────────────────────────────────── */

function filterPillHtml(
  label: string,
  href: string,
  active: boolean,
): string {
  const cls = active ? 'filter-pill filter-pill--active' : 'filter-pill';
  return `<a href="${escapeHtml(href)}" class="${cls}">${escapeHtml(label)}</a>`;
}

/* ── main export ─────────────────────────────────────────────────── */

type SearchPageOpts = SearchPageViewModel & {
  site?: SiteContext;
};

export function searchPageHtml(opts: SearchPageOpts): string {
  const { query, category, borough, sort, spots, guides, total } = opts;
  const activeCategory = CATEGORIES.find((item) => item.slug === category)?.label;
  const resultsLabel = query ? `Results for “${escapeHtml(query)}”` : 'Find the right block, not just the right category.';
  const categorySuggestions = CATEGORIES.slice(0, 5)
    .map((item) =>
      filterPillHtml(
        `${item.emoji} ${item.label}`,
        buildFilterUrl({ query: '', category: item.slug, borough: '', sort: 'relevance' }),
        false,
      ),
    )
    .join('\n          ');

  /* Search bar */
  const searchBarHtml = `<form action="/hidden-gems" method="get" class="search-bar" role="search">
      <input id="search-input" type="search" name="q" value="${escapeHtml(query)}" placeholder="Search spots, guides..." aria-label="Search" autocomplete="off">
      <input type="hidden" name="category" value="${escapeHtml(category)}">
      <input type="hidden" name="borough" value="${escapeHtml(borough)}">
      <input type="hidden" name="sort" value="${escapeHtml(sort)}">
      <button type="submit" aria-label="Search">🔍</button>
      <div id="suggest-dropdown" class="suggest-dropdown" hidden></div>
    </form>`;

  /* Category pills */
  const categoryPills = [
    filterPillHtml(
      'All',
      buildFilterUrl({ query, category: '', borough, sort }),
      category === '',
    ),
    ...CATEGORIES.map((c) =>
      filterPillHtml(
        `${c.emoji} ${c.label}`,
        buildFilterUrl({ query, category: c.slug, borough, sort }),
        category === c.slug,
      ),
    ),
  ].join('\n        ');

  /* Borough pills */
  const boroughPills = BOROUGHS.map((b) => {
    const bSlug = boroughSlug(b);
    return filterPillHtml(
      b,
      buildFilterUrl({ query, category, borough: bSlug, sort }),
      borough === bSlug,
    );
  }).join('\n        ');

  /* Sort pills */
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'newest', label: 'Newest' },
  ];
  const sortPills = sortOptions
    .map((s) =>
      filterPillHtml(
        s.label,
        buildFilterUrl({ query, category, borough, sort: s.value }),
        sort === s.value || (sort === '' && s.value === 'relevance'),
      ),
    )
    .join('\n        ');

  /* Result count */
  const resultCountHtml =
    total > 0
      ? `<p class="search-result-count">${total} local spot result${total === 1 ? '' : 's'} found${activeCategory ? ` in ${escapeHtml(activeCategory)}` : ''}</p>`
      : '';

  const searchIntroHtml = `<header class="search-intro">
      <p class="eyebrow">Local discovery</p>
      <h1 class="search-title">${resultsLabel}</h1>
      <p class="search-copy">${query
        ? `Use neighborhoods, categories, and guides to turn “${escapeHtml(query)}” into an actual part of your day.`
        : 'Search spots, guides, and neighborhoods for visitors who want local recommendations instead of tourist defaults.'}</p>
    </header>`;

  const searchToolbarHtml = `<div class="search-toolbar">
      ${searchBarHtml}
      <div class="filter-row">
        <span class="filter-label">Category</span>
        ${categoryPills}
      </div>
      <div class="filter-row">
        <span class="filter-label">Borough</span>
        ${boroughPills}
      </div>
      <div class="filter-row">
        <span class="filter-label">Sort</span>
        ${sortPills}
      </div>
    </div>`;

  let resultsHtml = '';
  if (spots.length === 0 && guides.length === 0) {
    resultsHtml = `<div class="search-empty">
        <p class="eyebrow">No direct match</p>
        <h2>Try another neighborhood, mood, or category.</h2>
        <p>Search works best when you think like a local: start with a vibe, a block, or a time of day.</p>
        <div class="category-pills" aria-label="Suggested categories">
          ${categorySuggestions}
        </div>
      </div>`;
  } else {
    const blocks: string[] = [];
    if (spots.length > 0) {
      blocks.push(`<section class="results-block">
        <div class="results-block-header">
          <p class="eyebrow">Spots</p>
          <h2>Places locals would actually send you to</h2>
        </div>
        <div class="search-results">
          ${spots.map(spotCardHtml).join('\n')}
        </div>
      </section>`);
    }
    if (guides.length > 0) {
      blocks.push(`<section class="results-block">
        <div class="results-block-header">
          <p class="eyebrow">Guides</p>
          <h2>Context before you go</h2>
        </div>
        <div class="guides-strip">
          ${guides.map(guideCardHtml).join('\n')}
        </div>
      </section>`);
    }
    resultsHtml = blocks.join('\n');
  }

  const bodyHtml = `<section class="search-page">
    <div class="container">
      ${searchIntroHtml}
      ${searchToolbarHtml}
      ${resultCountHtml}
      ${resultsHtml}
    </div>
  </section>`;

  const siteName = opts.site?.name ?? 'FinderNYC';
  const title = query ? `Search: ${query}` : 'Search';

  return pageShell(
    buildPageSeo({
      title,
      description: query
        ? `Search results for "${query}" on ${siteName}. Explore local spots, neighborhood context, and matching guides.`
        : `Search local spots, neighborhoods, and city guides on ${siteName}.`,
      path: '/hidden-gems',
      noindex: true,
      site: opts.site,
      imagePath: '/images/hero.jpg',
    }),
    bodyHtml,
  );
}
