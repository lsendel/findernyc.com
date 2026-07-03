import { Hono } from 'hono';
import { createFinderNycServices } from '../../application/service-factory';
import { parseNewsletterInput, subscribeToNewsletter } from '../../application/feedback/use-cases';

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

  const parsed = parseNewsletterInput(body);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 400);
  }

  try {
    const result = await subscribeToNewsletter(createFinderNycServices(db).feedback, parsed.value);
    if (result === 'already_subscribed') {
      return c.json({ success: true, message: 'Already subscribed!' });
    }

    return c.json({ success: true, message: 'Subscribed!' });
  } catch (err: unknown) {
    console.error('Newsletter error:', err);
    return c.json({ success: false, error: 'failed_to_subscribe' }, 500);
  }
});

export { router as newsletterRouter };
