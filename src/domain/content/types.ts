export type FeaturedSpot = {
  slug: string;
  title: string;
  neighborhood: string;
  category: string;
  oneLiner: string | null;
  photoUrl: string | null;
  averageRating: number | null;
  ratingCount: number;
};

export type FeaturedNeighborhood = {
  slug: string;
  name: string;
  borough: string;
  vibe: string | null;
  photoUrl: string | null;
  spotCount: number;
};

export type LandingContent = {
  featuredSpots: FeaturedSpot[];
  neighborhoods: FeaturedNeighborhood[];
};

export type SpotTip = {
  text: string;
  authorName: string | null;
  authorArea: string | null;
};

export type RelatedSpot = {
  slug: string;
  title: string;
  neighborhood: string;
  category: string;
  oneLiner: string | null;
  averageRating: number | null;
  ratingCount: number;
};

export type SpotDetail = {
  id: number;
  name: string;
  slug: string;
  title: string;
  neighborhood: string;
  borough: string;
  category: string;
  description: string;
  oneLiner: string | null;
  proTip: string | null;
  subway: string | null;
  whileHere: string | null;
  bestTime: string | null;
  avoidTime: string | null;
  budgetNote: string | null;
  vibeTags: string | null;
  priceLevel: number | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  photoUrl: string | null;
  averageRating: number | null;
  ratingCount: number;
  tips: SpotTip[];
  relatedSpots: RelatedSpot[];
};

export type GuideListItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverPhotoUrl: string | null;
};

export type GuidePage = GuideListItem & {
  type: string | null;
  neighborhood: string | null;
  borough: string | null;
  bodyHtml: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: number | null;
  updatedAt: number | null;
};

export type NeighborhoodListItem = {
  slug: string;
  name: string;
  borough: string | null;
  vibe: string | null;
  photoUrl: string | null;
  spotCount: number;
};
