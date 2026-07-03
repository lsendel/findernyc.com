export const SITE_NAME = 'FinderNYC';
export const SITE_URL = 'https://findernyc.com';

export type SiteContext = {
  name: string;
  url: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  metaTitle: string;
  metaDescription: string;
  city: string | null;
};

const SITES: Record<string, SiteContext> = {
  'findernyc.com': {
    name: 'FinderNYC',
    url: 'https://findernyc.com',
    tagline: 'Skip the tourist traps.',
    heroTitle: 'Skip the tourist traps.\nHere\'s where real New Yorkers actually go.',
    heroSubtitle: 'Curated by locals, not algorithms. Hidden gems, honest tips, zero BS.',
    metaTitle: 'FinderNYC — Skip the Tourist Traps. Real NYC Hidden Gems.',
    metaDescription: 'Discover where real New Yorkers actually go. Hidden gems, local tips, and honest recommendations.',
    city: 'NYC',
  },
  'hiddencitygems.com': {
    name: 'Hidden City Gems',
    url: 'https://hiddencitygems.com',
    tagline: 'Skip the tourist traps.',
    heroTitle: 'Skip the tourist traps.\nDiscover where locals actually go.',
    heroSubtitle: 'Real recommendations from real locals. Hidden gems, honest tips, zero BS.',
    metaTitle: 'Hidden City Gems — Skip the Tourist Traps. Real Local Recommendations.',
    metaDescription: 'Discover hidden gems in cities around the world. Real recommendations from locals, not algorithms.',
    city: null,
  },
  'experiences.miami': {
    name: 'Experiences Miami',
    url: 'https://experiences.miami',
    tagline: 'The real Miami.',
    heroTitle: 'Skip the tourist traps.\nHere\'s where real Miami locals actually go.',
    heroSubtitle: 'Curated by locals, not algorithms. Hidden gems, honest tips, zero BS.',
    metaTitle: 'Experiences Miami — Skip the Tourist Traps. Real Miami Hidden Gems.',
    metaDescription: 'Discover where real Miami locals actually go. Hidden gems, local tips, and honest recommendations.',
    city: 'Miami',
  },
  'mmeexx.com': {
    name: 'MMEEXX',
    url: 'https://mmeexx.com',
    tagline: 'Lo que los locales no te cuentan.',
    heroTitle: 'Olvídate de las trampas para turistas.\nDescubre adónde van los locales de verdad.',
    heroSubtitle: 'Recomendado por locales, no por algoritmos. Joyas escondidas, tips honestos, cero BS.',
    metaTitle: 'MMEEXX — Joyas Escondidas en México. Recomendaciones Locales.',
    metaDescription: 'Descubre adónde van los locales de verdad en México. Joyas escondidas, tips honestos y recomendaciones reales.',
    city: 'Mexico',
  },
};

const DEFAULT_SITE = SITES['findernyc.com'];

export function getSiteContext(hostname: string): SiteContext {
  const clean = hostname.replace(/^www\./, '').split(':')[0];
  return SITES[clean] ?? DEFAULT_SITE;
}
