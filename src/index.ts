import { Hono } from 'hono';
import { isUnavailableD1Error } from './lib/d1-errors';
import { sitemapXml } from './lib/page-seo';
import { pagesRouter } from './routes/pages';
import { searchRouter } from './routes/api/search';
import { ratingsRouter } from './routes/api/ratings';
import { tipsRouter } from './routes/api/tips';
import { newsletterRouter } from './routes/api/newsletter';
import { getSiteContext, type SiteContext } from './site/context';

type Env = {
  Bindings: {
    DB?: D1Database;
  };
  Variables: {
    site: SiteContext;
  };
};

const app = new Hono<Env>();

// Resolve site context from hostname
app.use('*', async (c, next) => {
  const host = c.req.header('host') ?? 'findernyc.com';
  c.set('site', getSiteContext(host));
  await next();
});

// SSR pages
app.route('/', pagesRouter);

// API
app.route('/api/search', searchRouter);
app.route('/api/ratings', ratingsRouter);
app.route('/api/tips', tipsRouter);
app.route('/api/newsletter', newsletterRouter);

// robots.txt
app.get('/robots.txt', (c) => {
  const site = c.get('site');
  return c.text(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
});

// Dynamic sitemap
app.get('/sitemap.xml', async (c) => {
  const db = c.env?.DB;
  const site = c.get('site');
  const entries = [
    { path: '/' },
    { path: '/hidden-gems' },
    { path: '/itineraries' },
    { path: '/neighborhoods' },
    { path: '/tips' },
    { path: '/about' },
    { path: '/privacy' },
    { path: '/terms' },
  ];

  let spots: { results?: unknown[] } = { results: [] };
  let guides: { results?: unknown[] } = { results: [] };

  if (db) {
    try {
      [spots, guides] = await Promise.all([
        db.prepare("SELECT slug, updated_at FROM spots WHERE published = 1").all(),
        db.prepare("SELECT slug, COALESCE(updated_at, published_at, created_at) AS last_modified FROM guides WHERE published = 1").all(),
      ]);
    } catch (error) {
      if (!isUnavailableD1Error(error)) {
        throw error;
      }
    }
  }

  return new Response(
    sitemapXml(site, [
      ...entries,
      ...(spots.results ?? []).map((spot: any) => ({ path: `/spots/${spot.slug}`, lastModified: spot.updated_at })),
      ...(guides.results ?? []).map((guide: any) => ({ path: `/guides/${guide.slug}`, lastModified: guide.last_modified })),
    ]),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
});

// llms.txt
app.get('/llms.txt', (c) => {
  const site = c.get('site');
  return c.text(`# ${site.name}\n\n> ${site.metaDescription}\n\n## URLs\n- ${site.url}/\n- ${site.url}/hidden-gems\n- ${site.url}/spots/{slug}\n- ${site.url}/guides/{slug}\n`);
});

app.get('/favicon.ico', (c) => c.redirect('/images/gem.svg', 302));

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: 'internal_error' }, 500);
});

export default app;
