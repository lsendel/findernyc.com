import { describe, it, expect } from 'vitest';
import app from '../../src/index';

describe('availability sync API', () => {
  it('returns 503 when realtime_availability_sync flag is disabled', async () => {
    const res = await app.request('/api/availability/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [{ event_id: 'evt_sync_001', status: 'available' }],
      }),
    });

    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('feature_disabled');
  });

  it('returns 422 when status and seat counts are both missing', async () => {
    const res = await app.request(
      '/api/availability/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ event_id: 'evt_sync_001' }],
        }),
      },
      { FEATURE_FLAGS: 'realtime_availability_sync' },
    );

    expect(res.status).toBe(422);
  });

  it('accepts updates and derives status from seat counts', async () => {
    const res = await app.request(
      '/api/availability/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ event_id: 'evt_sync_001', seats_total: 100, seats_remaining: 5 }],
        }),
      },
      { FEATURE_FLAGS: 'realtime_availability_sync' },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      processed: number;
      items: Array<{ event_id: string; status: string; seats_remaining?: number }>;
    };
    expect(json.success).toBe(true);
    expect(json.processed).toBe(1);
    expect(json.items[0]?.event_id).toBe('evt_sync_001');
    expect(json.items[0]?.status).toBe('limited');
    expect(json.items[0]?.seats_remaining).toBe(5);
  });

  it('returns 503 for webhook when token is not configured', async () => {
    const res = await app.request(
      '/api/availability/webhook/provider-a',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ id: 'evt_sync_001', status: 'available' }],
        }),
      },
      { FEATURE_FLAGS: 'realtime_availability_sync' },
    );

    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('webhook_token_not_configured');
  });

  it('returns 401 for webhook when token is invalid', async () => {
    const res = await app.request(
      '/api/availability/webhook/provider-a',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-inventory-token': 'wrong-token',
        },
        body: JSON.stringify({
          records: [{ id: 'evt_sync_001', status: 'available' }],
        }),
      },
      {
        FEATURE_FLAGS: 'realtime_availability_sync',
        INVENTORY_WEBHOOK_TOKEN: 'expected-token',
      },
    );

    expect(res.status).toBe(401);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('unauthorized_webhook');
  });

  it('accepts webhook payload with provider records', async () => {
    const res = await app.request(
      '/api/availability/webhook/provider-a',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-inventory-token': 'expected-token',
        },
        body: JSON.stringify({
          sent_at: '2026-02-28T07:00:00.000Z',
          records: [
            {
              id: 'evt_sync_002',
              availability: 'sold_out',
              seats: { total: 50, remaining: 0 },
            },
          ],
        }),
      },
      {
        FEATURE_FLAGS: 'realtime_availability_sync',
        INVENTORY_WEBHOOK_TOKEN: 'expected-token',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      provider: string;
      processed: number;
      items: Array<{ event_id: string; status: string; seats_total?: number; seats_remaining?: number }>;
    };
    expect(json.success).toBe(true);
    expect(json.provider).toBe('provider-a');
    expect(json.processed).toBe(1);
    expect(json.items[0]?.event_id).toBe('evt_sync_002');
    expect(json.items[0]?.status).toBe('sold_out');
    expect(json.items[0]?.seats_total).toBe(50);
    expect(json.items[0]?.seats_remaining).toBe(0);
  });
});
