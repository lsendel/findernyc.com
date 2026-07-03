import type {
  GuideListItem,
  GuidePage,
  LandingContent,
  NeighborhoodListItem,
  SpotDetail,
} from './types';

export interface ContentRepository {
  fetchLandingContent(): Promise<LandingContent>;
  fetchSpotDetail(slug: string): Promise<SpotDetail | null>;
  fetchGuides(): Promise<GuideListItem[]>;
  fetchGuide(slug: string): Promise<GuidePage | null>;
  fetchNeighborhoods(): Promise<NeighborhoodListItem[]>;
}

export class ContentService {
  constructor(private readonly repository: ContentRepository) {}

  fetchLandingContent(): Promise<LandingContent> {
    return this.repository.fetchLandingContent();
  }

  fetchSpotDetail(slug: string): Promise<SpotDetail | null> {
    return this.repository.fetchSpotDetail(slug.trim());
  }

  fetchGuides(): Promise<GuideListItem[]> {
    return this.repository.fetchGuides();
  }

  fetchGuide(slug: string): Promise<GuidePage | null> {
    return this.repository.fetchGuide(slug.trim());
  }

  fetchNeighborhoods(): Promise<NeighborhoodListItem[]> {
    return this.repository.fetchNeighborhoods();
  }
}
