import type { DiscoveryRepository } from '../../domain/discovery/service';
import type {
  SearchGuide,
  SearchNeighborhoodSuggestion,
  SearchQuery,
  SearchResults,
  SearchSpot,
  SearchSpotSuggestion,
  SearchSuggestions,
} from '../../domain/discovery/types';

type SearchSpotRow = {
  slug: string;
  title: string;
  name: string;
  neighborhood: string;
  borough: string;
  category: string;
  one_liner: string | null;
  price_level: number | null;
  photo_url: string | null;
  subway: string | null;
  avg_rating: number | null;
  rating_count: number;
};

type SearchGuideRow = {
  slug: string;
  title: string;
  type: string;
  excerpt: string | null;
  cover_photo_url: string | null;
};

function mapSearchSpot(row: SearchSpotRow): SearchSpot {
  return {
    slug: row.slug,
    title: row.title,
    name: row.name,
    neighborhood: row.neighborhood,
    borough: row.borough,
    category: row.category,
    oneLiner: row.one_liner,
    priceLevel: row.price_level,
    photoUrl: row.photo_url,
    subway: row.subway,
    averageRating: row.avg_rating,
    ratingCount: row.rating_count,
  };
}

function mapSearchGuide(row: SearchGuideRow): SearchGuide {
  return {
    slug: row.slug,
    title: row.title,
    type: row.type,
    excerpt: row.excerpt,
    coverPhotoUrl: row.cover_photo_url,
  };
}

export class D1DiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly db: D1Database) {}

  async search(query: SearchQuery): Promise<SearchResults> {
    const bindings: unknown[] = [];
    const conditions: string[] = ['s.published = 1'];
    let fromClause = 'spots s';
    let orderBy = 'avg_rating DESC NULLS LAST';

    if (query.query) {
      fromClause = 'spots_fts JOIN spots s ON s.id = spots_fts.rowid';
      conditions.push('spots_fts MATCH ?');
      bindings.push(`${query.query}*`);
      orderBy = 'spots_fts.rank';
    }

    if (query.category) {
      conditions.push('s.category = ?');
      bindings.push(query.category);
    }
    if (query.borough) {
      conditions.push('s.borough = ?');
      bindings.push(query.borough);
    }
    if (query.neighborhood) {
      conditions.push('s.neighborhood = ?');
      bindings.push(query.neighborhood);
    }
    if (query.sort === 'rating') {
      orderBy = 'avg_rating DESC NULLS LAST';
    } else if (query.sort === 'newest') {
      orderBy = 's.created_at DESC';
    }

    const whereClause = conditions.join(' AND ');
    const spotsQuery = `
      SELECT s.slug, s.title, s.name, s.neighborhood, s.borough, s.category,
             s.one_liner, s.price_level, s.photo_url, s.subway,
             (SELECT ROUND(AVG(r.score), 1) FROM ratings r WHERE r.spot_id = s.id) AS avg_rating,
             (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) AS rating_count
      FROM ${fromClause}
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT 20
    `;
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM ${fromClause}
      WHERE ${whereClause}
    `;

    const requests: Promise<unknown>[] = [
      this.db.prepare(spotsQuery).bind(...bindings).all(),
      this.db.prepare(countQuery).bind(...bindings).first(),
    ];

    if (query.query) {
      requests.push(
        this.db
          .prepare(
            `SELECT slug, title, type, excerpt, cover_photo_url
             FROM guides
             WHERE published = 1 AND (title LIKE ? OR excerpt LIKE ?)
             LIMIT 3`,
          )
          .bind(`%${query.query}%`, `%${query.query}%`)
          .all(),
      );
    }

    const [spotsResult, countResult, guidesResult] = await Promise.all(requests);
    return {
      spots: ((spotsResult as { results: SearchSpotRow[] }).results ?? []).map(mapSearchSpot),
      guides: query.query ? ((guidesResult as { results: SearchGuideRow[] }).results ?? []).map(mapSearchGuide) : [],
      total: ((countResult as { total?: number } | null)?.total ?? 0),
    };
  }

  async suggest(query: string): Promise<SearchSuggestions> {
    const [spotsResult, guidesResult, neighborhoodsResult] = await Promise.all([
      this.db
        .prepare(
          `SELECT s.name, s.slug, s.neighborhood, s.category
           FROM spots_fts fts
           JOIN spots s ON s.id = fts.rowid
           WHERE spots_fts MATCH ? AND s.published = 1
           ORDER BY fts.rank
           LIMIT 5`,
        )
        .bind(`${query}*`)
        .all(),
      this.db
        .prepare(
          `SELECT title, slug, type
           FROM guides
           WHERE published = 1 AND title LIKE ?
           LIMIT 3`,
        )
        .bind(`%${query}%`)
        .all(),
      this.db
        .prepare(
          `SELECT name, slug, borough
           FROM neighborhoods
           WHERE name LIKE ?
           LIMIT 3`,
        )
        .bind(`%${query}%`)
        .all(),
    ]);

    return {
      spots: spotsResult.results as SearchSpotSuggestion[],
      guides: (guidesResult.results as SearchGuideRow[]).map(mapSearchGuide),
      neighborhoods: neighborhoodsResult.results as SearchNeighborhoodSuggestion[],
    };
  }
}
