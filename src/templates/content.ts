import type {
  GuideCardViewModel,
  GuidePageViewModel,
  NeighborhoodCardViewModel,
} from '../application/content/presenters';
import { buildPageSeo } from '../lib/page-seo';
import { articleJsonLd, breadcrumbJsonLd, collectionPageJsonLd, itemListJsonLd } from '../lib/seo';
import { escapeHtml, pageShell } from './layout';
import type { SiteContext } from '../site/context';

type SimplePageOptions = {
  title: string;
  description: string;
  path: string;
  heading: string;
  intro?: string;
  body: string[];
  site?: SiteContext;
};

function simpleBodyHtml(options: SimplePageOptions): string {
  const introHtml = options.intro
    ? `<p class="section-subtitle">${escapeHtml(options.intro)}</p>`
    : '';

  const paragraphs = options.body
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n          ');

  return `<section class="content-page">
    <div class="container">
      <div class="newsletter-box">
        <h1>${escapeHtml(options.heading)}</h1>
        ${introHtml}
        <div class="content-page-copy">
          ${paragraphs}
        </div>
      </div>
    </div>
  </section>`;
}

export function simplePageHtml(options: SimplePageOptions): string {
  return pageShell(
    buildPageSeo({
      title: options.title,
      description: options.description,
      path: options.path,
      site: options.site,
    }),
    simpleBodyHtml(options),
  );
}

export function guidesIndexPageHtml(guides: GuideCardViewModel[], site?: SiteContext): string {
  const cards = guides
    .map((guide) => {
      const cover = guide.coverPhotoUrl
        ? `<img class="guide-card-cover" src="${escapeHtml(guide.coverPhotoUrl)}" alt="${escapeHtml(guide.title)}" loading="lazy">`
        : '';

      return `<a href="/guides/${escapeHtml(guide.slug)}" class="guide-card-inline">
        ${cover}
        <div class="guide-card-body">
          <span class="guide-card-badge">Guide</span>
          <h2 class="guide-card-title">${escapeHtml(guide.title)}</h2>
          <p class="guide-card-excerpt">${escapeHtml(guide.excerpt ?? 'Neighborhood context, local tips, and practical planning notes.')}</p>
        </div>
      </a>`;
    })
    .join('\n        ');

  return pageShell(
    buildPageSeo({
      title: 'Itineraries',
      description: 'Editorial guides for neighborhoods, hidden gems, and planning a better NYC day.',
      path: '/itineraries',
      structuredData: [
        collectionPageJsonLd(
          {
            name: `${site?.name ?? 'FinderNYC'} Itineraries`,
            description: 'Editorial guides for neighborhoods, hidden gems, and planning a better NYC day.',
            path: '/itineraries',
          },
          site,
        ),
        ...(guides.length > 0
          ? [itemListJsonLd(guides.map((guide) => ({ name: guide.title, url: `${site?.url ?? 'https://findernyc.com'}/guides/${guide.slug}` })))]
          : []),
      ],
      site,
    }),
    `<section class="search-page">
      <div class="container">
        <p class="eyebrow">Editorial guides</p>
        <h1 class="section-title">Itineraries</h1>
        <p class="section-subtitle">Planning notes, neighborhood context, and local recommendations from FinderNYC.</p>
        <div class="search-results">
          ${cards || '<p>No guides published yet.</p>'}
        </div>
      </div>
    </section>`,
  );
}

