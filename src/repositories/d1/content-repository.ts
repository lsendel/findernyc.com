import type { ContentRepository } from '../../domain/content/service';
import type {
  GuideListItem,
  GuidePage,
  LandingContent,
  NeighborhoodListItem,
  SpotDetail,
} from '../../domain/content/types';

type FeaturedSpotRow = {
  slug: string;
  title: string;
  neighborhood: string;
  category: string;
  one_liner: string | null;
  photo_url: string | null;
  avg_rating: number | null;
  rating_count: number;
};

type FeaturedNeighborhoodRow = {
  slug: string;
  name: string;
  borough: string;
  vibe: string | null;
  photo_url: string | null;
  spot_count: number;
};

type SpotTipRow = {
  text: string;
  author_name: string | null;
  author_area: string | null;
};

type RelatedSpotRow = {
  slug: string;
  title: string;
  neighborhood: string;
  category: string;
  one_liner: string | null;
  avg_rating: number | null;
  rating_count: number;
};

type SpotDetailRow = {
  id: number;
  name: string;
  slug: string;
  title: string;
  neighborhood: string;
  borough: string;
  category: string;
  description: string;
  one_liner: string | null;
  pro_tip: string | null;
  subway: string | null;
  while_here: string | null;
  best_time: string | null;
  avoid_time: string | null;
  budget_note: string | null;
  vibe_tags: string | null;
  price_level: number | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  photo_url: string | null;
  avg_rating: number | null;
  rating_count: number;
};

type GuideRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_photo_url: string | null;
};

type GuidePageRow = GuideRow & {
  type: string | null;
  neighborhood: string | null;
  borough: string | null;
  body_html: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: number | null;
  updated_at: number | null;
};

type NeighborhoodRow = {
  slug: string;
  name: string;
  borough: string | null;
  vibe: string | null;
  photo_url: string | null;
  spot_count: number;
};

function mapFeaturedSpot(row: FeaturedSpotRow): LandingContent['featuredSpots'][number] {
  return {
    slug: row.slug,
    title: row.title,
    neighborhood: row.neighborhood,
    category: row.category,
    oneLiner: row.one_liner,
    photoUrl: row.photo_url,
    averageRating: row.avg_rating,
    ratingCount: row.rating_count,
  };
}

function mapFeaturedNeighborhood(row: FeaturedNeighborhoodRow): LandingContent['neighborhoods'][number] {
  return {
    slug: row.slug,
    name: row.name,
    borough: row.borough,
    vibe: row.vibe,
    photoUrl: row.photo_url,
    spotCount: row.spot_count,
  };
}

function mapSpotTip(row: SpotTipRow): SpotDetail['tips'][number] {
  return {
    text: row.text,
    authorName: row.author_name,
    authorArea: row.author_area,
  };
}

function mapRelatedSpot(row: RelatedSpotRow): SpotDetail['relatedSpots'][number] {
  return {
    slug: row.slug,
    title: row.title,
    neighborhood: row.neighborhood,
    category: row.category,
    oneLiner: row.one_liner,
    averageRating: row.avg_rating,
    ratingCount: row.rating_count,
  };
}

function mapSpotDetail(row: SpotDetailRow, tips: SpotTipRow[], relatedSpots: RelatedSpotRow[]): SpotDetail {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    title: row.title,
    neighborhood: row.neighborhood,
    borough: row.borough,
    category: row.category,
    description: row.description,
    oneLiner: row.one_liner,
    proTip: row.pro_tip,
    subway: row.subway,
    whileHere: row.while_here,
    bestTime: row.best_time,
    avoidTime: row.avoid_time,
    budgetNote: row.budget_note,
    vibeTags: row.vibe_tags,
    priceLevel: row.price_level,
    latitude: row.latitude,
    longitude: row.longitude,
    googleMapsUrl: row.google_maps_url,
    photoUrl: row.photo_url,
    averageRating: row.avg_rating,
    ratingCount: row.rating_count,
    tips: tips.map(mapSpotTip),
    relatedSpots: relatedSpots.map(mapRelatedSpot),
  };
}

function mapGuide(row: GuideRow): GuideListItem {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverPhotoUrl: row.cover_photo_url,
  };
}

