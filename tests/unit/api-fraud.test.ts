import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index';
import { __resetFraudReviewQueueForTests } from '../../src/fraud/review-queue';

describe('Fraud review APIs', () => {
  beforeEach(() => {
    __resetFraudReviewQueueForTests();
  });

  it('returns 503 when fraud_risk_scoring feature flag is disabled', async () => {
    const dashboardRes = await app.request('/api/fraud/dashboard');
    expect(dashboardRes.status).toBe(503);

    const queueRes = await app.request('/api/fraud/review-queue');
    expect(queueRes.status).toBe(503);
  });

  it('populates review queue from risky search traffic and exposes dashboard slice', async () => {
    const searchRes = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'networking wire transfer crypto only guaranteed seat',
          limit: 6,
        }),
      },
      { FEATURE_FLAGS: 'unified_smart_search,fraud_risk_scoring' },
    );
    expect(searchRes.status).toBe(200);

    const queueRes = await app.request(
      '/api/fraud/review-queue?status=pending',
      undefined,
      { FEATURE_FLAGS: 'fraud_risk_scoring' },
    );
    expect(queueRes.status).toBe(200);
    const queueJson = await queueRes.json() as {
      success: true;
      items: Array<{
        event_id: string;
        status: string;
        risk_band: 'low' | 'medium' | 'high';
      }>;
    };
    expect(queueJson.items.length).toBeGreaterThan(0);
    expect(queueJson.items.every((item) => item.status === 'pending')).toBe(true);
    expect(queueJson.items.some((item) => item.risk_band === 'high' || item.risk_band === 'medium')).toBe(true);

    const dashboardRes = await app.request(
      '/api/fraud/dashboard',
      undefined,
      { FEATURE_FLAGS: 'fraud_risk_scoring' },
    );
    expect(dashboardRes.status).toBe(200);
    const dashboardJson = await dashboardRes.json() as {
      success: true;
      queue_size: number;
      pending_count: number;
      reviewed_count: number;
    };
    expect(dashboardJson.queue_size).toBeGreaterThan(0);
    expect(dashboardJson.pending_count).toBeGreaterThan(0);
    expect(dashboardJson.reviewed_count).toBe(0);
  });

  it('records false-positive outcomes and updates dashboard metrics', async () => {
    await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'networking wire transfer crypto only guaranteed seat',
          limit: 6,
        }),
      },
      { FEATURE_FLAGS: 'unified_smart_search,fraud_risk_scoring' },
    );

    const queueRes = await app.request(
      '/api/fraud/review-queue?status=pending&limit=1',
      undefined,
      { FEATURE_FLAGS: 'fraud_risk_scoring' },
    );
    const queueJson = await queueRes.json() as {
      success: true;
      items: Array<{ event_id: string }>;
    };
    const eventId = queueJson.items[0]?.event_id;
    expect(eventId).toBeTruthy();

    const decisionRes = await app.request(
      `/api/fraud/review-queue/${eventId}/decision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'false_positive',
          reviewer: 'ops_tester',
          notes: 'Legitimate organizer, manual confirmation completed.',
        }),
      },
      { FEATURE_FLAGS: 'fraud_risk_scoring' },
    );
    expect(decisionRes.status).toBe(200);

    const dashboardRes = await app.request(
      '/api/fraud/dashboard',
      undefined,
      { FEATURE_FLAGS: 'fraud_risk_scoring' },
    );
    const dashboardJson = await dashboardRes.json() as {
      success: true;
      reviewed_count: number;
      false_positive_count: number;
      false_positive_rate: number;
      outcomes: { false_positive: number };
    };
    expect(dashboardJson.reviewed_count).toBeGreaterThanOrEqual(1);
    expect(dashboardJson.false_positive_count).toBeGreaterThanOrEqual(1);
    expect(dashboardJson.false_positive_rate).toBeGreaterThan(0);
    expect(dashboardJson.outcomes.false_positive).toBeGreaterThanOrEqual(1);
  });
});
