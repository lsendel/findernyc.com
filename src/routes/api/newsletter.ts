import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };
const router = new Hono<Env>();

router.post('/', async (c) => {
  const db = c.env.DB;

  let body: { email?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ success: false, error: 'valid email is required' }, 400);
  }

  try {
    await db
      .prepare(`INSERT INTO newsletter_subscribers (email) VALUES (?)`)
      .bind(email)
      .run();

    return c.json({ success: true, message: 'Subscribed!' });
  } catch (err: unknown) {
    // UNIQUE constraint violation for duplicate emails
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE') || message.includes('unique')) {
      return c.json({ success: true, message: 'Already subscribed!' });
    }
    console.error('Newsletter error:', err);
    return c.json({ success: false, error: 'failed_to_subscribe' }, 500);
  }
});

export { router as newsletterRouter };
