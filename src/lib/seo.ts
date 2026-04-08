import { SITE_NAME, SITE_URL } from '../templates/layout';

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

export function placeJsonLd(spot: SpotLike): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: spot.name,
    url: `${SITE_URL}/spot/${spot.slug}`,
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

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