function mapGuidePage(row: GuidePageRow): GuidePage {
  return {
    ...mapGuide(row),
    type: row.type,
    neighborhood: row.neighborhood,
    borough: row.borough,
    bodyHtml: row.body_html,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

function mapNeighborhood(row: NeighborhoodRow): NeighborhoodListItem {
  return {
    slug: row.slug,
    name: row.name,
    borough: row.borough,
    vibe: row.vibe,
    photoUrl: row.photo_url,
    spotCount: row.spot_count,
  };
}

export class D1ContentRepository implements ContentRepository {
  constructor(private readonly db: D1Database) {}

  async fetchLandingContent(): Promise<LandingContent> {
    const [spotsResult, neighborhoodsResult] = await Promise.all([
      this.db
        .prepare(
          `SELECT s.slug, s.title, s.neighborhood, s.category, s.one_liner, s.photo_url,
                  (SELECT ROUND(AVG(r.score), 1) FROM ratings r WHERE r.spot_id = s.id) AS avg_rating,
                  (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) AS rating_count
           FROM spots s
           WHERE s.published = 1
           ORDER BY avg_rating DESC NULLS LAST
           LIMIT 5`,
        )
        .all(),
      this.db
        .prepare(
          `SELECT n.slug, n.name, n.borough, n.vibe, n.photo_url,
                  (SELECT COUNT(*) FROM spots s WHERE s.neighborhood = n.name AND s.published = 1) AS spot_count
           FROM neighborhoods n
           ORDER BY spot_count DESC
           LIMIT 8`,
        )
        .all(),
    ]);

    return {
      featuredSpots: (spotsResult.results as FeaturedSpotRow[]).map(mapFeaturedSpot),
      neighborhoods: (neighborhoodsResult.results as FeaturedNeighborhoodRow[]).map(mapFeaturedNeighborhood),
    };
  }

  async fetchSpotDetail(slug: string): Promise<SpotDetail | null> {
    const spot = await this.db
      .prepare(
        `SELECT s.*,
                (SELECT ROUND(AVG(r.score), 1) FROM ratings r WHERE r.spot_id = s.id) AS avg_rating,
                (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) AS rating_count
         FROM spots s
         WHERE s.slug = ? AND s.published = 1`,
      )
      .bind(slug)
      .first<SpotDetailRow>();

    if (!spot) return null;

    const [tipsResult, relatedResult] = await Promise.all([
      this.db
        .prepare(
          `SELECT text, author_name, author_area
           FROM spot_tips
           WHERE spot_id = ? AND approved = 1
           ORDER BY created_at DESC
           LIMIT 10`,
        )
        .bind(spot.id)
        .all(),
      this.db
        .prepare(
          `SELECT s.slug, s.title, s.neighborhood, s.category, s.one_liner,
                  (SELECT ROUND(AVG(r.score), 1) FROM ratings r WHERE r.spot_id = s.id) AS avg_rating,
                  (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) AS rating_count
           FROM spots s
           WHERE s.neighborhood = ? AND s.id != ? AND s.published = 1
           LIMIT 4`,
        )
        .bind(spot.neighborhood, spot.id)
        .all(),
    ]);

    return {
      ...mapSpotDetail(
        spot,
        tipsResult.results as SpotTipRow[],
        relatedResult.results as RelatedSpotRow[],
      ),
    };
  }

  async fetchGuides(): Promise<GuideListItem[]> {
    const guides = await this.db
      .prepare(
        `SELECT slug, title, excerpt, cover_photo_url
         FROM guides
         WHERE published = 1
         ORDER BY published_at DESC, created_at DESC
         LIMIT 24`,
      )
      .all();

    return (guides.results as GuideRow[]).map(mapGuide);
  }

  async fetchGuide(slug: string): Promise<GuidePage | null> {
    const guide = await this.db
      .prepare(
        `SELECT slug, title, excerpt, body_html, cover_photo_url
                , type, neighborhood, borough, seo_title, seo_description, published_at, updated_at
         FROM guides
         WHERE slug = ? AND published = 1`,
      )
      .bind(slug)
      .first<GuidePageRow>();

    return guide ? mapGuidePage(guide) : null;
  }

  async fetchNeighborhoods(): Promise<NeighborhoodListItem[]> {
    const neighborhoods = await this.db
      .prepare(
        `SELECT n.slug, n.name, n.borough, n.vibe, n.photo_url,
                (SELECT COUNT(*) FROM spots s WHERE s.neighborhood = n.name AND s.published = 1) AS spot_count
         FROM neighborhoods n
         ORDER BY spot_count DESC, n.name ASC`,
      )
      .all();

    return (neighborhoods.results as NeighborhoodRow[]).map(mapNeighborhood);
  }
}
