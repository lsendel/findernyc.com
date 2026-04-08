import { Hono } from 'hono';
import { landingPageHtml } from '../templates/landing';
import { spotPageHtml, type SpotPageData } from '../templates/spot';
import { searchPageHtml, type SearchResultSpot, type SearchResultGuide } from '../templates/search';

type Env = { Bindings: { DB: D1Database } };

const pagesRouter = new Hono<Env>();

/* ------------------------------------------------------------------ */
/*  GET /  — Landing page                                              */
/* ------------------------------------------------------------------ */

pagesRouter.get('/', async (c) => {
  const db = c.env.DB;

  const [spotsResult, neighborhoodsResult] = await Promise.all([
    db
      .prepare(
        `SELECT s.slug, s.title, s.neighborhood, s.category, s.one_liner, s.photo_url,
                (SELECT ROUND(AVG(r.score), 1) FROM ratings r WHERE r.spot_id = s.id) AS avg_rating,
                (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) AS rating_count
         FROM spots s
         WHERE s.published = 1
         ORDER BY avg_rating DESC NULLS LAST
         LIMIT 6`,
      )
      .all(),
    db
      .prepare(
        `SELECT n.slug, n.name, n.borough, n.vibe, n.photo_url,
                (SELECT COUNT(*) FROM spots s WHERE s.neighborhood = n.name AND s.published = 1) AS spot_count
         FROM neighborhoods n
         ORDER BY spot_count DESC
         LIMIT 8`,
      )
      .all(),
  ]);

  return c.html(
    landingPageHtml({
      featuredSpots: spotsResult.results as any[],
      neighborhoods: neighborhoodsResult.results as any[],
    }),
  );
});

/* ------------------------------------------------------------------ */
/*  GET /spots/:slug  — Spot detail page                               */
/* ------------------------------------------------------------------ */

pagesRouter.get('/spots/:slug', async (c) => {
  const db = c.env.DB;
  const { slug } = c.req.param();

  const spot = await db
    .prepare(
      `SELECT s.*,
              (SELECT ROUND(AVG(r.score), 1) FROM ratings r WHERE r.spot_id = s.id) AS avg_rating,
              (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) AS rating_count
       FROM spots s
       WHERE s.slug = ? AND s.published = 1`,
    )
    .bind(slug)
    .first();

  if (!spot) return c.text('Spot not found', 404);

  const [tipsResult, relatedResult] = await Promise.all([
    db
      .prepare(
        `SELECT text, author_name, author_area
         FROM spot_tips
         WHERE spot_id = ? AND approved = 1
         ORDER BY created_at DESC
         LIMIT 10`,
      )
      .bind(spot.id)
      .all(),
    db
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

  const data: SpotPageData = {
    ...(spot as any),
    tips: tipsResult.results as any[],
    related_spots: relatedResult.results as any[],
  };

  return c.html(spotPageHtml(data));
});

/* ------------------------------------------------------------------ */
/*  GET /search  — Search results page (SSR)                           */
/* ------------------------------------------------------------------ */

pagesRouter.get('/search', async (c) => {
  try {
  const db = c.env.DB;
  const q = c.req.query('q') ?? '';
  const category = c.req.query('category') ?? '';
  const borough = c.req.query('borough') ?? '';
  const neighborhood = c.req.query('neighborhood') ?? '';
  const sort = c.req.query('sort') ?? 'relevance';

  const bindings: unknown[] = [];
  const conditions: string[] = ['s.published = 1'];
  let fromClause: string;
  let orderBy: string;

  if (q) {
    fromClause = 'spots_fts JOIN spots s ON s.id = spots_fts.rowid';
    conditions.push('spots_fts MATCH ?');
    bindings.push(q + '*');
  } else {
    fromClause = 'spots s';
  }

  if (category) {
    conditions.push('s.category = ?');
    bindings.push(category);
  }
  if (borough) {
    conditions.push('s.borough = ?');
    bindings.push(borough);
  }
  if (neighborhood) {
    conditions.push('s.neighborhood = ?');
    bindings.push(neighborhood);
  }

  const whereClause = conditions.join(' AND ');

  switch (sort) {
    case 'rating':
      orderBy = 'avg_rating DESC NULLS LAST';
      break;
    case 'newest':
      orderBy = 's.created_at DESC';
      break;
    default:
      orderBy = q ? 'spots_fts.rank' : 'avg_rating DESC NULLS LAST';
  }

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

  const requests: Promise<any>[] = [
    db.prepare(spotsQuery).bind(...bindings).all(),
    db.prepare(countQuery).bind(...bindings).first(),
  ];

  // If text query, also search guides
  if (q) {
    requests.push(
      db
        .prepare(
          `SELECT slug, title, type, excerpt, cover_photo_url
           FROM guides
           WHERE published = 1 AND (title LIKE ? OR excerpt LIKE ?)
           LIMIT 3`,
        )
        .bind(`%${q}%`, `%${q}%`)
        .all(),
    );
  }

  const results = await Promise.all(requests);

  const spots = results[0].results as SearchResultSpot[];
  const total = (results[1] as any)?.total ?? 0;
  const guides: SearchResultGuide[] = q ? (results[2].results as SearchResultGuide[]) : [];

  return c.html(
    searchPageHtml({
      query: q,
      category,
      borough,
      sort,
      spots,
      guides,
      total,
    }),
  );
  } catch (err) {
    console.error('Search page error:', err);
    return c.text(`Search error: ${err}`, 500);
  }
});

export { pagesRouter };
