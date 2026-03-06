import { describe, it, expect } from 'vitest';
import app from '../../src/index';

describe('SEO routes', () => {
  it('serves robots.txt with sitemap reference', async () => {
    const res = await app.request('/robots.txt');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Sitemap: https://findernyc.com/sitemap.xml');
  });

  it('serves llms.txt with crawl hints for language models', async () => {
    const res = await app.request('/llms.txt');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('# LocalGems');
    expect(text).toContain('local event discovery');
    expect(text).toContain('Retrieval Guidance');
    expect(text).toContain('/analytics');
  });

  it('serves sitemap.xml with landing page URL', async () => {
    const res = await app.request('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');
    const xml = await res.text();
    expect(xml).toContain('<loc>https://findernyc.com/</loc>');
    expect(xml).toContain('<loc>https://findernyc.com/contact</loc>');
    expect(xml).toContain('<loc>https://findernyc.com/about</loc>');
    expect(xml).toContain('<loc>https://findernyc.com/blog/local-event-discovery-guide</loc>');
    expect(xml).toContain('<lastmod>2026-03-04</lastmod>');
    expect(xml).toContain('<lastmod>2026-02-27</lastmod>');
  });

  it('serves key SEO content pages', async () => {
    const paths = [
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/cookies',
      '/blog',
      '/press',
      '/blog/local-event-discovery-guide',
      '/blog/google-event-seo-for-local-businesses',
      '/blog/llm-search-content-for-event-pages',
    ];

    for (const path of paths) {
      const res = await app.request(path);
      expect(res.status).toBe(200);
    }
  });

  it('serves contact page with waitlist form', async () => {
    const res = await app.request('/contact');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="contact-form"');
    expect(html).toContain('Join Waitlist');
  });

  it('keeps ops workspace disabled when no token is configured', async () => {
    const res = await app.request('/ops');
    expect(res.status).toBe(503);
    const message = await res.text();
    expect(message).toContain('Ops workspace is disabled');
  });

  it('requires token for ops workspace when OPS_ACCESS_TOKEN is configured', async () => {
    const unauthorized = await app.request('/ops', undefined, {
      OPS_ACCESS_TOKEN: 'top-secret-token',
    });
    expect(unauthorized.status).toBe(401);

    const authorized = await app.request('/ops?token=top-secret-token', undefined, {
      OPS_ACCESS_TOKEN: 'top-secret-token',
    });
    expect(authorized.status).toBe(200);
  });
});
