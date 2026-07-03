import type { SpotPageViewModel } from '../application/content/presenters';
import { buildPageSeo } from '../lib/page-seo';
import { placeJsonLd, breadcrumbJsonLd } from '../lib/seo';
import { escapeHtml, pageShell } from './layout';
import { SITE_URL, type SiteContext } from '../site/context';

function formatCategoryLabel(category: string): string {
  return category
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildIntroText(spot: SpotPageViewModel): string | null {
  if (spot.oneLiner) return spot.oneLiner;
  const firstParagraph = spot.descriptionParagraphs[0];
  if (!firstParagraph) return null;
  const sentences = firstParagraph.match(/[^.!?]+[.!?]+/g) ?? [firstParagraph];
  return sentences.slice(0, 2).join(' ').trim();
}

function buildMapSearchUrl(spot: SpotPageViewModel): string {
  if (spot.googleMapsUrl) return spot.googleMapsUrl;
  if (spot.latitude != null && spot.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`;
  }
  const query = [spot.name, spot.neighborhood, 'New York City'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildMapEmbedUrl(spot: SpotPageViewModel): string {
  if (spot.googleMapsUrl?.includes('/maps/d/')) {
    if (spot.googleMapsUrl.includes('/embed')) return spot.googleMapsUrl;
    const mid = spot.googleMapsUrl.match(/[?&]mid=([^&]+)/)?.[1];
    if (mid) return `https://www.google.com/maps/d/u/0/embed?mid=${mid}`;
  }
  if (spot.latitude != null && spot.longitude != null) {
    return `https://www.google.com/maps?q=${spot.latitude},${spot.longitude}&z=15&output=embed`;
  }
  const query = [spot.name, spot.neighborhood, 'New York City'].filter(Boolean).join(', ');
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
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
      <h2>⭐ Rate this spot</h2>
      <div class="stars">${stars}</div>
      <p class="rating-text">${ratingText}</p>
    </section>`;
}

function renderRelatedCard(spot: SpotPageViewModel['relatedSpots'][number]): string {
  const rating =
    spot.averageRating != null && spot.ratingCount > 0
      ? `<span class="card-rating">\u2605 ${escapeHtml(spot.averageRating.toFixed(1))} (${spot.ratingCount})</span>`
      : '';
  const oneLiner = spot.oneLiner
    ? `<p class="card-one-liner">${escapeHtml(spot.oneLiner)}</p>`
    : '';

  return `<a href="/spots/${escapeHtml(spot.slug)}" class="spot-card">
        <h3>${escapeHtml(spot.title)}</h3>
        <p class="card-meta">${escapeHtml(spot.neighborhood)} &middot; ${escapeHtml(spot.category)}</p>
        ${oneLiner}
        ${rating}
      </a>`;
}

export function spotPageHtml(spot: SpotPageViewModel & { site?: SiteContext }): string {
  const boroughDisplay = spot.boroughLabel;
  const price = spot.priceLabel;
  const metaParts = [spot.neighborhood, boroughDisplay, spot.category, price].filter(Boolean);
  const introText = buildIntroText(spot);
  const mapSearchUrl = buildMapSearchUrl(spot);
  const mapEmbedUrl = buildMapEmbedUrl(spot);
  const heroChips = [
    `<span class="spot-highlight spot-highlight--category">${escapeHtml(formatCategoryLabel(spot.category))}</span>`,
    spot.priceLabel ? `<span class="spot-highlight spot-highlight--price">${escapeHtml(spot.priceLabel)}</span>` : '',
    ...spot.vibeTags.slice(0, 4).map((tag) => `<span class="spot-highlight spot-highlight--vibe">${escapeHtml(tag)}</span>`),
  ].filter(Boolean).join('');
  const detailChips = [
    spot.priceLabel ? `<span class="vibe-tag vibe-tag--price">Price ${escapeHtml(spot.priceLabel)}</span>` : '',
    ...spot.vibeTags.map((tag) => `<span class="vibe-tag">${escapeHtml(tag)}</span>`),
  ].join('');
  const quickFacts = [
    spot.bestTime ? { label: 'Best time', value: spot.bestTime } : null,
    spot.avoidTime ? { label: 'Skip', value: spot.avoidTime } : null,
    spot.subway ? { label: 'Closest train', value: spot.subway } : null,
    spot.budgetNote ? { label: 'Budget', value: spot.budgetNote } : null,
    { label: 'Neighborhood', value: spot.neighborhood },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  // Hero
  const heroImageAlt = spot.vibeTags.includes('sunset')
    ? `Sunset skyline view from ${spot.name} in ${spot.neighborhood}`
    : `${spot.title} in ${spot.neighborhood}`;
  const photoHtml = spot.photoUrl
    ? `<img class="spot-hero-image" src="${escapeHtml(spot.photoUrl)}" alt="${escapeHtml(heroImageAlt)}" loading="eager">`
    : '';
  const heroClass = spot.photoUrl ? 'spot-hero' : 'spot-hero spot-hero--fallback';
  const heroCaption = spot.vibeTags.includes('sunset')
    ? `Sunset from ${spot.name} - zero crowds, real views.`
    : `View from ${spot.name} in ${spot.neighborhood}.`;
  const heroCaptionHtml = spot.photoUrl
    ? `<div class="spot-hero-caption-wrap container">
      <p class="spot-hero-caption">${escapeHtml(heroCaption)}</p>
    </div>`
    : '';

  const heroHtml = `<header class="${heroClass}">
    ${photoHtml}
    <div class="spot-hero-overlay">
      <p class="eyebrow">Local spot</p>
      <h1>${escapeHtml(spot.title)}</h1>
      <p class="spot-meta">${metaParts.map(escapeHtml).join(' &middot; ')}</p>
      <div class="spot-highlight-row">${heroChips}</div>
    </div>
  </header>`;

  // Body
  const descriptionHtml = spot.descriptionParagraphs
    .slice(1)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n      ');

  const proTipHtml = spot.proTip
    ? `<section class="info-card pro-tip">
      <h3>Pro Tip</h3>
      <p>${escapeHtml(spot.proTip)}</p>
    </section>`
    : '';

  const subwayHtml = spot.subway
    ? `<section class="info-card getting-there">
      <h3>Getting There</h3>
      <p>\u{1F687} ${escapeHtml(spot.subway)}</p>
    </section>`
    : '';

  const whileHereHtml = spot.whileHere
    ? `<section class="while-here while-here--feature">
      <p class="eyebrow">Bonus stop nearby</p>
      <h2>While you're in ${escapeHtml(spot.neighborhood)}</h2>
      <p>${escapeHtml(spot.whileHere)}</p>
    </section>`
    : '';

  const bestTimeHtml = spot.bestTime
    ? `<section class="info-card best-time">
      <h3>Best Time</h3>
      <p>${escapeHtml(spot.bestTime)}</p>
    </section>`
    : '';

  const mapsLinkHtml = `<a href="${escapeHtml(mapSearchUrl)}" target="_blank" rel="noopener noreferrer" class="maps-link">\u{1F4CD} Open in Google Maps</a>`;
  const mapSectionHtml = `<section class="map-section spot-map">
      <div class="spot-map-copy">
        <h3>Map</h3>
        <p>Check the route before you go so the stop actually fits your night.</p>
        ${mapsLinkHtml}
      </div>
      <div class="spot-map-embed">
        <iframe
          src="${escapeHtml(mapEmbedUrl)}"
          title="Map for ${escapeHtml(spot.title)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </section>`;

  const oneLinerHtml = introText
    ? `<p class="spot-dek">${escapeHtml(introText)}</p>`
    : '';

  const storyHtml = descriptionHtml
    ? `<section class="spot-story">
        <p class="eyebrow">Why go</p>
        ${descriptionHtml}
      </section>`
    : '';

  const summaryHtml = `<aside class="spot-summary">
      <p class="eyebrow">Quick read</p>
      <h2>Plan the stop</h2>
      <dl class="spot-summary-list">
        ${quickFacts
          .map((fact) => `<div class="spot-summary-row"><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`)
          .join('\n        ')}
      </dl>
    </aside>`;

  const vibeTagsHtml = detailChips
    ? `<section class="spot-vibe-panel">
      <p class="eyebrow">Vibe and price</p>
      <div class="vibe-tags">${detailChips}</div>
    </section>`
    : '';

  // Tips
  const tipsSectionHtml =
    spot.tips.length > 0
      ? `<section class="locals-say">
      <h2>What locals are saying</h2>
      ${spot.tips
        .map((tip) => {
          const name = tip.authorName ? escapeHtml(tip.authorName) : 'A local';
          const area = tip.authorArea ? `, ${escapeHtml(tip.authorArea)}` : '';
          return `<blockquote class="local-tip"><p>&ldquo;${escapeHtml(tip.text)}&rdquo;</p><cite>&mdash; ${name}${area}</cite></blockquote>`;
        })
        .join('\n      ')}
    </section>`
      : '';

  // Submit tip form
  const submitTipHtml = `<section class="submit-tip">
      <h3>Know a better spot? Drop your tip below 👇</h3>
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
    spot.relatedSpots.length > 0
      ? `<section class="nearby-spots">
      <h2>More in ${escapeHtml(spot.neighborhood)}</h2>
      <div class="spot-card-grid">
        ${spot.relatedSpots.map(renderRelatedCard).join('\n        ')}
      </div>
    </section>`
      : '';

  const bodyHtml = `<article class="spot-page">
  ${heroHtml}
  ${heroCaptionHtml}
  <div class="spot-content container">
    <section class="spot-overview">
      <div class="spot-body">
        ${oneLinerHtml}
        ${storyHtml}
        ${proTipHtml}
        ${bestTimeHtml}
        ${subwayHtml}
        ${mapSectionHtml}
        ${whileHereHtml}
      </div>
      ${summaryHtml}
    </section>
    ${vibeTagsHtml}
    ${renderStars(spot.averageRating, spot.ratingCount)}
    ${tipsSectionHtml}
    ${submitTipHtml}
    ${relatedHtml}
  </div>
</article>`;

  // Meta
  const siteUrl = spot.site?.url ?? SITE_URL;
  const metaDescription = spot.oneLiner || spot.description.slice(0, 160);

  const structuredData = [
    placeJsonLd({
      name: spot.name,
      description: spot.description,
      slug: spot.slug,
      neighborhood: spot.neighborhood,
      borough: spot.borough,
      latitude: spot.latitude,
      longitude: spot.longitude,
      averageRating: spot.averageRating,
      reviewCount: spot.ratingCount,
    }, spot.site),
    breadcrumbJsonLd([
      { name: 'Home', url: siteUrl },
      { name: spot.neighborhood, url: `${siteUrl}/hidden-gems?neighborhood=${encodeURIComponent(spot.neighborhood)}` },
      { name: spot.title, url: `${siteUrl}/spots/${spot.slug}` },
    ]),
  ];

  const siteName = spot.site?.name ?? 'FinderNYC';
  return pageShell(
    buildPageSeo({
      title: spot.title,
      description: metaDescription,
      path: `/spots/${spot.slug}`,
      structuredData,
      site: spot.site,
      imagePath: spot.photoUrl ?? '/images/og-image.jpg',
    }),
    bodyHtml,
  );
}
