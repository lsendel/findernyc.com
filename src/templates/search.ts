import { escapeHtml, pageShell, type PageMeta, type SiteContext } from './layout';

export type SearchResultSpot = {
  slug: string;
  title: string;
  name: string;
  neighborhood: string;
  borough: string;
  category: string;
  one_liner: string | null;
  price_level: number | null;
  photo_url: string | null;
  subway: string | null;
  avg_rating: number | null;
  rating_count: number;
};

export type SearchResultGuide = {
  slug: string;
  title: string;
  type: string;
  excerpt: string;
  cover_photo_url: string | null;
};

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
  return `/search${str ? `?${str}` : ''}`;
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

export function spotCardHtml(spot: SearchResultSpot): string {
  const photoHtml = spot.photo_url
    ? `<img class="spot-card-photo" src="${escapeHtml(spot.photo_url)}" alt="${escapeHtml(spot.title)}" loading="lazy">`
    : `<div class="spot-card-photo spot-card-photo--placeholder" aria-hidden="true"></div>`;

  const metaParts = [spot.neighborhood, spot.borough, spot.category]
    .filter(Boolean)
    .map((p) => escapeHtml(p))
    .join(' · ');

  const oneLinerHtml = spot.one_liner
    ? `<p class="spot-card-oneliner">${escapeHtml(spot.one_liner)}</p>`
    : '';

  const price = priceLabel(spot.price_level);
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
      ${ratingStarsHtml(spot.avg_rating, spot.rating_count)}
      ${oneLinerHtml}
      ${footerHtml}
    </div>
  </a>`;
}

export function guideCardHtml(guide: SearchResultGuide): string {
  const coverHtml = guide.cover_photo_url
    ? `<img class="guide-card-cover" src="${escapeHtml(guide.cover_photo_url)}" alt="${escapeHtml(guide.title)}" loading="lazy">`
    : '';

  return `<a href="/guides/${escapeHtml(guide.slug)}" class="guide-card-inline">
    ${coverHtml}
    <div class="guide-card-body">
      <span class="guide-card-badge">📖 Guide</span>
      <h3 class="guide-card-title">${escapeHtml(guide.title)}</h3>
      <p class="guide-card-excerpt">${escapeHtml(guide.excerpt)}</p>
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

type SearchPageOpts = {
  query: string;
  category: string;
  borough: string;
  sort: string;
  spots: SearchResultSpot[];
  guides: SearchResultGuide[];
  total: number;
  site?: SiteContext;
};

export function searchPageHtml(opts: SearchPageOpts): string {
  const { query, category, borough, sort, spots, guides, total } = opts;

  /* Search bar */
  const searchBarHtml = `<form action="/search" method="get" class="search-bar" role="search">
      <input type="search" name="q" value="${escapeHtml(query)}" placeholder="Search spots, guides..." aria-label="Search" autocomplete="off">
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
    { value: 'top_rated', label: 'Top Rated' },
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
      ? `<p class="search-result-count">${total} result${total === 1 ? '' : 's'} found</p>`
      : '';

  /* Interleave spots + guides */
  let resultsHtml = '';
  if (spots.length === 0 && guides.length === 0) {
    resultsHtml = `<div class="search-empty">
        <h2>No spots found</h2>
        <p>Try a different search term, or browse by category above.</p>
      </div>`;
  } else {
    let guideIdx = 0;
    const cards: string[] = [];
    for (let i = 0; i < spots.length; i++) {
      cards.push(spotCardHtml(spots[i]));
      // Insert a guide card after every 4th spot
      if ((i + 1) % 4 === 0 && guideIdx < guides.length) {
        cards.push(guideCardHtml(guides[guideIdx]));
        guideIdx++;
      }
    }
    // Append remaining guides
    while (guideIdx < guides.length) {
      cards.push(guideCardHtml(guides[guideIdx]));
      guideIdx++;
    }
    resultsHtml = `<div class="search-results">${cards.join('\n')}</div>`;
  }

  const bodyHtml = `<section class="search-page">
    <div class="container">
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
      ${resultCountHtml}
      ${resultsHtml}
    </div>
  </section>`;

  const siteName = opts.site?.name ?? 'FinderNYC';
  const titleParts = [query, 'Search'].filter(Boolean);
  const meta: PageMeta = {
    title: `${titleParts.join(' — ')} | ${siteName}`,
    description: query
      ? `Search results for "${query}" on ${siteName}`
      : `Explore the best spots on ${siteName}`,
    path: '/search',
    noindex: true,
    site: opts.site,
  };

  return pageShell(meta, bodyHtml);
}
