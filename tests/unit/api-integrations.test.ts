import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index';
import { __resetWebhookReplayStateForTests } from '../../src/routes/api/integrations';

async function signature(secret: string, timestamp: string, nonce: string, body: string): Promise<string> {
  const payload = `${secret}.${timestamp}.${nonce}.${body}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('Integration webhook access API routes (week 22)', () => {
  beforeEach(() => {
    __resetWebhookReplayStateForTests();
  });

  it('returns 503 when api_webhook_access is disabled', async () => {
    const res = await app.request('/api/integrations/webhooks/partner-a/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: 'evt_1', event_type: 'created', payload: {} }),
    });
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('feature_disabled');
  });

  it('returns 503 when webhook secret is not configured', async () => {
    const res = await app.request(
      '/api/integrations/webhooks/partner-a/events',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: 'evt_1', event_type: 'created', payload: {} }),
      },
      { FEATURE_FLAGS: 'api_webhook_access' },
    );
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('webhook_secret_not_configured');
  });

  it('accepts signed webhook payload and rejects replay', async () => {
    const secret = 'top-secret';
    const timestamp = String(Date.now());
    const nonce = 'nonce-abc-123';
    const rawBody = JSON.stringify({
      event_id: 'evt_webhook_1',
      event_type: 'booking.created',
      payload: { booking_id: 'bk_1', amount: 120 },
    });
    const signed = await signature(secret, timestamp, nonce, rawBody);

    const first = await app.request(
      '/api/integrations/webhooks/partner-a/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signed,
          'x-webhook-timestamp': timestamp,
          'x-webhook-nonce': nonce,
        },
        body: rawBody,
      },
      {
        FEATURE_FLAGS: 'api_webhook_access',
        PARTNER_WEBHOOK_SECRET: secret,
      },
    );

    expect(first.status).toBe(202);
    const firstBody = await first.json() as {
      success: boolean;
      partner: string;
      replay_protection: { nonce: string };
    };
    expect(firstBody.success).toBe(true);
    expect(firstBody.partner).toBe('partner-a');
    expect(firstBody.replay_protection.nonce).toBe(nonce);

    const replay = await app.request(
      '/api/integrations/webhooks/partner-a/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signed,
          'x-webhook-timestamp': timestamp,
          'x-webhook-nonce': nonce,
        },
        body: rawBody,
      },
      {
        FEATURE_FLAGS: 'api_webhook_access',
        PARTNER_WEBHOOK_SECRET: secret,
      },
    );

    expect(replay.status).toBe(409);
    const replayBody = await replay.json() as { success: boolean; error: string };
    expect(replayBody.success).toBe(false);
    expect(replayBody.error).toBe('replay_detected');
  });

  it('returns 401 for invalid signature', async () => {
    const secret = 'top-secret';
    const timestamp = String(Date.now());
    const nonce = 'nonce-invalid-signature';
    const rawBody = JSON.stringify({
      event_id: 'evt_webhook_2',
      event_type: 'booking.updated',
      payload: { booking_id: 'bk_2' },
    });
    const wrongSignature = await signature('wrong-secret', timestamp, nonce, rawBody);

    const res = await app.request(
      '/api/integrations/webhooks/partner-a/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': wrongSignature,
          'x-webhook-timestamp': timestamp,
          'x-webhook-nonce': nonce,
        },
        body: rawBody,
      },
      {
        FEATURE_FLAGS: 'api_webhook_access',
        PARTNER_WEBHOOK_SECRET: secret,
      },
    );

    expect(res.status).toBe(401);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('invalid_signature');
  });

  it('returns 422 for invalid webhook payload', async () => {
    const secret = 'top-secret';
    const timestamp = String(Date.now());
    const nonce = 'nonce-invalid-body';
    const rawBody = JSON.stringify({
      event_type: 'booking.updated',
      payload: { booking_id: 'bk_2' },
    });
    const signed = await signature(secret, timestamp, nonce, rawBody);

    const res = await app.request(
      '/api/integrations/webhooks/partner-a/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signed,
          'x-webhook-timestamp': timestamp,
          'x-webhook-nonce': nonce,
        },
        body: rawBody,
      },
      {
        FEATURE_FLAGS: 'api_webhook_access',
        PARTNER_WEBHOOK_SECRET: secret,
      },
    );

    expect(res.status).toBe(422);
  });
});
