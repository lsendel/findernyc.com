import { SITE_NAME, SITE_URL, type SiteContext } from '../templates/layout';

type SpotLike = {
  name: string;
  description?: string | null;
  slug: string;
  neighborhood?: string | null;
  borough?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
};

export function placeJsonLd(spot: SpotLike, site?: SiteContext): Record<string, unknown> {
  const siteUrl = site?.url ?? SITE_URL;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: spot.name,
    url: `${siteUrl}/spots/${spot.slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: spot.neighborhood ?? undefined,
      addressRegion: spot.borough ?? undefined,
      addressCountry: 'US',
    },
  };

  if (spot.description) {
    ld.description = spot.description;
  }

  if (spot.latitude != null && spot.longitude != null) {
    ld.geo = {
      '@type': 'GeoCoordinates',
      latitude: spot.latitude,
      longitude: spot.longitude,
    };
  }

  if (spot.avg_rating != null) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: spot.avg_rating,
      ...(spot.review_count != null ? { reviewCount: spot.review_count } : {}),
    };
  }

  return ld;
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function websiteJsonLd(site?: SiteContext): Record<string, unknown> {
  const siteName = site?.name ?? SITE_NAME;
  const siteUrl = site?.url ?? SITE_URL;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
