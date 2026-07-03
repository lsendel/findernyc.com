import { SITE_NAME, SITE_URL, type SiteContext } from '../site/context';

export type PageSeoMeta = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  structuredData?: unknown[];
  site?: SiteContext;
  imagePath?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
};

type BuildPageSeoInput = {
  title: string;
  description?: string | null;
  summary?: string | null;
  path: string;
  noindex?: boolean;
  structuredData?: unknown[];
  site?: SiteContext;
  imagePath?: string;
  type?: 'website' | 'article';
  publishedTime?: string | number | Date | null;
  modifiedTime?: string | number | Date | null;
};

export type SitemapEntry = {
  path: string;
  lastModified?: string | number | Date | null;
};

function normalizeTitle(title: string, site?: SiteContext): string {
  const siteName = site?.name ?? SITE_NAME;
  return title.includes(siteName) ? title : `${title} | ${siteName}`;
}

function truncateDescription(value: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).trimEnd()}...`;
}

function normalizeTimestamp(value: string | number | Date | null | undefined): string | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeSitemapDate(value: string | number | Date | null | undefined): string | undefined {
  const iso = normalizeTimestamp(value);
  return iso ? iso.slice(0, 10) : undefined;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function absoluteUrl(path: string, site?: SiteContext): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${site?.url ?? SITE_URL}${normalizedPath}`;
}

export function buildPageSeo(input: BuildPageSeoInput): PageSeoMeta {
  const site = input.site;
  const description = truncateDescription(
    input.description ?? input.summary ?? site?.metaDescription ?? 'Local recommendations, neighborhoods, and guides.',
  );

  return {
    title: normalizeTitle(input.title, site),
    description,
    path: input.path,
    noindex: input.noindex,
    structuredData: input.structuredData ?? [],
    site,
    imagePath: input.imagePath ?? '/images/og-image.jpg',
    type: input.type ?? 'website',
    publishedTime: normalizeTimestamp(input.publishedTime),
    modifiedTime: normalizeTimestamp(input.modifiedTime),
  };
}

export function sitemapXml(site: SiteContext, entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastModified = normalizeSitemapDate(entry.lastModified);
      return `<url><loc>${escapeXml(absoluteUrl(entry.path, site))}</loc>${lastModified ? `<lastmod>${lastModified}</lastmod>` : ''}</url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
