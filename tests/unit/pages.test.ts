import { describe, expect, it } from 'vitest';
import app from '../../src/index';

function createPagesDb(): D1Database {
  return {
    prepare(sql: string) {
      const statement = {
        bind() {
          return statement;
        },
        async all() {
          if (sql.includes('FROM spots s') && sql.includes('LIMIT 5')) {
            return {
              results: [
                {
                  slug: 'lic-landing-rooftop',
                  title: 'Secret Rooftop in Queens With Zero Tourists',
                  neighborhood: 'Long Island City',
                  category: 'rooftop',
                  one_liner: 'Waterfront beer garden with skyline views.',
                  photo_url: null,
                  avg_rating: 4.8,
                  rating_count: 19,
                },
              ],
            };
          }

          if (sql.includes('FROM neighborhoods n')) {
            return {
              results: [
                {
                  slug: 'long-island-city',
                  name: 'Long Island City',
                  borough: 'Queens',
                  vibe: 'Waterfront and low-key at sunset.',
                  photo_url: null,
                  spot_count: 4,
                },
              ],
            };
          }

          if (sql.includes('FROM guides') && sql.includes('LIMIT 24')) {
            return {
              results: [
                {
                  slug: 'queens-waterfront-guide',
                  title: 'Queens Waterfront Guide',
                  excerpt: 'Where to go for skyline views without tourist energy.',
                  cover_photo_url: null,
                },
              ],
            };
          }

          return { results: [] };
        },
        async first() {
          if (sql.includes('FROM guides')) {
            return {
              slug: 'queens-waterfront-guide',
              title: 'Queens Waterfront Guide',
              excerpt: 'Where to go for skyline views without tourist energy.',
              body_html: '<p>Start at the waterfront and work backwards into the neighborhood.</p>',
              cover_photo_url: null,
            };
          }

          if (sql.includes('FROM spots s')) {
            return {
              id: 1,
              name: 'LIC Landing',
              slug: 'lic-landing-rooftop',
              title: 'Secret Rooftop in Queens With Zero Tourists',
              neighborhood: 'Long Island City',
              borough: 'queens',
              category: 'rooftop',
              description: 'A great sunset spot.',
              one_liner: 'Waterfront beer garden with skyline views.',
              pro_tip: 'Arrive before sunset.',
              subway: '7 train',
              while_here: 'Walk Gantry Plaza.',
              best_time: 'Sunset',
              avoid_time: null,
              budget_note: '$$',
              vibe_tags: '["sunset","waterfront"]',
              price_level: 2,
              latitude: null,
              longitude: null,
              google_maps_url: null,
              photo_url: null,
              avg_rating: 4.8,
              rating_count: 19,
            };
          }

          return { total: 1 };
        },
      };

      return statement;
    },
  } as unknown as D1Database;
}

describe('public pages', () => {
  it('serves landing, hidden gems, itineraries, and neighborhoods pages', async () => {
    const env = { DB: createPagesDb() };

    const home = await app.request('/', undefined, env);
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('Skip the tourist traps.');

    const hiddenGems = await app.request('/hidden-gems', undefined, env);
    expect(hiddenGems.status).toBe(200);

    const itineraries = await app.request('/itineraries', undefined, env);
    expect(itineraries.status).toBe(200);
    expect(await itineraries.text()).toContain('Queens Waterfront Guide');

    const neighborhoods = await app.request('/neighborhoods', undefined, env);
    expect(neighborhoods.status).toBe(200);
    expect(await neighborhoods.text()).toContain('Long Island City');
  });

  it('serves guide and spot detail pages', async () => {
    const env = { DB: createPagesDb() };

    const guide = await app.request('/guides/queens-waterfront-guide', undefined, env);
    expect(guide.status).toBe(200);
    expect(await guide.text()).toContain('Start at the waterfront');

    const spot = await app.request('/spots/lic-landing-rooftop', undefined, env);
    expect(spot.status).toBe(200);
    const spotHtml = await spot.text();
    expect(spotHtml).toContain('Arrive before sunset');
    expect(spotHtml).toContain('Map');
    expect(spotHtml).toContain('Open in Google Maps');
  });

  it('serves public static pages and crawl hints', async () => {
    const about = await app.request('/about');
    const tips = await app.request('/tips');
    const privacy = await app.request('/privacy');
    const terms = await app.request('/terms');
    const robots = await app.request('/robots.txt');
    const llms = await app.request('/llms.txt');
    const sitemap = await app.request('/sitemap.xml');

    expect(about.status).toBe(200);
    expect(tips.status).toBe(200);
    expect(privacy.status).toBe(200);
    expect(terms.status).toBe(200);
    expect((await robots.text())).toContain('Sitemap: https://findernyc.com/sitemap.xml');
    expect((await llms.text())).toContain('# FinderNYC');
    expect((await sitemap.text())).toContain('<loc>https://findernyc.com/itineraries</loc>');
  });
});
