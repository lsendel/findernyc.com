import type { NeighborhoodProfile, NeighborhoodVibe } from './neighborhood-fit';
import type { Borough, EventCategory, SearchResult } from './unified-search';

export type SessionClickSignal = {
  event_id?: string;
  category?: EventCategory;
  borough?: Borough;
};

export type SessionSavedSearchSignal = {
  filters?: {
    category?: EventCategory;
    borough?: Borough;
  };
  query_text?: string;
};

export type SessionPreferenceProfile = {
  category_affinity: Partial<Record<EventCategory, number>>;
  borough_affinity: Partial<Record<Borough, number>>;
  event_affinity: Record<string, number>;
  has_behavioral_history: boolean;
  history_counts: {
    click_events: number;
    saved_searches: number;
  };
};

export type RecommendationCommuteProfile = {
  home_borough?: Borough;
  work_borough?: Borough;
  profile_anchor?: 'home' | 'work' | 'balanced';
};

export type PersonalizationRecommendation = {
  score: number;
  boost: number;
  reasons: string[];
  personalized: boolean;
};

export type BestValueRecommendation = {
  score: number;
  band: 'excellent' | 'good' | 'fair' | 'low';
  factors: {
    relevance: number;
    affordability: number;
    commute: number;
  };
};

export type RecommendationRankingStrategy =
  | 'baseline'
  | 'personalized'
  | 'best_value'
  | 'personalized_best_value';

export type RecommendationRankedResult = SearchResult & {
  commute?: {
    eta_minutes: number;
    score: number;
    band: 'excellent' | 'good' | 'fair' | 'poor';
    mode: 'walk' | 'subway' | 'multi_leg';
    confidence: 'estimated';
    origin_borough?: Borough;
    profile_anchor?: 'home' | 'work' | 'balanced';
    personalized: boolean;
  };
  price_breakdown?: {
    base_price: number;
    service_fee: number;
    tax: number;
    total_price: number;
    currency: string;
    pricing_profile: { scope: 'default' | 'organizer'; organizer_id?: string };
    disclaimer: string;
  };
  neighborhood_fit?: {
    score: number;
    band: 'strong' | 'moderate' | 'weak';
    dominant_vibe: NeighborhoodVibe;
    reasons: string[];
    personalized: boolean;
  };
  personalization?: PersonalizationRecommendation;
  best_value?: BestValueRecommendation;
  ranking_strategy?: RecommendationRankingStrategy;
  verification?: {
    status: 'verified' | 'pending' | 'unverified';
    badge_label: string;
    verified_at?: string;
    verification_method?: 'manual' | 'trusted_partner' | 'document_check';
    trust_score: number;
  };
  fraud_risk?: {
    score: number;
    band: 'low' | 'medium' | 'high';
    review_route: 'allow' | 'review_queue' | 'block';
    reasons: string[];
    rules_triggered: string[];
    model_version: string;
  };
  review_authenticity?: {
    score: number;
    band: 'trusted' | 'mixed' | 'suspicious';
    review_count: number;
    visible_review_count: number;
    suppressed_review_count: number;
    suppression_applied: boolean;
    reasons: string[];
  };
  experiment_tags?: string[];
};

const categoryToVibes: Record<EventCategory, NeighborhoodVibe[]> = {
  music: ['creative', 'nightlife'],
  food: ['foodie', 'creative'],
  arts: ['creative', 'quiet'],
  networking: ['professional', 'nightlife'],
  family: ['family', 'quiet'],
  wellness: ['wellness', 'quiet'],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeMap<K extends string>(counts: Partial<Record<K, number>>): Partial<Record<K, number>> {
  const max = Math.max(0, ...Object.values(counts).map((value) => Number(value ?? 0)));
  if (max <= 0) return {};
  const out: Partial<Record<K, number>> = {};
  for (const [key, value] of Object.entries(counts) as Array<[K, number]>) {
    out[key] = round(clamp((value ?? 0) / max, 0, 1));
  }
  return out;
}

function normalizeEventMap(counts: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(counts));
  if (max <= 0) return {};
  const out: Record<string, number> = {};
  for (const [eventId, value] of Object.entries(counts)) {
    out[eventId] = round(clamp(value / max, 0, 1));
  }
  return out;
}

