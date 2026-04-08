import { escapeHtml, pageShell, SITE_URL } from './layout';
import { placeJsonLd, breadcrumbJsonLd } from '../lib/seo';

export type SpotPageData = {
  id: number;
  name: string;
  slug: string;
  title: string;
  neighborhood: string;
  borough: string;
  category: string;
  description: string;
  one_liner: string | null;
  pro_tip: string | null;
  subway: string | null;
  while_here: string | null;
  best_time: string | null;
  avoid_time: string | null;
  budget_note: string | null;
  vibe_tags: string | null;
  price_level: number | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  photo_url: string | null;
  avg_rating: number | null;
  rating_count: number;
  tips: Array<{ text: string; author_name: string | null; author_area: string | null }>;
  related_spots: Array<{
    slug: string;
    title: string;
    neighborhood: string;
    category: string;
    one_liner: string | null;
    avg_rating: number | null;
    rating_count: number;
  }>;
};

function formatBorough(borough: string): string {
  return borough
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function priceDisplay(level: number | null): string {
  if (level == null || level < 1) return '';
  return '$'.repeat(Math.min(level, 4));
}

function renderStars(avg: number | null, count: number): string {
  const filled = avg != null ? Math.round(avg) : 0;
  const stars = Array.from({ length: 5 }, (_, i) => {
    const value = i + 1;
    const cls = value <= filled ? 'star star--filled' : 'star';
    return `<button class="${cls}" data-value="${value}" aria-label="Rate ${value} star${value > 1 ? 's' : ''}">\u2605</button>`;
  }).join('');

  const ratingText =
    count > 0 && avg != null
      ? `${escapeHtml(avg.toFixed(1))}/5 from ${count} local${count !== 1 ? 's' : ''}`
      : 'Be the first to rate';

  return `<section class="spot-rating">
      <div class="stars">${stars}</div>
      <p class="rating-text">${ratingText}</p>
    </section>`;
}

function renderRelatedCard(spot: SpotPageData['related_spots'][number]): string {
  const rating =
    spot.avg_rating != null && spot.rating_count > 0
      ? `<span class="card-rating">\u2605 ${escapeHtml(spot.avg_rating.toFixed(1))} (${spot.rating_count})</span>`
      : '';
  const oneLiner = spot.one_liner
    ? `<p class="card-one-liner">${escapeHtml(spot.one_liner)}</p>`
    : '';

  return `<a href="/spots/${escapeHtml(spot.slug)}" class="spot-card">
        <h3>${escapeHtml(spot.title)}</h3>
        <p class="card-meta">${escapeHtml(spot.neighborhood)} &middot; ${escapeHtml(spot.category)}</p>
        ${oneLiner}
        ${rating}
      </a>`;
}

export function spotPageHtml(spot: SpotPageData): string {
  const boroughDisplay = formatBorough(spot.borough);
  const price = priceDisplay(spot.price_level);
  const metaParts = [spot.neighborhood, boroughDisplay, spot.category, price].filter(Boolean);

  // Hero
  const photoHtml = spot.photo_url
    ? `<img src="${escapeHtml(spot.photo_url)}" alt="${escapeHtml(spot.name)}" loading="eager">`
    : '';

  const heroHtml = `<header class="spot-hero">
    ${photoHtml}
    <div class="spot-hero-overlay">
      <h1>${escapeHtml(spot.title)}</h1>
      <p class="spot-meta">${metaParts.map(escapeHtml).join(' &middot; ')}</p>
    </div>
  </header>`;

  // Body
  const descriptionHtml = spot.description
    .split('\n\n')
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .filter((p) => p !== '<p></p>')
    .join('\n      ');

  const proTipHtml = spot.pro_tip
    ? `<div class="pro-tip"><strong>Pro tip:</strong> ${escapeHtml(spot.pro_tip)}</div>`
    : '';

  const subwayHtml = spot.subway
    ? `<div class="getting-there">\u{1F687} <strong>Subway:</strong> ${escapeHtml(spot.subway)}</div>`
    : '';

  const whileHereHtml = spot.while_here
    ? `<div class="while-here"><strong>While you're in ${escapeHtml(spot.neighborhood)}:</strong> ${escapeHtml(spot.while_here)}</div>`
    : '';

  const budgetHtml = spot.budget_note
    ? `<div class="budget-note"><strong>Budget:</strong> ${escapeHtml(spot.budget_note)}</div>`
    : '';

  const bestTimeHtml = spot.best_time
    ? `<div class="best-time"><strong>Best time:</strong> ${escapeHtml(spot.best_time)}</div>`
    : '';

  const mapsLinkHtml = spot.google_maps_url
    ? `<a href="${escapeHtml(spot.google_maps_url)}" target="_blank" rel="noopener noreferrer" class="maps-link">\u{1F4CD} View on Google Maps</a>`
    : '';

  // Vibe tags
  let vibeTagsHtml = '';
  if (spot.vibe_tags) {
    try {
      const tags: string[] = JSON.parse(spot.vibe_tags);
      if (tags.length > 0) {
        vibeTagsHtml = `<div class="vibe-tags">${tags.map((t) => `<span class="vibe-tag">${escapeHtml(t)}</span>`).join('')}</div>`;
      }
    } catch {
      // invalid JSON, skip
    }
  }

  // Tips
  const tipsSectionHtml =
    spot.tips.length > 0
      ? `<section class="locals-say">
      <h2>What locals are saying</h2>
      ${spot.tips
        .map((tip) => {
          const name = tip.author_name ? escapeHtml(tip.author_name) : 'A local';
          const area = tip.author_area ? `, ${escapeHtml(tip.author_area)}` : '';
          return `<blockquote class="local-tip"><p>&ldquo;${escapeHtml(tip.text)}&rdquo;</p><cite>&mdash; ${name}${area}</cite></blockquote>`;
        })
        .join('\n      ')}
    </section>`
      : '';

  // Submit tip form
  const submitTipHtml = `<section class="submit-tip">
      <h3>Know something about this spot? Drop your tip below</h3>
      <form id="tip-form" data-spot-id="${spot.id}">
        <textarea name="text" placeholder="What should people know?" required minlength="10" maxlength="500" rows="3"></textarea>
        <div class="tip-form-row">
          <input name="author_name" placeholder="Your name (optional)" maxlength="50">
          <input name="author_area" placeholder="Your area, e.g. Queens (optional)" maxlength="50">
        </div>
        <button type="submit" class="btn btn-primary">Share your tip</button>
        <p id="tip-status" role="status" aria-live="polite"></p>
      </form>
    </section>`;

  // Related spots
  const relatedHtml =
    spot.related_spots.length > 0
      ? `<section class="nearby-spots">
      <h2>More in ${escapeHtml(spot.neighborhood)}</h2>
      <div class="spot-card-grid">
        ${spot.related_spots.map(renderRelatedCard).join('\n        ')}
      </div>
    </section>`
      : '';

  const bodyHtml = `<article class="spot-page">
  ${heroHtml}
  <div class="spot-content container">
    <section class="spot-body">
      ${descriptionHtml}
      ${proTipHtml}
      ${subwayHtml}
      ${whileHereHtml}
      ${budgetHtml}
      ${bestTimeHtml}
      ${mapsLinkHtml}
    </section>
    ${vibeTagsHtml}
    ${renderStars(spot.avg_rating, spot.rating_count)}
    ${tipsSectionHtml}
    ${submitTipHtml}
    ${relatedHtml}
  </div>
</article>`;

  // Meta
  const metaDescription = spot.one_liner || spot.description.slice(0, 160);

  const structuredData = [
    placeJsonLd({
      name: spot.name,
      description: spot.description,
      slug: spot.slug,
      neighborhood: spot.neighborhood,
      borough: spot.borough,
      latitude: spot.latitude,
      longitude: spot.longitude,
      avg_rating: spot.avg_rating,
      review_count: spot.rating_count,
    }),
    breadcrumbJsonLd([
      { name: 'Home', url: SITE_URL },
      { name: spot.neighborhood, url: `${SITE_URL}/search?neighborhood=${encodeURIComponent(spot.neighborhood)}` },
      { name: spot.title, url: `${SITE_URL}/spots/${spot.slug}` },
    ]),
  ];

  return pageShell(
    {
      title: `${spot.title} | FinderNYC`,
      description: metaDescription,
      path: `/spots/${spot.slug}`,
      structuredData,
    },
    bodyHtml,
  );
}
