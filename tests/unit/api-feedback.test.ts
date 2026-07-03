import { describe, expect, it } from 'vitest';
import app from '../../src/index';

function createMockDb(): D1Database {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async run() {
          return {};
        },
        async first() {
          return null;
        },
      };
    },
  } as unknown as D1Database;
}

describe('feedback APIs', () => {
  it('accepts newsletter signups', async () => {
    const res = await app.request(
      '/api/newsletter',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'hello@example.com' }),
      },
      { DB: createMockDb() },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: 'Subscribed!' });
  });

  it('accepts spot ratings', async () => {
    const res = await app.request(
      '/api/ratings',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot_id: 1, score: 5, session_id: 'sess_1' }),
      },
      { DB: createMockDb() },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('accepts local tips', async () => {
    const res = await app.request(
      '/api/tips',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot_id: 1, text: 'Go right before sunset for the best light.' }),
      },
      { DB: createMockDb() },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
