import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateWebhookNonce,
  requestAssignPartnerRole,
  requestAvailabilityWebhook,
  requestFraudReviewDecision,
  requestFraudReviewQueue,
  requestInsightsHub,
  requestSaveUserDashboard,
  requestSignedWebhookEvent,
  requestUpdatePartnerPortalConfig,
} from '../../src/assets/js/ops-api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ops api client', () => {
  it('requests insights hub with configured window', async () => {
    const fetchMock = vi.fn(async () => ({ status: 200, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await requestInsightsHub(21);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('/api/dashboards/insights/hub?window_days=21', expect.objectContaining({ method: 'GET' }));
  });

  it('serializes save dashboard payload with generated card', async () => {
    const fetchMock = vi.fn(async () => ({ status: 201, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);

    await requestSaveUserDashboard({
      owner_id: 'owner_1',
      name: 'Weekly KPI',
      metric: 'search_clicks',
      visualization: 'line',
      window_days: 14,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/dashboards', expect.objectContaining({ method: 'POST' }));
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(firstCall[1].body));
    expect(body.owner_id).toBe('owner_1');
    expect(body.name).toBe('Weekly KPI');
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0].metric).toBe('search_clicks');
    expect(body.cards[0].title).toBe('search clicks (14d)');
  });

  it('sends partner role assignment and portal config update payloads', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await requestAssignPartnerRole({
      workspace_id: 'wksp_5',
      member_id: 'member 1',
      role_id: 'analyst',
      assigned_by: 'admin@example.com',
    });

    await requestUpdatePartnerPortalConfig({
      tenant_id: 'tenant_9',
      brand_name: 'Finder Pro',
      theme: { primary_color: '#123456', accent_color: '#abcdef' },
      feature_overrides: { ai_follow_up_automation: true },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/partners/workspaces/wksp_5/members/member%201/role',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/partners/portals/tenant_9/config',
      expect.objectContaining({ method: 'PUT' }),
    );

    const assignCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const assignBody = JSON.parse(String(assignCall[1].body));
    expect(assignBody).toEqual({ role_id: 'analyst', assigned_by: 'admin@example.com' });

    const portalCall = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    const portalBody = JSON.parse(String(portalCall[1].body));
    expect(portalBody.brand_name).toBe('Finder Pro');
    expect(portalBody.theme.primary_color).toBe('#123456');
  });

  it('sends availability webhook with token header and record payload', async () => {
    const fetchMock = vi.fn(async () => ({ status: 202, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);

    await requestAvailabilityWebhook({
      provider: 'eventbrite',
      token: 'inv_token_1',
      sent_at: '2026-03-05T13:00:00.000Z',
      records: [{
        id: 'evt_1',
        availability: 'limited',
        seats: { total: 100, remaining: 8 },
      }],
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/availability/webhook/eventbrite', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'x-inventory-token': 'inv_token_1',
      }),
    }));

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body.records).toHaveLength(1);
    expect(body.sent_at).toBe('2026-03-05T13:00:00.000Z');
  });

  it('requests fraud review queue and sends decision payload', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await requestFraudReviewQueue({ status: 'pending', limit: 7 });
    await requestFraudReviewDecision({
      event_id: 'evt 77',
      decision: 'cleared',
      reviewer: 'qa@example.com',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/fraud/review-queue?status=pending&limit=7', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/fraud/review-queue/evt%2077/decision', expect.objectContaining({ method: 'POST' }));

    const decisionCall = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    const decisionBody = JSON.parse(String(decisionCall[1].body));
    expect(decisionBody).toEqual({ decision: 'cleared', reviewer: 'qa@example.com' });
  });

  it('generates nonce and signs webhook requests', async () => {
    const digestBytes = new Uint8Array([0, 1, 2, 3]).buffer;
    vi.stubGlobal('crypto', {
      randomUUID: () => 'uuid_1234',
      subtle: {
        digest: vi.fn(async () => digestBytes),
      },
    });
    const fetchMock = vi.fn(async () => ({ status: 202, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);

    expect(generateWebhookNonce()).toBe('nonce_uuid_1234');

    await requestSignedWebhookEvent({
      partner: 'partner 1',
      shared_secret: 'secret',
      event_id: 'evt_1',
      event_type: 'availability_sync',
      event_payload: { seats: 9 },
      timestamp: '1700000000',
      nonce: 'nonce_abc',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/integrations/webhooks/partner%201/events', expect.objectContaining({ method: 'POST' }));

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['x-webhook-signature']).toBe('00010203');
    expect(headers['x-webhook-timestamp']).toBe('1700000000');
    expect(headers['x-webhook-nonce']).toBe('nonce_abc');
    const body = JSON.parse(String(call[1].body));
    expect(body).toEqual({
      event_id: 'evt_1',
      event_type: 'availability_sync',
      payload: { seats: 9 },
    });
  });
});