function deriveBudget(eventPrice: number): 'free' | 'value' | 'premium' {
  if (eventPrice <= 0) return 'free';
  if (eventPrice <= 20) return 'value';
  return 'premium';
}

function resolveBestValueBand(score: number): BestValueRecommendation['band'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'low';
}

export function buildSessionPreferenceProfile(input: {
  clickEvents: SessionClickSignal[];
  savedSearches: SessionSavedSearchSignal[];
}): SessionPreferenceProfile {
  const categoryCounts: Partial<Record<EventCategory, number>> = {};
  const boroughCounts: Partial<Record<Borough, number>> = {};
  const eventCounts: Record<string, number> = {};

  for (const click of input.clickEvents) {
    if (click.category) categoryCounts[click.category] = (categoryCounts[click.category] ?? 0) + 2;
    if (click.borough) boroughCounts[click.borough] = (boroughCounts[click.borough] ?? 0) + 1.6;
    if (click.event_id) eventCounts[click.event_id] = (eventCounts[click.event_id] ?? 0) + 2.4;
  }

  for (const savedSearch of input.savedSearches) {
    if (savedSearch.filters?.category) {
      categoryCounts[savedSearch.filters.category] = (categoryCounts[savedSearch.filters.category] ?? 0) + 1.1;
    }
    if (savedSearch.filters?.borough) {
      boroughCounts[savedSearch.filters.borough] = (boroughCounts[savedSearch.filters.borough] ?? 0) + 1;
    }
  }

  return {
    category_affinity: normalizeMap(categoryCounts),
    borough_affinity: normalizeMap(boroughCounts),
    event_affinity: normalizeEventMap(eventCounts),
    has_behavioral_history: input.clickEvents.length > 0 || input.savedSearches.length > 0,
    history_counts: {
      click_events: input.clickEvents.length,
      saved_searches: input.savedSearches.length,
    },
  };
}

function computePersonalization(input: {
  result: RecommendationRankedResult;
  sessionProfile?: SessionPreferenceProfile;
  commuteProfile?: RecommendationCommuteProfile;
  neighborhoodProfile?: NeighborhoodProfile;
}): PersonalizationRecommendation {
  const reasons: string[] = [];
  let boost = 0;

  const categoryAffinity = input.sessionProfile?.category_affinity[input.result.category] ?? 0;
  if (categoryAffinity > 0) {
    boost += categoryAffinity * 2.2;
    reasons.push('Aligned with your clicked/saved categories.');
  }

  const boroughAffinity = input.sessionProfile?.borough_affinity[input.result.borough] ?? 0;
  if (boroughAffinity > 0) {
    boost += boroughAffinity * 1.8;
    if (reasons.length < 2) reasons.push('Frequently chosen in your preferred boroughs.');
  }

  const eventAffinity = input.sessionProfile?.event_affinity[input.result.id] ?? 0;
  if (eventAffinity > 0) {
    boost += eventAffinity * 2.6;
    if (reasons.length < 2) reasons.push('Similar to events you engaged with before.');
  }

  if (input.neighborhoodProfile?.preferred_boroughs?.includes(input.result.borough)) {
    boost += 1.2;
    if (reasons.length < 2) reasons.push('Matches your profile borough preference.');
  }

  if (
    (input.commuteProfile?.home_borough && input.commuteProfile.home_borough === input.result.borough)
    || (input.commuteProfile?.work_borough && input.commuteProfile.work_borough === input.result.borough)
  ) {
    boost += 0.9;
    if (reasons.length < 2) reasons.push('Closer to your home/work commute profile.');
  }

  const preferredVibes = input.neighborhoodProfile?.preferred_vibes ?? [];
  if (preferredVibes.length > 0) {
    const eventVibes = categoryToVibes[input.result.category];
    if (preferredVibes.some((vibe) => eventVibes.includes(vibe))) {
      boost += 1.1;
      if (reasons.length < 2) reasons.push('Fits your preferred neighborhood vibe.');
    }
  }

  if (input.neighborhoodProfile?.budget_preference) {
    const eventBudget = deriveBudget(input.result.price_breakdown?.total_price ?? input.result.price);
    if (eventBudget === input.neighborhoodProfile.budget_preference) {
      boost += 0.8;
      if (reasons.length < 2) reasons.push('Aligned with your budget preference.');
    }
  }

  const boundedBoost = round(clamp(boost, 0, 8));
  const score = round(clamp(50 + boundedBoost * 6, 0, 100));
  return {
    score,
    boost: boundedBoost,
    reasons: reasons.slice(0, 2),
    personalized: boundedBoost > 0.2,
  };
}

