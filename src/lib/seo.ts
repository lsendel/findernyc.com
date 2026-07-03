import { SITE_NAME, SITE_URL, type SiteContext } from '../site/context';
import { absoluteUrl } from './page-seo';

type SpotLike = {
  name: string;
  description?: string | null;
  slug: string;
  neighborhood?: string | null;
  borough?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
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

  if (spot.averageRating != null) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: spot.averageRating,
      ...(spot.reviewCount != null ? { reviewCount: spot.reviewCount } : {}),
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
      target: `${siteUrl}/hidden-gems?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function collectionPageJsonLd(
  options: {
    name: string;
    description: string;
    path: string;
  },
  site?: SiteContext,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path, site),
  };
}

export function itemListJsonLd(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function articleJsonLd(
  article: {
    headline: string;
    description?: string | null;
    path: string;
    imagePath?: string | null;
    publishedTime?: string | null;
    modifiedTime?: string | null;
    section?: string | null;
  },
  site?: SiteContext,
): Record<string, unknown> {
  const siteName = site?.name ?? SITE_NAME;
  const siteUrl = site?.url ?? SITE_URL;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description ?? undefined,
    url: absoluteUrl(article.path, site),
    image: article.imagePath ? [absoluteUrl(article.imagePath, site)] : undefined,
    datePublished: article.publishedTime ?? undefined,
    dateModified: article.modifiedTime ?? undefined,
    articleSection: article.section ?? undefined,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/images/gem.svg', site),
      },
    },
  };
}
