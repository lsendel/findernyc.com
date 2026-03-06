import { describe, it, expect } from 'vitest';
import app from '../../src/index';

describe('POST /api/search', () => {
  it('returns 503 when unified_smart_search flag is disabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'free jazz in brooklyn' }),
      },
      { FEATURE_FLAGS: '-unified_smart_search' },
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: 'feature_disabled' });
  });

  it('returns ranked results when unified_smart_search flag is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'free jazz in brooklyn', limit: 5 }),
      },
      { FEATURE_FLAGS: 'unified_smart_search' },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      inferred_filters: Record<string, unknown>;
      results: Array<{ borough: string; category: string; price: number }>;
      total: number;
    };

    expect(json.success).toBe(true);
    expect(json.inferred_filters.borough).toBe('brooklyn');
    expect(json.inferred_filters.category).toBe('music');
    expect(json.inferred_filters.max_price).toBe(0);
    expect(json.total).toBeGreaterThan(0);
    expect(json.results[0]?.borough).toBe('brooklyn');
  });

  it('applies explicit filters over inferred filters', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'jazz in brooklyn',
          filters: { borough: 'manhattan' },
        }),
      },
      { FEATURE_FLAGS: 'unified_smart_search' },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      applied_filters: { borough?: string };
      results: Array<{ borough: string }>;
    };

    expect(json.applied_filters.borough).toBe('manhattan');
    expect(json.results.every((item) => item.borough === 'manhattan')).toBe(true);
  });

  it('applies filter combinators for borough/category/price/time/walk together', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'brooklyn events',
          filters: {
            borough: 'brooklyn',
            category: 'arts',
            max_price: 12,
            starts_before_hour: 18,
            within_walk_minutes: 7,
          },
        }),
      },
      { FEATURE_FLAGS: 'unified_smart_search' },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      total: number;
      results: Array<{ id: string; borough: string; category: string }>;
    };
    expect(json.total).toBe(1);
    expect(json.results[0]?.id).toBe('evt_006');
    expect(json.results[0]?.borough).toBe('brooklyn');
    expect(json.results[0]?.category).toBe('arts');
  });

  it('returns zero matches for mutually exclusive filter combinators', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'events',
          filters: {
            borough: 'queens',
            category: 'music',
          },
        }),
      },
      { FEATURE_FLAGS: 'unified_smart_search' },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { total: number; results: Array<{ id: string }> };
    expect(json.total).toBe(0);
    expect(json.results).toEqual([]);
  });

  it('supports boundary values in filter combinators', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'events',
          filters: {
            max_price: 0,
            starts_before_hour: 23,
            within_walk_minutes: 9,
          },
        }),
      },
      { FEATURE_FLAGS: 'unified_smart_search' },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      total: number;
      results: Array<{ id: string; price: number; start_hour: number; walk_minutes: number }>;
    };
    expect(json.total).toBeGreaterThan(0);
    expect(json.results.every((item) => item.price === 0)).toBe(true);
    expect(json.results.every((item) => item.start_hour <= 23)).toBe(true);
    expect(json.results.every((item) => item.walk_minutes <= 9)).toBe(true);
  });

  it('returns 422 on invalid request payload', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
      },
      { FEATURE_FLAGS: 'unified_smart_search' },
    );

    expect(res.status).toBe(422);
  });

  it('applies behavioral boosts from env to tune ranking order', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'events', limit: 1 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search',
        SEARCH_BEHAVIORAL_BOOSTS_JSON: JSON.stringify({
          events: { evt_003: 4 },
        }),
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { results: Array<{ id: string }> };
    expect(json.results[0]?.id).toBe('evt_003');
  });

  it('includes availability metadata when realtime_availability_sync is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'brooklyn music', limit: 3 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,realtime_availability_sync',
        EVENT_AVAILABILITY_JSON: JSON.stringify([
          { event_id: 'evt_001', seats_total: 120, seats_remaining: 10 },
        ]),
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        availability?: { status: string; seats_total?: number; seats_remaining?: number; updated_at: string };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_001');
    expect(target).toBeTruthy();
    expect(target?.availability?.status).toBe('limited');
    expect(target?.availability?.seats_total).toBe(120);
    expect(target?.availability?.seats_remaining).toBe(10);
    expect(typeof target?.availability?.updated_at).toBe('string');
  });

  it('includes estimated price breakdown when price_transparency_breakdown is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'queens food', limit: 3 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,price_transparency_breakdown',
        PRICE_SERVICE_FEE_RATE: '0.1',
        PRICE_TAX_RATE: '0.1',
        PRICE_MIN_SERVICE_FEE: '1',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        price_breakdown?: {
          base_price: number;
          service_fee: number;
          tax: number;
          total_price: number;
          currency: string;
          pricing_profile?: { scope: string; organizer_id?: string };
        };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_003');
    expect(target).toBeTruthy();
    expect(target?.price_breakdown?.base_price).toBe(10);
    expect(target?.price_breakdown?.service_fee).toBe(1);
    expect(target?.price_breakdown?.tax).toBe(1.1);
    expect(target?.price_breakdown?.total_price).toBe(12.1);
    expect(target?.price_breakdown?.currency).toBe('USD');
    expect(target?.price_breakdown?.pricing_profile?.scope).toBe('default');
  });

  it('applies organizer fee profile overrides when configured', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'queens food', limit: 3 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,price_transparency_breakdown',
        PRICE_SERVICE_FEE_RATE: '0.1',
        PRICE_TAX_RATE: '0.1',
        PRICE_MIN_SERVICE_FEE: '1',
        PRICE_ORGANIZER_FEE_PROFILES_JSON: JSON.stringify({
          org_market_collective: {
            service_fee_rate: 0.2,
            tax_rate: 0.05,
            min_service_fee: 2,
          },
        }),
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        organizer_id: string;
        price_breakdown?: {
          base_price: number;
          service_fee: number;
          tax: number;
          total_price: number;
          currency: string;
          pricing_profile?: { scope: string; organizer_id?: string };
        };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_003');
    expect(target).toBeTruthy();
    expect(target?.organizer_id).toBe('org_market_collective');
    expect(target?.price_breakdown?.service_fee).toBe(2);
    expect(target?.price_breakdown?.tax).toBe(0.6);
    expect(target?.price_breakdown?.total_price).toBe(12.6);
    expect(target?.price_breakdown?.pricing_profile?.scope).toBe('organizer');
    expect(target?.price_breakdown?.pricing_profile?.organizer_id).toBe('org_market_collective');
  });

  it('includes commute scoring metadata when commute_time_scoring is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'brooklyn music', limit: 3 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,commute_time_scoring',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        commute?: {
          eta_minutes: number;
          score: number;
          band: string;
          mode: string;
          confidence: string;
        };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_001');
    expect(target).toBeTruthy();
    expect(typeof target?.commute?.eta_minutes).toBe('number');
    expect(typeof target?.commute?.score).toBe('number');
    expect(['excellent', 'good', 'fair', 'poor']).toContain(target?.commute?.band);
    expect(['walk', 'subway', 'multi_leg']).toContain(target?.commute?.mode);
    expect(target?.commute?.confidence).toBe('estimated');
  });

  it('supports commute scoring env overrides', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'brooklyn music', limit: 3 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,commute_time_scoring',
        COMMUTE_BASE_BUFFER_MINUTES: '0',
        COMMUTE_BOROUGH_BASE_JSON: JSON.stringify({
          brooklyn: 0,
        }),
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        commute?: { eta_minutes: number };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_001');
    expect(target).toBeTruthy();
    expect(target?.commute?.eta_minutes).toBe(8);
  });

  it('applies home/work commute profile inputs when provided', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'brooklyn music',
          limit: 3,
          commute_profile: {
            home_borough: 'manhattan',
            work_borough: 'brooklyn',
            profile_anchor: 'home',
            departure_hour: 18,
          },
        }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,commute_time_scoring',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        commute?: {
          eta_minutes: number;
          origin_borough?: string;
          profile_anchor?: string;
          personalized: boolean;
        };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_001');
    expect(target).toBeTruthy();
    expect(target?.commute?.origin_borough).toBe('manhattan');
    expect(target?.commute?.profile_anchor).toBe('home');
    expect(target?.commute?.personalized).toBe(true);
    expect(target?.commute?.eta_minutes).toBe(43);
  });

  it('returns 422 when commute_profile is provided without home/work borough', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'brooklyn music',
          commute_profile: {
            profile_anchor: 'home',
          },
        }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,commute_time_scoring',
      },
    );

    expect(res.status).toBe(422);
  });

  it('includes neighborhood fit metadata when neighborhood_fit_scoring is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'creative food in queens', limit: 3 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,neighborhood_fit_scoring',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        neighborhood_fit?: {
          score: number;
          band: string;
          dominant_vibe: string;
          reasons: string[];
          personalized: boolean;
        };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_003');
    expect(target).toBeTruthy();
    expect(typeof target?.neighborhood_fit?.score).toBe('number');
    expect(['strong', 'moderate', 'weak']).toContain(target?.neighborhood_fit?.band);
    expect(typeof target?.neighborhood_fit?.dominant_vibe).toBe('string');
    expect(Array.isArray(target?.neighborhood_fit?.reasons)).toBe(true);
  });

  it('personalizes neighborhood fit from neighborhood_profile inputs', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'creative food in queens',
          limit: 3,
          neighborhood_profile: {
            preferred_vibes: ['foodie'],
            preferred_boroughs: ['queens'],
            crowd_tolerance: 'medium',
            budget_preference: 'value',
          },
        }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,neighborhood_fit_scoring',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        neighborhood_fit?: { personalized: boolean; band: string; score: number };
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_003');
    expect(target).toBeTruthy();
    expect(target?.neighborhood_fit?.personalized).toBe(true);
    expect(target?.neighborhood_fit?.score).toBeGreaterThanOrEqual(60);
    expect(['strong', 'moderate']).toContain(target?.neighborhood_fit?.band);
  });

  it('includes personalized recommendation metadata when personalized_recommendations is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'events',
          limit: 6,
          neighborhood_profile: {
            preferred_vibes: ['foodie'],
            preferred_boroughs: ['queens'],
            budget_preference: 'value',
          },
          session_id: 'sess_test_week13',
        }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,personalized_recommendations,-best_value_ranking',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        ranking_strategy?: string;
        personalization?: {
          score: number;
          boost: number;
          reasons: string[];
          personalized: boolean;
        };
      }>;
    };
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.every((item) => item.ranking_strategy === 'personalized')).toBe(true);
    const personalizedItems = json.results.filter((item) => item.personalization?.personalized);
    expect(personalizedItems.length).toBeGreaterThan(0);
    expect((personalizedItems[0]?.personalization?.boost ?? 0)).toBeGreaterThan(0);
    expect(Array.isArray(personalizedItems[0]?.personalization?.reasons)).toBe(true);
  });

  it('includes best value metadata when best_value_ranking is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'events', limit: 6 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,best_value_ranking,price_transparency_breakdown,commute_time_scoring,-personalized_recommendations',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        ranking_strategy?: string;
        best_value?: {
          score: number;
          band: string;
          factors: {
            relevance: number;
            affordability: number;
            commute: number;
          };
        };
      }>;
    };
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.every((item) => item.ranking_strategy === 'best_value')).toBe(true);
    expect(typeof json.results[0]?.best_value?.score).toBe('number');
    expect(['excellent', 'good', 'fair', 'low']).toContain(json.results[0]?.best_value?.band);
    expect(typeof json.results[0]?.best_value?.factors.relevance).toBe('number');
    expect(typeof json.results[0]?.best_value?.factors.affordability).toBe('number');
    expect(typeof json.results[0]?.best_value?.factors.commute).toBe('number');
  });

  it('includes listing verification metadata when verified_listing_badges is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'events', limit: 6 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,verified_listing_badges',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        verification?: {
          status: string;
          badge_label: string;
          trust_score: number;
        };
      }>;
    };
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.every((item) => Boolean(item.verification))).toBe(true);
    const pending = json.results.find((item) => item.id === 'evt_002');
    expect(pending?.verification?.status).toBe('pending');
    expect(typeof pending?.verification?.trust_score).toBe('number');
  });

  it('includes fraud risk metadata and routes risky listings to review queue', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'networking wire transfer crypto only guaranteed seat', limit: 6 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,fraud_risk_scoring,verified_listing_badges',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        fraud_risk?: {
          score: number;
          band: 'low' | 'medium' | 'high';
          review_route: 'allow' | 'review_queue' | 'block';
          reasons: string[];
          model_version: string;
        };
      }>;
    };
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.every((item) => Boolean(item.fraud_risk))).toBe(true);
    const riskyRoutedItems = json.results.filter((item) => (
      item.fraud_risk?.review_route === 'review_queue' || item.fraud_risk?.review_route === 'block'
    ));
    expect(riskyRoutedItems.length).toBeGreaterThan(0);
    const target = json.results.find((item) => item.id === 'evt_002');
    expect(target?.fraud_risk?.band).toBe('high');
    expect(target?.fraud_risk?.score).toBeGreaterThanOrEqual(70);
    expect(target?.fraud_risk?.model_version).toBe('fraud-risk-v1.0.0');
  });

  it('includes review authenticity metadata and suppresses suspicious reviews', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'networking event in manhattan', limit: 6 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,review_authenticity_scoring',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        review_authenticity?: {
          score: number;
          band: 'trusted' | 'mixed' | 'suspicious';
          review_count: number;
          visible_review_count: number;
          suppressed_review_count: number;
          suppression_applied: boolean;
        };
      }>;
    };
    expect(json.results.length).toBeGreaterThan(0);
    expect(json.results.every((item) => Boolean(item.review_authenticity))).toBe(true);
    const suspicious = json.results.find((item) => item.id === 'evt_002');
    expect(suspicious?.review_authenticity?.band).toBe('suspicious');
    expect(suspicious?.review_authenticity?.suppression_applied).toBe(true);
    expect((suspicious?.review_authenticity?.suppressed_review_count ?? 0)).toBeGreaterThan(0);
    expect((suspicious?.review_authenticity?.visible_review_count ?? 0)).toBeLessThan(
      suspicious?.review_authenticity?.review_count ?? 0,
    );
  });

  it('returns experiment assignments and result tags when experimentation framework is enabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'events',
          limit: 6,
          session_id: 'sess_exp_week16',
        }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,experimentation_framework,review_authenticity_scoring,verified_listing_badges,fraud_risk_scoring,best_value_ranking',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      experiments?: Array<{
        id: 'ranking_blend_v1' | 'trust_controls_v1';
        variant: 'control' | 'treatment';
        guardrail_status: 'insufficient_sample' | 'healthy' | 'stop_loss_triggered';
      }>;
      results: Array<{
        id: string;
        experiment_tags?: string[];
      }>;
    };
    expect(json.experiments).toBeTruthy();
    expect((json.experiments ?? []).length).toBeGreaterThanOrEqual(2);
    expect((json.experiments ?? []).every((item) => ['control', 'treatment'].includes(item.variant))).toBe(true);
    expect(json.results.every((item) => Array.isArray(item.experiment_tags))).toBe(true);
    expect(json.results[0]?.experiment_tags?.some((token) => token.startsWith('ranking_blend_v1:'))).toBe(true);
  });

  it('returns compare payload when compare_mode is enabled and compare ids are provided', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'events',
          limit: 6,
          compare_event_ids: ['evt_003', 'evt_006'],
        }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,compare_mode,price_transparency_breakdown,commute_time_scoring,best_value_ranking',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      comparison?: {
        items: Array<{ id: string }>;
        summary: {
          compared_count: number;
          cheapest_event_id?: string;
          earliest_event_id?: string;
          shortest_walk_event_id?: string;
          top_relevance_event_id?: string;
        };
      };
    };
    expect(json.comparison).toBeTruthy();
    expect(json.comparison?.items.map((item) => item.id)).toEqual(['evt_003', 'evt_006']);
    expect(json.comparison?.summary.compared_count).toBe(2);
    expect(json.comparison?.summary.cheapest_event_id).toBe('evt_003');
    expect(json.comparison?.summary.earliest_event_id).toBe('evt_006');
    expect(json.comparison?.summary.shortest_walk_event_id).toBe('evt_006');
    expect(['evt_003', 'evt_006']).toContain(json.comparison?.summary.top_relevance_event_id);
  });

  it('omits price breakdown when flag is disabled', async () => {
    const res = await app.request(
      '/api/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'queens food', limit: 3 }),
      },
      {
        FEATURE_FLAGS: 'unified_smart_search,-price_transparency_breakdown,-neighborhood_fit_scoring',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      results: Array<{
        id: string;
        price_breakdown?: unknown;
        neighborhood_fit?: unknown;
      }>;
    };
    const target = json.results.find((item) => item.id === 'evt_003');
    expect(target).toBeTruthy();
    expect(target?.price_breakdown).toBeUndefined();
    expect(target?.neighborhood_fit).toBeUndefined();
  });
});
