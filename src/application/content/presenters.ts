import type {
  GuideListItem,
  GuidePage,
  LandingContent,
  NeighborhoodListItem,
  SpotDetail,
} from '../../domain/content/types';

export type LandingSpotCardViewModel = {
  slug: string;
  title: string;
  neighborhood: string;
  category: string;
  oneLiner: string | null;
  photoUrl: string | null;
  averageRating: number | null;
  ratingCount: number;
};

export type LandingNeighborhoodCardViewModel = {
  slug: string;
  name: string;
  borough: string;
  vibe: string | null;
  photoUrl: string | null;
  spotCount: number;
};

export type LandingPageViewModel = {
  featuredSpots: LandingSpotCardViewModel[];
  neighborhoods: LandingNeighborhoodCardViewModel[];
};

export type SpotTipViewModel = {
  text: string;
  authorName: string | null;
  authorArea: string | null;
};

export type RelatedSpotViewModel = {
  slug: string;
  title: string;
  neighborhood: string;
  category: string;
  oneLiner: string | null;
  averageRating: number | null;
  ratingCount: number;
};

export type SpotPageViewModel = {
  id: number;
  name: string;
  slug: string;
  title: string;
  neighborhood: string;
  borough: string;
  boroughLabel: string;
  category: string;
  description: string;
  descriptionParagraphs: string[];
  oneLiner: string | null;
  proTip: string | null;
  subway: string | null;
  whileHere: string | null;
  bestTime: string | null;
  avoidTime: string | null;
  budgetNote: string | null;
  vibeTags: string[];
  priceLevel: number | null;
  priceLabel: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  photoUrl: string | null;
  averageRating: number | null;
  ratingCount: number;
  tips: SpotTipViewModel[];
  relatedSpots: RelatedSpotViewModel[];
};

export type GuideCardViewModel = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverPhotoUrl: string | null;
};

export type GuidePageViewModel = GuideCardViewModel & {
  type: string | null;
  neighborhood: string | null;
  borough: string | null;
  bodyHtml: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: number | null;
  updatedAt: number | null;
};

export type NeighborhoodCardViewModel = {
  slug: string;
  name: string;
  borough: string | null;
  vibe: string | null;
  photoUrl: string | null;
  spotCount: number;
};

function formatBoroughLabel(borough: string): string {
  return borough
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPriceLabel(priceLevel: number | null): string {
  if (priceLevel == null || priceLevel < 1) return '';
  return '$'.repeat(Math.min(priceLevel, 4));
}

function parseVibeTags(vibeTags: string | null): string[] {
  if (!vibeTags) return [];

  try {
    const tags = JSON.parse(vibeTags) as unknown;
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

function splitDescription(description: string): string[] {
  return description
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function presentLandingPage(content: LandingContent): LandingPageViewModel {
  return {
    featuredSpots: content.featuredSpots.map((spot) => ({
      slug: spot.slug,
      title: spot.title,
      neighborhood: spot.neighborhood,
      category: spot.category,
      oneLiner: spot.oneLiner,
      photoUrl: spot.photoUrl,
      averageRating: spot.averageRating,
      ratingCount: spot.ratingCount,
    })),
    neighborhoods: content.neighborhoods.map((neighborhood) => ({
      slug: neighborhood.slug,
      name: neighborhood.name,
      borough: neighborhood.borough,
      vibe: neighborhood.vibe,
      photoUrl: neighborhood.photoUrl,
      spotCount: neighborhood.spotCount,
    })),
  };
}

export function presentSpotPage(spot: SpotDetail): SpotPageViewModel {
  return {
    id: spot.id,
    name: spot.name,
    slug: spot.slug,
    title: spot.title,
    neighborhood: spot.neighborhood,
    borough: spot.borough,
    boroughLabel: formatBoroughLabel(spot.borough),
    category: spot.category,
    description: spot.description,
    descriptionParagraphs: splitDescription(spot.description),
    oneLiner: spot.oneLiner,
    proTip: spot.proTip,
    subway: spot.subway,
    whileHere: spot.whileHere,
    bestTime: spot.bestTime,
    avoidTime: spot.avoidTime,
    budgetNote: spot.budgetNote,
    vibeTags: parseVibeTags(spot.vibeTags),
    priceLevel: spot.priceLevel,
    priceLabel: formatPriceLabel(spot.priceLevel),
    latitude: spot.latitude,
    longitude: spot.longitude,
    googleMapsUrl: spot.googleMapsUrl,
    photoUrl: spot.photoUrl,
    averageRating: spot.averageRating,
    ratingCount: spot.ratingCount,
    tips: spot.tips.map((tip) => ({
      text: tip.text,
      authorName: tip.authorName,
      authorArea: tip.authorArea,
    })),
    relatedSpots: spot.relatedSpots.map((related) => ({
      slug: related.slug,
      title: related.title,
      neighborhood: related.neighborhood,
      category: related.category,
      oneLiner: related.oneLiner,
      averageRating: related.averageRating,
      ratingCount: related.ratingCount,
    })),
  };
}

export function presentGuidesIndexPage(guides: GuideListItem[]): GuideCardViewModel[] {
  return guides.map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    excerpt: guide.excerpt,
    coverPhotoUrl: guide.coverPhotoUrl,
  }));
}

export function presentGuidePage(guide: GuidePage): GuidePageViewModel {
  return {
    slug: guide.slug,
    title: guide.title,
    excerpt: guide.excerpt,
    coverPhotoUrl: guide.coverPhotoUrl,
    type: guide.type,
    neighborhood: guide.neighborhood,
    borough: guide.borough,
    bodyHtml: guide.bodyHtml,
    seoTitle: guide.seoTitle,
    seoDescription: guide.seoDescription,
    publishedAt: guide.publishedAt,
    updatedAt: guide.updatedAt,
  };
}

export function presentNeighborhoodsPage(
  neighborhoods: NeighborhoodListItem[],
): NeighborhoodCardViewModel[] {
  return neighborhoods.map((neighborhood) => ({
    slug: neighborhood.slug,
    name: neighborhood.name,
    borough: neighborhood.borough,
    vibe: neighborhood.vibe,
    photoUrl: neighborhood.photoUrl,
    spotCount: neighborhood.spotCount,
  }));
}
