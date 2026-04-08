import { Hono } from 'hono';
import { pagesRouter } from './routes/pages';
import { searchRouter } from './routes/api/search';
import { ratingsRouter } from './routes/api/ratings';
import { tipsRouter } from './routes/api/tips';
import { newsletterRouter } from './routes/api/newsletter';
import { SITE_URL, SITE_NAME } from './templates/layout';

type Env = {
  Bindings: {
    DB: D1Database;
  };
};

const app = new Hono<Env>();

// SSR pages
app.route('/', pagesRouter);

// API
app.route('/api/search', searchRouter);
app.route('/api/ratings', ratingsRouter);
app.route('/api/tips', tipsRouter);
app.route('/api/newsletter', newsletterRouter);

// Static pages (placeholder for now)
app.get('/about', (c) => c.html(`<!DOCTYPE html><html lang="en"><head><title>About ${SITE_NAME}</title></head><body><h1>About</h1><p>Coming soon.</p></body></html>`));
app.get('/privacy', (c) => c.text('Privacy Policy — coming soon.'));
app.get('/terms', (c) => c.text('Terms of Service — coming soon.'));

// robots.txt
app.get('/robots.txt', (c) => c.text(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`));

// Dynamic sitemap
app.get('/sitemap.xml', async (c) => {
  const db = c.env.DB;
  const spots = await db.prepare("SELECT slug FROM spots WHERE published = 1").all();
  const guides = await db.prepare("SELECT slug FROM guides WHERE published = 1").all();
  const urls = [
    `<url><loc>${SITE_URL}/</loc></url>`,
    `<url><loc>${SITE_URL}/search</loc></url>`,
    ...(spots.results ?? []).map((s: any) => `<url><loc>${SITE_URL}/spots/${s.slug}</loc></url>`),
    ...(guides.results ?? []).map((g: any) => `<url><loc>${SITE_URL}/guides/${g.slug}</loc></url>`),
  ].join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
});

// llms.txt
app.get('/llms.txt', (c) => c.text(`# ${SITE_NAME}\n\n> NYC hidden gems and local recommendations. Skip the tourist traps.\n\n## URLs\n- ${SITE_URL}/\n- ${SITE_URL}/search\n- ${SITE_URL}/spots/{slug}\n- ${SITE_URL}/guides/{slug}\n`));

app.get('/favicon.ico', (c) => c.redirect('/images/placeholder.svg', 302));

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: 'internal_error' }, 500);
});

export default app;
