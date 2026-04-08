import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };
const router = new Hono<Env>();

router.post('/', async (c) => {
  const db = c.env.DB;

  let body: { spot_id?: number; score?: number; session_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 400);
  }

  const { spot_id, score, session_id } = body;

  if (!spot_id || typeof spot_id !== 'number') {
    return c.json({ success: false, error: 'spot_id is required' }, 400);
  }
  if (typeof score !== 'number' || score < 1 || score > 5 || !Number.isInteger(score)) {
    return c.json({ success: false, error: 'score must be an integer between 1 and 5' }, 400);
  }

  try {
    if (session_id) {
      // Check for existing rating from this session
      const existing = await db
        .prepare(`SELECT id FROM ratings WHERE spot_id = ? AND session_id = ?`)
        .bind(spot_id, session_id)
        .first<{ id: number }>();

      if (existing) {
        await db
          .prepare(`UPDATE ratings SET score = ? WHERE id = ?`)
          .bind(score, existing.id)
          .run();
        return c.json({ success: true });
      }
    }

    await db
      .prepare(`INSERT INTO ratings (spot_id, score, session_id) VALUES (?, ?, ?)`)
      .bind(spot_id, score, session_id ?? null)
      .run();

    return c.json({ success: true });
  } catch (err) {
    console.error('Rating error:', err);
    return c.json({ success: false, error: 'failed_to_save_rating' }, 500);
  }
});

export { router as ratingsRouter };
