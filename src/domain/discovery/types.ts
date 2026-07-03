export type SearchSort = 'relevance' | 'rating' | 'newest';

export type SearchQuery = {
  query: string;
  category: string;
  borough: string;
  neighborhood: string;
  sort: SearchSort;
};

export type SearchSpot = {
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

export type SearchGuide = {
  slug: string;
  title: string;
  type: string;
  excerpt: string | null;
  coverPhotoUrl: string | null;
};

export type SearchResults = {
  spots: SearchSpot[];
  guides: SearchGuide[];
  total: number;
};

export type SearchSpotSuggestion = Pick<SearchSpot, 'name' | 'slug' | 'neighborhood' | 'category'>;
export type SearchGuideSuggestion = Pick<SearchGuide, 'title' | 'slug' | 'type'>;
export type SearchNeighborhoodSuggestion = {
  name: string;
  slug: string;
  borough: string | null;
};

export type SearchSuggestions = {
  spots: SearchSpotSuggestion[];
  guides: SearchGuideSuggestion[];
  neighborhoods: SearchNeighborhoodSuggestion[];
};
