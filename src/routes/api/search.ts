import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };
const router = new Hono<Env>();

// GET / — Full-text search
router.get('/', async (c) => {
  const db = c.env.DB;
  const q = c.req.query('q')?.trim() ?? '';
  const category = c.req.query('category')?.trim() ?? '';
  const borough = c.req.query('borough')?.trim() ?? '';
  const neighborhood = c.req.query('neighborhood')?.trim() ?? '';
  const sort = c.req.query('sort')?.trim() ?? 'relevance';

  try {
    const params: unknown[] = [];
    let sql: string;

    if (q) {
      // FTS5 search with prefix matching
      const ftsQuery = q + '*';
      sql = `
        SELECT s.*,
          (SELECT AVG(r.score) FROM ratings r WHERE r.spot_id = s.id) as avg_rating,
          (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) as rating_count,
          fts.rank
        FROM spots_fts fts
        JOIN spots s ON s.rowid = fts.rowid
        WHERE spots_fts MATCH ?
          AND s.published = 1
      `;
      params.push(ftsQuery);
    } else {
      sql = `
        SELECT s.*,
          (SELECT AVG(r.score) FROM ratings r WHERE r.spot_id = s.id) as avg_rating,
          (SELECT COUNT(*) FROM ratings r WHERE r.spot_id = s.id) as rating_count
        FROM spots s
        WHERE s.published = 1
      `;
    }

    if (category) {
      sql += ` AND s.category = ?`;
      params.push(category);
    }
    if (borough) {
      sql += ` AND s.borough = ?`;
      params.push(borough);
    }
    if (neighborhood) {
      sql += ` AND s.neighborhood = ?`;
      params.push(neighborhood);
    }

    // Sort
    if (sort === 'rating') {
      sql += ` ORDER BY avg_rating DESC NULLS LAST`;
    } else if (sort === 'newest') {
      sql += ` ORDER BY s.created_at DESC`;
    } else if (q) {
      sql += ` ORDER BY fts.rank`;
    } else {
      sql += ` ORDER BY avg_rating DESC NULLS LAST`;
    }

    sql += ` LIMIT 20`;

    const spotsResult = await db.prepare(sql).bind(...params).all();

    // Count total (without LIMIT)
    let countSql: string;
    const countParams: unknown[] = [];

    if (q) {
      const ftsQuery = q + '*';
      countSql = `
        SELECT COUNT(*) as total
        FROM spots_fts fts
        JOIN spots s ON s.rowid = fts.rowid
        WHERE spots_fts MATCH ?
          AND s.published = 1
      `;
      countParams.push(ftsQuery);
    } else {
      countSql = `
        SELECT COUNT(*) as total
        FROM spots s
        WHERE s.published = 1
      `;
    }

    if (category) {
      countSql += ` AND s.category = ?`;
      countParams.push(category);
    }
    if (borough) {
      countSql += ` AND s.borough = ?`;
      countParams.push(borough);
    }
    if (neighborhood) {
      countSql += ` AND s.neighborhood = ?`;
      countParams.push(neighborhood);
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first<{ total: number }>();

    // Search guides if q provided
    let guides: unknown[] = [];
    if (q) {
      const likeQ = `%${q}%`;
      const guidesResult = await db
        .prepare(
          `SELECT * FROM guides WHERE published = 1 AND (title LIKE ? OR excerpt LIKE ?) LIMIT 3`
        )
        .bind(likeQ, likeQ)
        .all();
      guides = guidesResult.results;
    }

    return c.json({
      spots: spotsResult.results,
      guides,
      total: countResult?.total ?? 0,
    });
  } catch (err) {
    console.error('Search error:', err);
    return c.json({ spots: [], guides: [], total: 0, error: 'search_failed' }, 500);
  }
});

// GET /suggest — Typeahead suggestions
router.get('/suggest', async (c) => {
  const db = c.env.DB;
  const q = c.req.query('q')?.trim() ?? '';

  if (q.length < 2) {
    return c.json({ spots: [], guides: [], neighborhoods: [] });
  }

  try {
    const ftsQuery = q + '*';
    const likeQ = `%${q}%`;

    const [spotsResult, guidesResult, neighborhoodsResult] = await Promise.all([
      db
        .prepare(
          `SELECT s.name, s.slug, s.neighborhood, s.category
           FROM spots_fts fts
           JOIN spots s ON s.rowid = fts.rowid
           WHERE spots_fts MATCH ? AND s.published = 1
           ORDER BY fts.rank
           LIMIT 5`
        )
        .bind(ftsQuery)
        .all(),
      db
        .prepare(
          `SELECT title, slug, type FROM guides
           WHERE published = 1 AND title LIKE ?
           LIMIT 3`
        )
        .bind(likeQ)
        .all(),
      db
        .prepare(
          `SELECT name, slug, borough FROM neighborhoods
           WHERE name LIKE ?
           LIMIT 3`
        )
        .bind(likeQ)
        .all(),
    ]);

    return c.json({
      spots: spotsResult.results,
      guides: guidesResult.results,
      neighborhoods: neighborhoodsResult.results,
    });
  } catch (err) {
    console.error('Suggest error:', err);
    return c.json({ spots: [], guides: [], neighborhoods: [] }, 500);
  }
});

export { router as searchRouter };
