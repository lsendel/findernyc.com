import { Hono } from 'hono';
import { createFinderNycServices } from '../../application/service-factory';
import { isUnavailableD1Error } from '../../lib/d1-errors';
import { searchFinderNyc, suggestFinderNyc } from '../../application/discovery/use-cases';

type Env = { Bindings: { DB?: D1Database } };
const router = new Hono<Env>();

router.get('/', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.json({ spots: [], guides: [], total: 0 });
  }

  try {
    const results = await searchFinderNyc(createFinderNycServices(db).discovery, {
      query: c.req.query('q'),
      category: c.req.query('category'),
      borough: c.req.query('borough'),
      neighborhood: c.req.query('neighborhood'),
      sort: c.req.query('sort'),
    });
    return c.json(results);
  } catch (err) {
    if (isUnavailableD1Error(err)) {
      return c.json({ spots: [], guides: [], total: 0 });
    }
    console.error('Search error:', err);
    return c.json({ spots: [], guides: [], total: 0, error: 'search_failed' }, 500);
  }
});

router.get('/suggest', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.json({ spots: [], guides: [], neighborhoods: [] });
  }

  try {
    return c.json(await suggestFinderNyc(createFinderNycServices(db).discovery, c.req.query('q')));
  } catch (err) {
    if (isUnavailableD1Error(err)) {
      return c.json({ spots: [], guides: [], neighborhoods: [] });
    }
    console.error('Suggest error:', err);
    return c.json({ spots: [], guides: [], neighborhoods: [] }, 500);
  }
});

export { router as searchRouter };
