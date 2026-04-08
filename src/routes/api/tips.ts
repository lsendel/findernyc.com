import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };
const router = new Hono<Env>();

router.post('/', async (c) => {
  const db = c.env.DB;

  let body: { spot_id?: number; text?: string; author_name?: string; author_area?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 400);
  }

  const { spot_id, author_name, author_area } = body;
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!spot_id || typeof spot_id !== 'number') {
    return c.json({ success: false, error: 'spot_id is required' }, 400);
  }
  if (text.length < 10 || text.length > 500) {
    return c.json({ success: false, error: 'text must be between 10 and 500 characters' }, 400);
  }

  try {
    await db
      .prepare(
        `INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved) VALUES (?, ?, ?, ?, 1)`
      )
      .bind(spot_id, text, author_name ?? null, author_area ?? null)
      .run();

    return c.json({ success: true });
  } catch (err) {
    console.error('Tip error:', err);
    return c.json({ success: false, error: 'failed_to_save_tip' }, 500);
  }
});

export { router as tipsRouter };
