import { Hono } from 'hono';
import { pagesRouter } from './routes/pages';
import { searchRouter } from './routes/api/search';
import { ratingsRouter } from './routes/api/ratings';
import { tipsRouter } from './routes/api/tips';
import { newsletterRouter } from './routes/api/newsletter';
import { SITE_URL, SITE_NAME, getSiteContext, type SiteContext } from './templates/layout';

type Env = {
  Bindings: {
    DB: D1Database;
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

// Static pages (placeholder for now)
app.get('/about', (c) => {
  const site = c.get('site');
  return c.html(`<!DOCTYPE html><html lang="en"><head><title>About ${site.name}</title></head><body><h1>About ${site.name}</h1><p>Coming soon.</p></body></html>`);
});
app.get('/privacy', (c) => c.text('Privacy Policy — coming soon.'));
app.get('/terms', (c) => c.text('Terms of Service — coming soon.'));

// robots.txt
app.get('/robots.txt', (c) => {
  const site = c.get('site');
  return c.text(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
});

// Dynamic sitemap
app.get('/sitemap.xml', async (c) => {
  const db = c.env.DB;
  const site = c.get('site');
  const spots = await db.prepare("SELECT slug FROM spots WHERE published = 1").all();
  const guides = await db.prepare("SELECT slug FROM guides WHERE published = 1").all();
  const urls = [
    `<url><loc>${site.url}/</loc></url>`,
    `<url><loc>${site.url}/search</loc></url>`,
    ...(spots.results ?? []).map((s: any) => `<url><loc>${site.url}/spots/${s.slug}</loc></url>`),
    ...(guides.results ?? []).map((g: any) => `<url><loc>${site.url}/guides/${g.slug}</loc></url>`),
  ].join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
});

// llms.txt
app.get('/llms.txt', (c) => {
  const site = c.get('site');
  return c.text(`# ${site.name}\n\n> ${site.metaDescription}\n\n## URLs\n- ${site.url}/\n- ${site.url}/search\n- ${site.url}/spots/{slug}\n- ${site.url}/guides/{slug}\n`);
});

app.get('/favicon.ico', (c) => c.redirect('/images/placeholder.svg', 302));

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: 'internal_error' }, 500);
});

export default app;
