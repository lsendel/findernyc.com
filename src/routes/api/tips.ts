import { Hono } from 'hono';
import { createFinderNycServices } from '../../application/service-factory';
import { parseTipInput, submitSpotTip } from '../../application/feedback/use-cases';

type Env = { Bindings: { DB?: D1Database } };
const router = new Hono<Env>();

router.post('/', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.json({ success: false, error: 'database_unavailable' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 400);
  }

  const parsed = parseTipInput(body);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 400);
  }

  try {
    await submitSpotTip(createFinderNycServices(db).feedback, parsed.value);
    return c.json({ success: true });
  } catch (err) {
    console.error('Tip error:', err);
    return c.json({ success: false, error: 'failed_to_save_tip' }, 500);
  }
});

export { router as tipsRouter };
