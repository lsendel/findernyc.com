import { describe, it, expect } from 'vitest';
import { applyRecommendationRanking, buildSessionPreferenceProfile, type RecommendationRankedResult } from '../../src/search/recommendation-ranking';

describe('recommendation ranking', () => {
  it('builds session preference profile from click and saved-search history', () => {
    const profile = buildSessionPreferenceProfile({
      clickEvents: [
        { event_id: 'evt_003', category: 'food', borough: 'queens' },
        { event_id: 'evt_003', category: 'food', borough: 'queens' },
        { event_id: 'evt_001', category: 'music', borough: 'brooklyn' },
      ],
      savedSearches: [
        { filters: { category: 'food', borough: 'queens' } },
        { filters: { borough: 'queens' } },
      ],
    });

    expect(profile.has_behavioral_history).toBe(true);
    expect(profile.history_counts.click_events).toBe(3);
    expect(profile.history_counts.saved_searches).toBe(2);
    expect((profile.category_affinity.food ?? 0)).toBeGreaterThanOrEqual(0.9);
    expect((profile.borough_affinity.queens ?? 0)).toBeGreaterThanOrEqual(0.9);
    expect((profile.event_affinity.evt_003 ?? 0)).toBeGreaterThan((profile.event_affinity.evt_001 ?? 0));
  });

  it('applies personalized boosts from behavioral/profile signals', () => {
    const results: RecommendationRankedResult[] = [
      {
        id: 'evt_001',
        organizer_id: 'org_a',
        title: 'Jazz Night',
        description: 'music',
        borough: 'brooklyn',
        category: 'music',
        price: 0,
        start_hour: 20,
        walk_minutes: 8,
        venue: 'A',
        relevance_score: 4.2,
      },
      {
        id: 'evt_003',
        organizer_id: 'org_b',
        title: 'Queens Night Market',
        description: 'food',
        borough: 'queens',
        category: 'food',
        price: 10,
        start_hour: 18,
        walk_minutes: 14,
        venue: 'B',
        relevance_score: 3.9,
      },
    ];

    const sessionProfile = buildSessionPreferenceProfile({
      clickEvents: [
        { event_id: 'evt_003', category: 'food', borough: 'queens' },
        { event_id: 'evt_003', category: 'food', borough: 'queens' },
      ],
      savedSearches: [{ filters: { category: 'food', borough: 'queens' } }],
    });

    const ranked = applyRecommendationRanking({
      results,
      enablePersonalization: true,
      enableBestValue: false,
      sessionProfile,
      neighborhoodProfile: {
        preferred_vibes: ['foodie'],
        preferred_boroughs: ['queens'],
        budget_preference: 'value',
      },
    });

    expect(ranked[0]?.id).toBe('evt_003');
    expect(ranked[0]?.ranking_strategy).toBe('personalized');
    expect(ranked[0]?.personalization?.personalized).toBe(true);
    expect((ranked[0]?.personalization?.boost ?? 0)).toBeGreaterThan(1);
  });

  it('adds best-value metadata and strategy when best-value ranking is enabled', () => {
    const results: RecommendationRankedResult[] = [
      {
        id: 'evt_paid',
        organizer_id: 'org_c',
        title: 'Paid networking',
        description: 'networking',
        borough: 'manhattan',
        category: 'networking',
        price: 35,
        start_hour: 19,
        walk_minutes: 12,
        venue: 'C',
        relevance_score: 6.1,
        commute: {
          eta_minutes: 42,
          score: 48,
          band: 'fair',
          mode: 'subway',
          confidence: 'estimated',
          personalized: false,
        },
        price_breakdown: {
          base_price: 35,
          service_fee: 3,
          tax: 3,
          total_price: 41,
          currency: 'USD',
          pricing_profile: { scope: 'default' },
          disclaimer: '',
        },
      },
      {
        id: 'evt_free',
        organizer_id: 'org_d',
        title: 'Free workshop',
        description: 'arts',
        borough: 'brooklyn',
        category: 'arts',
        price: 0,
        start_hour: 17,
        walk_minutes: 6,
        venue: 'D',
        relevance_score: 4.6,
        commute: {
          eta_minutes: 14,
          score: 84,
          band: 'excellent',
          mode: 'walk',
          confidence: 'estimated',
          personalized: false,
        },
        price_breakdown: {
          base_price: 0,
          service_fee: 0,
          tax: 0,
          total_price: 0,
          currency: 'USD',
          pricing_profile: { scope: 'default' },
          disclaimer: '',
        },
      },
    ];

    const ranked = applyRecommendationRanking({
      results,
      enablePersonalization: false,
      enableBestValue: true,
    });

    const free = ranked.find((item) => item.id === 'evt_free');
    const paid = ranked.find((item) => item.id === 'evt_paid');
    expect(ranked.every((item) => item.ranking_strategy === 'best_value')).toBe(true);
    expect(typeof ranked[0]?.best_value?.score).toBe('number');
    expect(typeof ranked[0]?.best_value?.factors.affordability).toBe('number');
    expect((free?.best_value?.factors.affordability ?? 0)).toBeGreaterThan((paid?.best_value?.factors.affordability ?? 0));
  });
});