function normalizeByRange(value: number, min: number, max: number, invert = false): number {
  if (!Number.isFinite(value)) return 0;
  if (Math.abs(max - min) < 0.0001) return 75;
  const normalized = ((value - min) / (max - min)) * 100;
  const bounded = clamp(normalized, 0, 100);
  return invert ? 100 - bounded : bounded;
}

function computeBestValue(input: {
  result: RecommendationRankedResult;
  bounds: {
    minRelevance: number;
    maxRelevance: number;
    minCost: number;
    maxCost: number;
  };
}): BestValueRecommendation {
  const totalCost = input.result.price_breakdown?.total_price ?? input.result.price;
  const relevance = normalizeByRange(
    input.result.relevance_score,
    input.bounds.minRelevance,
    input.bounds.maxRelevance,
  );
  const affordability = normalizeByRange(
    totalCost,
    input.bounds.minCost,
    input.bounds.maxCost,
    true,
  );
  const commute = round(clamp(
    input.result.commute?.score ?? (100 - input.result.walk_minutes * 3),
    5,
    100,
  ));
  const score = round(relevance * 0.5 + affordability * 0.3 + commute * 0.2);
  return {
    score,
    band: resolveBestValueBand(score),
    factors: {
      relevance: round(relevance),
      affordability: round(affordability),
      commute,
    },
  };
}

export function applyRecommendationRanking(input: {
  results: RecommendationRankedResult[];
  enablePersonalization: boolean;
  enableBestValue: boolean;
  sessionProfile?: SessionPreferenceProfile;
  commuteProfile?: RecommendationCommuteProfile;
  neighborhoodProfile?: NeighborhoodProfile;
}): RecommendationRankedResult[] {
  if (!input.enablePersonalization && !input.enableBestValue) {
    return input.results;
  }

  const relevanceValues = input.results.map((item) => item.relevance_score);
  const costValues = input.results.map((item) => item.price_breakdown?.total_price ?? item.price);
  const bounds = {
    minRelevance: Math.min(...relevanceValues),
    maxRelevance: Math.max(...relevanceValues),
    minCost: Math.min(...costValues),
    maxCost: Math.max(...costValues),
  };

  return input.results
    .map((result) => {
      const personalization = input.enablePersonalization
        ? computePersonalization({
          result,
          sessionProfile: input.sessionProfile,
          commuteProfile: input.commuteProfile,
          neighborhoodProfile: input.neighborhoodProfile,
        })
        : undefined;

      const bestValue = input.enableBestValue
        ? computeBestValue({ result, bounds })
        : undefined;

      let rankingScore = result.relevance_score;
      if (personalization) rankingScore += personalization.boost;
      if (bestValue) rankingScore += (bestValue.score - 50) / 15;

      const rankingStrategy: RecommendationRankingStrategy = input.enablePersonalization && input.enableBestValue
        ? 'personalized_best_value'
        : input.enablePersonalization
          ? 'personalized'
          : 'best_value';

      return {
        ...result,
        ...(personalization ? { personalization } : {}),
        ...(bestValue ? { best_value: bestValue } : {}),
        ranking_strategy: rankingStrategy,
        recommendation_score: round(rankingScore),
      } as RecommendationRankedResult & { recommendation_score: number };
    })
    .sort((a, b) => {
      const scoreA = (a as RecommendationRankedResult & { recommendation_score: number }).recommendation_score;
      const scoreB = (b as RecommendationRankedResult & { recommendation_score: number }).recommendation_score;
      return scoreB - scoreA || b.relevance_score - a.relevance_score || a.start_hour - b.start_hour;
    })
    .map((result) => {
      const { recommendation_score: _unusedScore, ...rest } = result as RecommendationRankedResult & { recommendation_score?: number };
      return rest;
    });
}
