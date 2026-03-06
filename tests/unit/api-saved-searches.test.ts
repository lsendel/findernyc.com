import { afterEach, describe, it, expect, vi } from 'vitest';
import app from '../../src/index';
import { __resetSavedSearchesStubStateForTests } from '../../src/routes/api/saved-searches';

afterEach(() => {
  vi.unstubAllGlobals();
  __resetSavedSearchesStubStateForTests();
});

async function createSavedSearchStub() {
  const res = await app.request(
    '/api/saved-searches',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_text: 'free jazz in brooklyn',
        filters: { borough: 'brooklyn', category: 'music' },
        channel: 'email',
      }),
    },
    { FEATURE_FLAGS: 'saved_searches_alerts' },
  );
  const json = await res.json() as { success: boolean; id: number; delivery: string };
  return { status: res.status, body: json, id: json.id };
}

describe('saved searches API', () => {
  it('returns 503 when feature is disabled', async () => {
    const res = await app.request('/api/saved-searches', undefined, { FEATURE_FLAGS: '-saved_searches_alerts' });
    expect(res.status).toBe(503);
  });

  it('creates saved search in stub mode when enabled without DB', async () => {
    const created = await createSavedSearchStub();

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.id).toBeGreaterThan(0);
    expect(created.body.delivery).toBe('stub');
  });

  it('lists created saved searches in stub mode', async () => {
    await createSavedSearchStub();
    const res = await app.request('/api/saved-searches', undefined, { FEATURE_FLAGS: 'saved_searches_alerts' });
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; items: Array<{ id: number; query_text: string }> };
    expect(json.success).toBe(true);
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0]?.id).toBeGreaterThan(0);
    expect(json.items[0]?.query_text).toContain('jazz');
  });

  it('returns 422 on invalid saved-search body', async () => {
    const res = await app.request(
      '/api/saved-searches',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_text: '' }),
      },
      { FEATURE_FLAGS: 'saved_searches_alerts' },
    );
    expect(res.status).toBe(422);
  });

  it('sends alert in stub mode for valid id', async () => {
    const { id } = await createSavedSearchStub();
    const res = await app.request(
      `/api/saved-searches/${id}/send-alert`,
      { method: 'POST' },
      { FEATURE_FLAGS: 'saved_searches_alerts' },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      delivery: string;
      provider: string;
      attempt_count: number;
      selected_channel?: string;
      channel_attempts?: Array<{ channel: string }>;
      slo_alerts?: string[];
    };
    expect(json.success).toBe(true);
    expect(json.delivery).toBe('stub');
    expect(json.provider).toContain('stub');
    expect(json.attempt_count).toBe(0);
    expect(json.selected_channel).toBe('email');
    expect(json.channel_attempts?.[0]?.channel).toBe('email');
    expect(Array.isArray(json.slo_alerts)).toBe(true);
  });

  it('fails over channels when multi_channel_notifications is enabled', async () => {
    const { id } = await createSavedSearchStub();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('email down', { status: 503 }))
      .mockResolvedValueOnce(new Response('sms ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request(
      `/api/saved-searches/${id}/send-alert`,
      { method: 'POST' },
      {
        FEATURE_FLAGS: 'saved_searches_alerts,multi_channel_notifications',
        ALERT_EMAIL_WEBHOOK_URL: 'https://email.example.com/alerts',
        ALERT_SMS_WEBHOOK_URL: 'https://sms.example.com/alerts',
        ALERT_FALLBACK_CHANNELS: 'sms',
        ALERT_MAX_RETRIES: '1',
        ALERT_RETRY_BASE_MS: '1',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      selected_channel: string;
      channel_attempts: Array<{ channel: string; success: boolean }>;
      slo_alerts: string[];
    };
    expect(json.success).toBe(true);
    expect(json.selected_channel).toBe('sms');
    expect(json.channel_attempts).toHaveLength(2);
    expect(json.channel_attempts[0]?.channel).toBe('email');
    expect(json.channel_attempts[0]?.success).toBe(false);
    expect(json.channel_attempts[1]?.channel).toBe('sms');
    expect(json.slo_alerts).toContain('failover_triggered');
  });

  it('lists delivery attempts in stub mode', async () => {
    const { id } = await createSavedSearchStub();
    await app.request(
      `/api/saved-searches/${id}/send-alert`,
      { method: 'POST' },
      { FEATURE_FLAGS: 'saved_searches_alerts' },
    );
    const res = await app.request(
      `/api/saved-searches/${id}/delivery-attempts`,
      undefined,
      { FEATURE_FLAGS: 'saved_searches_alerts' },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; items: unknown[] };
    expect(json.success).toBe(true);
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 422 for invalid delivery-attempts id', async () => {
    const res = await app.request(
      '/api/saved-searches/not-a-number/delivery-attempts',
      undefined,
      { FEATURE_FLAGS: 'saved_searches_alerts' },
    );
    expect(res.status).toBe(422);
  });

  it('returns 503 for delivery-attempts when feature is disabled', async () => {
    const res = await app.request('/api/saved-searches/12/delivery-attempts', undefined, { FEATURE_FLAGS: '-saved_searches_alerts' });
    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('feature_disabled');
  });
});
