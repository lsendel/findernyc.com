import type { SiteContext } from '../../site/context';

export type StaticPageCopy = {
  title: string;
  description: string;
  path: string;
  heading: string;
  intro?: string;
  body: string[];
};

export function buildAboutPage(site: SiteContext): StaticPageCopy {
  return {
    title: `About ${site.name}`,
    description: `Learn how ${site.name} helps you skip tourist traps and discover better NYC spots.`,
    path: '/about',
    heading: `About ${site.name}`,
    intro: 'FinderNYC is built around local context, not generic listicles.',
    body: [
      'The product is focused on helping you find spots that feel worth the subway ride, the walk, and the recommendation.',
      'We prioritize neighborhood context, practical tips, and searchable guides over growth-heavy platform features that do not improve the core experience.',
      'The current product direction is intentionally narrow: better discovery, cleaner pages, and local guidance you can actually use.',
    ],
  };
}

export function buildPrivacyPage(site: SiteContext): StaticPageCopy {
  return {
    title: `Privacy | ${site.name}`,
    description: `Privacy information for ${site.name}.`,
    path: '/privacy',
    heading: 'Privacy',
    body: [
      'FinderNYC stores only the information needed to run search, newsletter signup, ratings, and local tips.',
      'We do not position this product as a broad behavioral analytics platform, and we have removed older product surfaces that no longer fit that goal.',
      'If you submit an email address, tip, or rating, that data is used only to support the current FinderNYC experience.',
    ],
  };
}

export function buildTermsPage(site: SiteContext): StaticPageCopy {
  return {
    title: `Terms | ${site.name}`,
    description: `Terms of use for ${site.name}.`,
    path: '/terms',
    heading: 'Terms',
    body: [
      'FinderNYC is an editorial discovery product. Recommendations, guides, and ratings are provided for general informational use.',
      'You are responsible for confirming hours, availability, pricing, and access details with a venue or operator before you go.',
      'Do not submit unlawful, abusive, or misleading content through ratings, tips, or newsletter forms.',
    ],
  };
}

export function buildTipsPage(site: SiteContext): StaticPageCopy {
  return {
    title: `Practical Tips | ${site.name}`,
    description: `Practical local tips for using ${site.name} to explore New York without wasting time.`,
    path: '/tips',
    heading: 'Practical Tips',
    intro: 'Use the city like a local friend texted you the plan.',
    body: [
      'Start with a neighborhood, not a giant list. The best recommendation usually depends on where you already are and what time it is.',
      'Use the search page to narrow by mood first: food, rooftops, coffee, bars, free spots, pizza, and views are the best starting points.',
      'Open a spot page before you go. The useful part is not just the place itself, it is the timing note, subway note, and the local comments underneath.',
    ],
  };
}
