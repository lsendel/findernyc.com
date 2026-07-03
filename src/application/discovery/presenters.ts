import type { SearchGuide, SearchQuery, SearchResults, SearchSpot } from '../../domain/discovery/types';

export type SearchSpotCardViewModel = {
  slug: string;
  title: string;
  name: string;
  neighborhood: string;
  borough: string;
  category: string;
  oneLiner: string | null;
  priceLevel: number | null;
  photoUrl: string | null;
  subway: string | null;
  averageRating: number | null;
  ratingCount: number;
};

export type SearchGuideCardViewModel = {
  slug: string;
  title: string;
  type: string;
  excerpt: string | null;
  coverPhotoUrl: string | null;
};

export type SearchPageViewModel = {
  query: string;
  category: string;
  borough: string;
  sort: string;
  spots: SearchSpotCardViewModel[];
  guides: SearchGuideCardViewModel[];
  total: number;
};

function presentSearchSpot(spot: SearchSpot): SearchSpotCardViewModel {
  return {
    slug: spot.slug,
    title: spot.title,
    name: spot.name,
    neighborhood: spot.neighborhood,
    borough: spot.borough,
    category: spot.category,
    oneLiner: spot.oneLiner,
    priceLevel: spot.priceLevel,
    photoUrl: spot.photoUrl,
    subway: spot.subway,
    averageRating: spot.averageRating,
    ratingCount: spot.ratingCount,
  };
}

function presentSearchGuide(guide: SearchGuide): SearchGuideCardViewModel {
  return {
    slug: guide.slug,
    title: guide.title,
    type: guide.type,
    excerpt: guide.excerpt,
    coverPhotoUrl: guide.coverPhotoUrl,
  };
}

export function presentSearchPage(query: SearchQuery, results: SearchResults): SearchPageViewModel {
  return {
    query: query.query,
    category: query.category,
    borough: query.borough,
    sort: query.sort,
    spots: results.spots.map(presentSearchSpot),
    guides: results.guides.map(presentSearchGuide),
    total: results.total,
  };
}
