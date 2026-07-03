import { describe, expect, it } from 'vitest';
import app from '../../src/index';

function createSearchDb(): D1Database {
  return {
    prepare(sql: string) {
      const statement = {
        bind() {
          return statement;
        },
        async all() {
          if (sql.includes('FROM spots_fts') && sql.includes('LIMIT 20')) {
            return {
              results: [
                {
                  slug: 'lic-landing-rooftop',
                  title: 'Secret Rooftop in Queens With Zero Tourists',
                  name: 'LIC Landing',
                  neighborhood: 'Long Island City',
                  borough: 'queens',
                  category: 'rooftop',
                  one_liner: 'Waterfront beer garden with skyline views.',
                  price_level: 2,
                  photo_url: null,
                  subway: '7 train',
                  avg_rating: 4.8,
                  rating_count: 19,
                },
              ],
            };
          }

          if (sql.includes('FROM guides')) {
            return {
              results: [
                {
                  slug: 'queens-waterfront-guide',
                  title: 'Queens Waterfront Guide',
                  excerpt: 'Where to go for skyline views without tourist energy.',
                  cover_photo_url: null,
                  type: 'guide',
                },
              ],
            };
          }

          if (sql.includes('LIMIT 5')) {
            return {
              results: [
                {
                  name: 'LIC Landing',
                  slug: 'lic-landing-rooftop',
                  neighborhood: 'Long Island City',
                  category: 'rooftop',
                },
              ],
            };
          }

          return { results: [] };
        },
        async first() {
          return { total: 1 };
        },
      };

      return statement;
    },
  } as unknown as D1Database;
}

describe('search API', () => {
  it('returns search results for a full-text query', async () => {
    const res = await app.request('/api/search?q=rooftop', undefined, { DB: createSearchDb() });
    expect(res.status).toBe(200);

    const json = await res.json() as {
      spots: Array<{ slug: string }>;
      guides: Array<{ slug: string }>;
      total: number;
    };

    expect(json.total).toBe(1);
    expect(json.spots[0]?.slug).toBe('lic-landing-rooftop');
    expect(json.guides[0]?.slug).toBe('queens-waterfront-guide');
  });

  it('returns empty suggestions when query is too short', async () => {
    const res = await app.request('/api/search/suggest?q=r', undefined, { DB: createSearchDb() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ spots: [], guides: [], neighborhoods: [] });
  });
});