export function guidePageHtml(guide: GuidePageViewModel, site?: SiteContext): string {
  const bodyHtml = guide.bodyHtml?.trim()
    ? guide.bodyHtml
    : `<p>${escapeHtml(guide.excerpt ?? 'FinderNYC guide content is coming soon.')}</p>`;

  return pageShell(
    buildPageSeo({
      title: guide.seoTitle ?? guide.title,
      description: guide.seoDescription ?? guide.excerpt ?? `Guide from ${site?.name ?? 'FinderNYC'}.`,
      path: `/guides/${guide.slug}`,
      structuredData: [
        breadcrumbJsonLd([
          { name: site?.name ?? 'FinderNYC', url: site?.url ?? 'https://findernyc.com' },
          { name: 'Itineraries', url: `${site?.url ?? 'https://findernyc.com'}/itineraries` },
          { name: guide.title, url: `${site?.url ?? 'https://findernyc.com'}/guides/${guide.slug}` },
        ]),
        articleJsonLd(
          {
            headline: guide.title,
            description: guide.seoDescription ?? guide.excerpt,
            path: `/guides/${guide.slug}`,
            imagePath: guide.coverPhotoUrl,
            publishedTime: guide.publishedAt ? new Date(guide.publishedAt).toISOString() : null,
            modifiedTime: guide.updatedAt ? new Date(guide.updatedAt).toISOString() : null,
            section: guide.type ?? guide.neighborhood ?? guide.borough,
          },
          site,
        ),
      ],
      site,
      type: 'article',
      imagePath: guide.coverPhotoUrl ?? '/images/og-image.jpg',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    }),
    `<section class="content-page">
      <div class="container">
        <article class="newsletter-box">
          <p class="eyebrow">Guide</p>
          <h1>${escapeHtml(guide.title)}</h1>
          ${guide.excerpt ? `<p class="section-subtitle">${escapeHtml(guide.excerpt)}</p>` : ''}
          <div class="content-page-copy">
            ${bodyHtml}
          </div>
        </article>
      </div>
    </section>`,
  );
}

export function neighborhoodsPageHtml(neighborhoods: NeighborhoodCardViewModel[], site?: SiteContext): string {
  const cards = neighborhoods
    .map((hood) => {
      const image = hood.photoUrl
        ? `<img src="${escapeHtml(hood.photoUrl)}" alt="${escapeHtml(hood.name)}" class="hood-card-img" loading="lazy">`
        : `<div class="hood-card-img hood-card-img--placeholder" aria-hidden="true"></div>`;

      return `<a href="/hidden-gems?neighborhood=${encodeURIComponent(hood.name)}" class="hood-card">
        ${image}
        <div class="hood-card-body">
          <h2>${escapeHtml(hood.name)}</h2>
          <p class="hood-card-meta">${escapeHtml(hood.borough ?? 'NYC')}</p>
          ${hood.vibe ? `<p class="hood-card-vibe">${escapeHtml(hood.vibe)}</p>` : ''}
          <p class="hood-card-count">${hood.spotCount} ${hood.spotCount === 1 ? 'spot' : 'spots'}</p>
        </div>
      </a>`;
    })
    .join('\n        ');

  return pageShell(
    buildPageSeo({
      title: 'Neighborhoods',
      description: 'Browse FinderNYC recommendations by neighborhood.',
      path: '/neighborhoods',
      structuredData: [
        collectionPageJsonLd(
          {
            name: `${site?.name ?? 'FinderNYC'} Neighborhoods`,
            description: 'Browse FinderNYC recommendations by neighborhood.',
            path: '/neighborhoods',
          },
          site,
        ),
        ...(neighborhoods.length > 0
          ? [itemListJsonLd(neighborhoods.map((hood) => ({ name: hood.name, url: `${site?.url ?? 'https://findernyc.com'}/hidden-gems?neighborhood=${encodeURIComponent(hood.name)}` })))]
          : []),
      ],
      site,
    }),
    `<section class="neighborhoods-section">
      <div class="container">
        <p class="eyebrow">Neighborhood guides</p>
        <h1 class="section-title">Neighborhoods</h1>
        <p class="section-subtitle">Start with the neighborhood, then narrow the day from there.</p>
        <div class="hood-grid">
          ${cards || '<p>No neighborhoods published yet.</p>'}
        </div>
      </div>
    </section>`,
  );
}
