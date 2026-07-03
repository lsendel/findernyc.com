import type { ContentService } from '../../domain/content/service';
import {
  presentGuidePage,
  presentGuidesIndexPage,
  presentLandingPage,
  presentNeighborhoodsPage,
  presentSpotPage,
  type GuideCardViewModel,
  type GuidePageViewModel,
  type LandingPageViewModel,
  type NeighborhoodCardViewModel,
  type SpotPageViewModel,
} from './presenters';

export async function getLandingPageContent(service: ContentService): Promise<LandingPageViewModel> {
  return presentLandingPage(await service.fetchLandingContent());
}

export async function getSpotPageContent(service: ContentService, slug: string): Promise<SpotPageViewModel | null> {
  const spot = await service.fetchSpotDetail(slug);
  return spot ? presentSpotPage(spot) : null;
}

export async function getGuidesIndexContent(service: ContentService): Promise<GuideCardViewModel[]> {
  return presentGuidesIndexPage(await service.fetchGuides());
}

export async function getGuidePageContent(service: ContentService, slug: string): Promise<GuidePageViewModel | null> {
  const guide = await service.fetchGuide(slug);
  return guide ? presentGuidePage(guide) : null;
}

export async function getNeighborhoodsPageContent(service: ContentService): Promise<NeighborhoodCardViewModel[]> {
  return presentNeighborhoodsPage(await service.fetchNeighborhoods());
}
