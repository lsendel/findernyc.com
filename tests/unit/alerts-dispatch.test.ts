import { describe, it, expect, vi, afterEach } from 'vitest';
import { dispatchSavedSearchAlert, dispatchSavedSearchAlertWithFailover } from '../../src/notifications/alerts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saved-search alert dispatcher', () => {
  it('returns stub dispatch when webhook is not configured', async () => {
    const result = await dispatchSavedSearchAlert(
      {
        channel: 'email',
        query_text: 'free jazz in brooklyn',
        destination: 'test@example.com',
        saved_search_id: 12,
      },
      {},
    );

    expect(result.success).toBe(true);
    expect(result.delivery).toBe('stub');
    expect(result.provider).toBe('email-stub');
    expect(result.attempt_count).toBe(0);
  });

  it('retries retryable provider responses until success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('upstream error', { status: 500 }))
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await dispatchSavedSearchAlert(
      {
        channel: 'email',
        query_text: 'jazz in brooklyn',
        saved_search_id: 7,
      },
      {
        ALERT_EMAIL_WEBHOOK_URL: 'https://example.com/email-alert',
        ALERT_MAX_RETRIES: '3',
        ALERT_RETRY_BASE_MS: '1',
      },
    );

    expect(result.success).toBe(true);
    expect(result.delivery).toBe('queued');
    expect(result.attempt_count).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable 4xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await dispatchSavedSearchAlert(
      {
        channel: 'sms',
        query_text: 'food in queens',
        saved_search_id: 9,
      },
      {
        ALERT_SMS_WEBHOOK_URL: 'https://example.com/sms-alert',
        ALERT_MAX_RETRIES: '4',
        ALERT_RETRY_BASE_MS: '1',
      },
    );

    expect(result.success).toBe(false);
    expect(result.attempt_count).toBe(1);
    expect(result.error).toBe('provider_http_400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('applies provider auth header and custom provider name for production endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await dispatchSavedSearchAlert(
      {
        channel: 'push',
        query_text: 'late night comedy',
        saved_search_id: 18,
      },
      {
        ALERT_PUSH_ENDPOINT_URL: 'https://push.example.com/alerts',
        ALERT_PUSH_PROVIDER_NAME: 'onesignal',
        ALERT_PUSH_WEBHOOK_AUTH_TOKEN: 'push-secret-token',
        ALERT_MAX_RETRIES: '1',
      },
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('onesignal');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual(expect.objectContaining({
      Authorization: 'Bearer push-secret-token',
      'X-Alert-Provider': 'onesignal',
    }));
  });

  it('fails over to configured fallback channel and raises failover SLO alert', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('provider down', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await dispatchSavedSearchAlertWithFailover(
      {
        channel: 'email',
        query_text: 'family events',
        saved_search_id: 22,
      },
      {
        ALERT_EMAIL_WEBHOOK_URL: 'https://email.example.com/alerts',
        ALERT_SMS_WEBHOOK_URL: 'https://sms.example.com/alerts',
        ALERT_FALLBACK_CHANNELS: 'sms,push',
        ALERT_MAX_RETRIES: '1',
        ALERT_RETRY_BASE_MS: '1',
        ALERT_DELIVERY_SLO_MS: '1',
      },
      { enableFailover: true },
    );

    expect(result.success).toBe(true);
    expect(result.selected_channel).toBe('sms');
    expect(result.channel_attempts).toHaveLength(2);
    expect(result.channel_attempts[0].channel).toBe('email');
    expect(result.channel_attempts[1].channel).toBe('sms');
    expect(result.slo_alerts).toContain('failover_triggered');
  });
});
