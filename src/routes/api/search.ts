import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { getAvailabilitySnapshot } from '../../availability/store';
import { createDb } from '../../db/client';
import { analytics_events, saved_searches } from '../../db/schema';
import {
  applySearchExperimentAdjustments,
  assignSearchExperiments,
} from '../../experiments/framework';
import { enqueueFraudReviewCandidate } from '../../fraud/review-queue';
import { computeFraudRisk } from '../../fraud/risk-scoring';
import { computeCommuteScore } from '../../search/commute-scoring';
import { computeNeighborhoodFit, type NeighborhoodFitWeights } from '../../search/neighborhood-fit';
import {
  applyRecommendationRanking,
  buildSessionPreferenceProfile,
  type RecommendationRankedResult,
} from '../../search/recommendation-ranking';
import { computeReviewAuthenticity } from '../../search/review-authenticity';
import { getListingVerificationForOrganizer } from '../../search/verified-listings';
import {
  getCatalogEventById,
  boroughValues,
  categoryValues,
  runUnifiedSmartSearch,
  type SearchBehavioralBoosts,
  type SearchRankingWeights,
} from '../../search/unified-search';

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    SEARCH_RANKING_WEIGHTS_JSON?: string;
    SEARCH_BEHAVIORAL_BOOSTS_JSON?: string;
    EVENT_AVAILABILITY_JSON?: string;
    PRICE_SERVICE_FEE_RATE?: string;
    PRICE_TAX_RATE?: string;
    PRICE_MIN_SERVICE_FEE?: string;
    PRICE_ORGANIZER_FEE_PROFILES_JSON?: string;
    COMMUTE_BASE_BUFFER_MINUTES?: string;
    COMMUTE_BOROUGH_BASE_JSON?: string;
    NEIGHBORHOOD_FIT_WEIGHTS_JSON?: string;
  };
};

export const searchRouter = new Hono<Env>();

const bodySchema = z.object({
  query: z.string().min(2).max(200),
  filters: z.object({
    borough: z.enum(boroughValues).optional(),
    category: z.enum(categoryValues).optional(),
    max_price: z.number().int().nonnegative().optional(),
    starts_before_hour: z.number().int().min(0).max(23).optional(),
    within_walk_minutes: z.number().int().min(1).max(120).optional(),
  }).optional(),
  commute_profile: z.object({
    home_borough: z.enum(boroughValues).optional(),
    work_borough: z.enum(boroughValues).optional(),
    profile_anchor: z.enum(['home', 'work', 'balanced']).default('balanced'),
    departure_hour: z.number().int().min(0).max(23).optional(),
  }).superRefine((value, ctx) => {
    if (!value.home_borough && !value.work_borough) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'home_or_work_borough_required',
        path: ['home_borough'],
      });
    }
  }).optional(),
  neighborhood_profile: z.object({
    preferred_vibes: z.array(
      z.enum(['creative', 'family', 'foodie', 'professional', 'quiet', 'nightlife', 'wellness']),
    ).max(4).optional(),
    preferred_boroughs: z.array(z.enum(boroughValues)).max(3).optional(),
    crowd_tolerance: z.enum(['low', 'medium', 'high']).optional(),
    budget_preference: z.enum(['free', 'value', 'premium']).optional(),
  }).optional(),
  compare_event_ids: z.array(z.string().min(1).max(64)).max(3).optional(),
  session_id: z.string().max(64).optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

const rankingWeightsSchema = z.object({
  title_term_match: z.number().min(0).max(20).optional(),
  description_term_match: z.number().min(0).max(20).optional(),
  exact_phrase_match: z.number().min(0).max(20).optional(),
  borough_match: z.number().min(0).max(20).optional(),
  category_match: z.number().min(0).max(20).optional(),
  price_affinity: z.number().min(0).max(20).optional(),
  walk_affinity: z.number().min(0).max(20).optional(),
  time_affinity: z.number().min(0).max(20).optional(),
  behavioral_category_boost: z.number().min(0).max(20).optional(),
  behavioral_borough_boost: z.number().min(0).max(20).optional(),
  behavioral_event_boost: z.number().min(0).max(20).optional(),
});

const behavioralBoostsSchema = z.object({
  categories: z.record(z.enum(categoryValues), z.number().min(-2).max(4)).optional(),
  boroughs: z.record(z.enum(boroughValues), z.number().min(-2).max(4)).optional(),
  events: z.record(z.string().min(1), z.number().min(-2).max(4)).optional(),
});

const organizerFeeProfilesSchema = z.record(
  z.string().min(1),
  z.object({
    service_fee_rate: z.number().min(0).max(1).optional(),
    tax_rate: z.number().min(0).max(1).optional(),
    min_service_fee: z.number().min(0).max(20).optional(),
  }),
);
const commuteBoroughBaseSchema = z.record(
  z.enum(boroughValues),
  z.number().int().min(0).max(120),
);
const neighborhoodFitWeightsSchema = z.object({
  vibe_match: z.number().min(0).max(50).optional(),
  borough_preference: z.number().min(0).max(50).optional(),
  crowd_alignment: z.number().min(0).max(50).optional(),
  budget_alignment: z.number().min(0).max(50).optional(),
  query_vibe_match: z.number().min(0).max(50).optional(),
  walkability_bonus: z.number().min(0).max(50).optional(),
  filter_alignment: z.number().min(0).max(50).optional(),
});

function parseJsonBinding<T>(source: string | undefined, schema: z.ZodSchema<T>): T | undefined {
  if (!source?.trim()) return undefined;
  try {
    const parsed = JSON.parse(source);
    const validated = schema.safeParse(parsed);
    if (!validated.success) return undefined;
    return validated.data;
  } catch {
    return undefined;
  }
}

function parseRate(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveOriginBorough(
  commuteProfile: z.infer<typeof bodySchema>['commute_profile'] | undefined,
): (typeof boroughValues)[number] | undefined {
  if (!commuteProfile) return undefined;
  if (commuteProfile.profile_anchor === 'home') return commuteProfile.home_borough;
  if (commuteProfile.profile_anchor === 'work') return commuteProfile.work_borough;

  if (commuteProfile.home_borough && commuteProfile.work_borough) {
    if (typeof commuteProfile.departure_hour === 'number' && commuteProfile.departure_hour >= 15) {
      return commuteProfile.work_borough;
    }
    return commuteProfile.home_borough;
  }
  return commuteProfile.home_borough ?? commuteProfile.work_borough;
}

const categorySet = new Set(categoryValues);
const boroughSet = new Set(boroughValues);

type SessionPreferenceProfile = ReturnType<typeof buildSessionPreferenceProfile>;

async function loadSessionPreferenceProfile(c: {
  env: Env['Bindings'];
  session_id?: string;
}): Promise<SessionPreferenceProfile | undefined> {
  const sessionId = c.session_id?.trim();
  const databaseUrl = c.env.DATABASE_URL?.trim();
  if (!sessionId || !databaseUrl) return undefined;

  try {
    const db = createDb(databaseUrl);
    const clickRows = await db
      .select({
        properties: analytics_events.properties,
      })
      .from(analytics_events)
      .where(
        and(
          eq(analytics_events.event_name, 'search_result_click'),
          eq(analytics_events.session_id, sessionId),
        ),
      )
      .orderBy(desc(analytics_events.created_at))
      .limit(120);

    const savedRows = await db
      .select({
        filters: saved_searches.filters,
        query_text: saved_searches.query_text,
      })
      .from(saved_searches)
      .where(eq(saved_searches.session_id, sessionId))
      .orderBy(desc(saved_searches.created_at))
      .limit(80);

    const clickEvents = clickRows.map((row) => {
      const props = row.properties && typeof row.properties === 'object'
        ? row.properties as Record<string, unknown>
        : {};
      const eventId = typeof props.event_id === 'string' ? props.event_id : undefined;
      const catalogEvent = eventId ? getCatalogEventById(eventId) : undefined;
      const categoryFromProps = typeof props.category === 'string' && categorySet.has(props.category as typeof categoryValues[number])
        ? props.category as typeof categoryValues[number]
        : undefined;
      const boroughFromProps = typeof props.borough === 'string' && boroughSet.has(props.borough as typeof boroughValues[number])
        ? props.borough as typeof boroughValues[number]
        : undefined;
      return {
        event_id: eventId,
        category: categoryFromProps ?? catalogEvent?.category,
        borough: boroughFromProps ?? catalogEvent?.borough,
      };
    });

    const savedSearches = savedRows.map((row) => {
      const filters = row.filters && typeof row.filters === 'object'
        ? row.filters as Record<string, unknown>
        : {};
      const category = typeof filters.category === 'string' && categorySet.has(filters.category as typeof categoryValues[number])
        ? filters.category as typeof categoryValues[number]
        : undefined;
      const borough = typeof filters.borough === 'string' && boroughSet.has(filters.borough as typeof boroughValues[number])
        ? filters.borough as typeof boroughValues[number]
        : undefined;
      return {
        filters: {
          ...(category ? { category } : {}),
          ...(borough ? { borough } : {}),
        },
        query_text: row.query_text,
      };
    });

    return buildSessionPreferenceProfile({
      clickEvents,
      savedSearches,
    });
  } catch {
    return undefined;
  }
}

function buildComparisonPayload(input: {
  rankedResults: RecommendationRankedResult[];
  compare_event_ids?: string[];
}): {
  items: Array<{
    id: string;
    title: string;
    borough: string;
    category: string;
    price: number;
    start_hour: number;
    walk_minutes: number;
    relevance_score: number;
    total_price?: number;
    commute_eta_minutes?: number;
    best_value_score?: number;
  }>;
  summary: {
    compared_count: number;
    cheapest_event_id?: string;
    earliest_event_id?: string;
    shortest_walk_event_id?: string;
    top_relevance_event_id?: string;
  };
} | undefined {
  const compareIds = Array.from(
    new Set(
      (input.compare_event_ids ?? [])
        .map((eventId) => eventId.trim())
        .filter(Boolean),
    ),
  ).slice(0, 3);
  if (compareIds.length < 2) return undefined;

  const rankedById = new Map(input.rankedResults.map((result) => [result.id, result]));
  const compared = compareIds
    .map((eventId) => rankedById.get(eventId))
    .filter((result): result is RecommendationRankedResult => Boolean(result));
  if (compared.length < 2) return undefined;

  const items = compared.map((result) => ({
    id: result.id,
    title: result.title,
    borough: result.borough,
    category: result.category,
    price: result.price,
    start_hour: result.start_hour,
    walk_minutes: result.walk_minutes,
    relevance_score: result.relevance_score,
    ...(typeof result.price_breakdown?.total_price === 'number'
      ? { total_price: result.price_breakdown.total_price }
      : {}),
    ...(typeof result.commute?.eta_minutes === 'number'
      ? { commute_eta_minutes: result.commute.eta_minutes }
      : {}),
    ...(typeof result.best_value?.score === 'number'
      ? { best_value_score: result.best_value.score }
      : {}),
  }));

  const cheapest = compared.reduce((best, current) => {
    const bestCost = best.price_breakdown?.total_price ?? best.price;
    const currentCost = current.price_breakdown?.total_price ?? current.price;
    return currentCost < bestCost ? current : best;
  });
  const earliest = compared.reduce((best, current) => (current.start_hour < best.start_hour ? current : best));
  const shortestWalk = compared.reduce((best, current) => (current.walk_minutes < best.walk_minutes ? current : best));
  const highestRelevance = compared.reduce((best, current) => (
    current.relevance_score > best.relevance_score ? current : best
  ));

  return {
    items,
    summary: {
      compared_count: compared.length,
      cheapest_event_id: cheapest.id,
      earliest_event_id: earliest.id,
      shortest_walk_event_id: shortestWalk.id,
      top_relevance_event_id: highestRelevance.id,
    },
  };
}

searchRouter.post('/', async (c) => {
  const env = c.env ?? {};
  const flags = resolveFeatureFlags(env);
  if (!flags.unified_smart_search) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' },
      422,
    );
  }

  const {
    query,
    filters,
    compare_event_ids,
    limit,
    commute_profile,
    neighborhood_profile,
    session_id,
  } = parsed.data;
  const rankingWeights = parseJsonBinding<Partial<SearchRankingWeights>>(
    env.SEARCH_RANKING_WEIGHTS_JSON,
    rankingWeightsSchema,
  );
  const behavioralBoosts = parseJsonBinding<SearchBehavioralBoosts>(
    env.SEARCH_BEHAVIORAL_BOOSTS_JSON,
    behavioralBoostsSchema,
  );
  const availability = flags.realtime_availability_sync
    ? getAvailabilitySnapshot(env)
    : undefined;
  const serviceFeeRate = parseRate(env.PRICE_SERVICE_FEE_RATE, 0.08, 0, 1);
  const taxRate = parseRate(env.PRICE_TAX_RATE, 0.08875, 0, 1);
  const minServiceFee = parseRate(env.PRICE_MIN_SERVICE_FEE, 1, 0, 20);
  const organizerFeeProfiles = parseJsonBinding<Record<string, {
    service_fee_rate?: number;
    tax_rate?: number;
    min_service_fee?: number;
  }>>(
    env.PRICE_ORGANIZER_FEE_PROFILES_JSON,
    organizerFeeProfilesSchema,
  );
  const commuteBaseBuffer = Math.round(parseRate(env.COMMUTE_BASE_BUFFER_MINUTES, 6, 0, 60));
  const commuteBoroughBase = parseJsonBinding<Partial<Record<(typeof boroughValues)[number], number>>>(
    env.COMMUTE_BOROUGH_BASE_JSON,
    commuteBoroughBaseSchema,
  );
  const neighborhoodFitWeights = parseJsonBinding<Partial<NeighborhoodFitWeights>>(
    env.NEIGHBORHOOD_FIT_WEIGHTS_JSON,
    neighborhoodFitWeightsSchema,
  );

  const search = runUnifiedSmartSearch({
    query,
    filters,
    limit,
    ranking: {
      weights: rankingWeights,
      behavioral_boosts: behavioralBoosts,
    },
    availability,
  });
  const includePriceBreakdown = flags.price_transparency_breakdown;
  const includeCommuteScoring = flags.commute_time_scoring;
  const includeNeighborhoodFit = flags.neighborhood_fit_scoring;
  const includePersonalizedRecommendations = flags.personalized_recommendations;
  const includeBestValueRanking = flags.best_value_ranking;
  const includeVerifiedListingBadges = flags.verified_listing_badges;
  const includeFraudRiskScoring = flags.fraud_risk_scoring;
  const includeReviewAuthenticity = flags.review_authenticity_scoring;
  const includeExperimentation = flags.experimentation_framework;
  const experimentAssignments = assignSearchExperiments({
    session_id,
    enabled: includeExperimentation,
  });
  const sessionPreferenceProfile = includePersonalizedRecommendations
    ? await loadSessionPreferenceProfile({ env, session_id })
    : undefined;
  const results = search.results.map((result) => {
    let nextResult = result as typeof result & {
      commute?: ReturnType<typeof computeCommuteScore>;
      neighborhood_fit?: ReturnType<typeof computeNeighborhoodFit>;
      verification?: ReturnType<typeof getListingVerificationForOrganizer>;
      fraud_risk?: ReturnType<typeof computeFraudRisk>;
      review_authenticity?: ReturnType<typeof computeReviewAuthenticity>;
      price_breakdown?: {
        base_price: number;
        service_fee: number;
        tax: number;
        total_price: number;
        currency: 'USD';
        pricing_profile: { scope: 'default' | 'organizer'; organizer_id?: string };
        disclaimer: string;
      };
    };
    const verification = (includeVerifiedListingBadges || includeFraudRiskScoring)
      ? getListingVerificationForOrganizer(result.organizer_id)
      : undefined;
    const reviewAuthenticity = (includeReviewAuthenticity || includeExperimentation)
      ? computeReviewAuthenticity({
        event_id: result.id,
        category: result.category,
      })
      : undefined;

    if (includeCommuteScoring) {
      const originBorough = resolveOriginBorough(commute_profile);
      nextResult = {
        ...nextResult,
        commute: computeCommuteScore({
          borough: result.borough,
          walk_minutes: result.walk_minutes,
          commute_profile: {
            origin_borough: originBorough,
            profile_anchor: commute_profile?.profile_anchor,
            departure_hour: commute_profile?.departure_hour,
          },
          options: {
            base_buffer_minutes: commuteBaseBuffer,
            borough_base_minutes: commuteBoroughBase ?? {},
          },
        }),
      };
    }

    if (includeNeighborhoodFit) {
      nextResult = {
        ...nextResult,
        neighborhood_fit: computeNeighborhoodFit({
          event: result,
          query,
          applied_filters: search.applied_filters,
          profile: neighborhood_profile,
          weights: neighborhoodFitWeights,
        }),
      };
    }

    if (includePriceBreakdown) {
      const organizerProfile = organizerFeeProfiles?.[result.organizer_id];
      const effectiveServiceFeeRate = organizerProfile?.service_fee_rate ?? serviceFeeRate;
      const effectiveTaxRate = organizerProfile?.tax_rate ?? taxRate;
      const effectiveMinServiceFee = organizerProfile?.min_service_fee ?? minServiceFee;
      const pricingProfile = organizerProfile
        ? { scope: 'organizer' as const, organizer_id: result.organizer_id }
        : { scope: 'default' as const };

      if (result.price <= 0) {
        nextResult = {
          ...nextResult,
          price_breakdown: {
            base_price: 0,
            service_fee: 0,
            tax: 0,
            total_price: 0,
            currency: 'USD',
            pricing_profile: pricingProfile,
            disclaimer: 'Estimated total shown before venue-specific add-ons.',
          },
        };
      } else {
        const serviceFee = roundMoney(Math.max(effectiveMinServiceFee, result.price * effectiveServiceFeeRate));
        const taxableSubtotal = result.price + serviceFee;
        const tax = roundMoney(taxableSubtotal * effectiveTaxRate);
        const totalPrice = roundMoney(taxableSubtotal + tax);
        nextResult = {
          ...nextResult,
          price_breakdown: {
            base_price: roundMoney(result.price),
            service_fee: serviceFee,
            tax,
            total_price: totalPrice,
            currency: 'USD',
            pricing_profile: pricingProfile,
            disclaimer: 'Estimated total shown before venue-specific add-ons.',
          },
        };
      }
    }

    if (includeVerifiedListingBadges && verification) {
      nextResult = {
        ...nextResult,
        verification,
      };
    }

    if (includeFraudRiskScoring) {
      nextResult = {
        ...nextResult,
        fraud_risk: computeFraudRisk({
          event: result,
          query,
          verification_status: verification?.status,
        }),
      };
    }

    if ((includeReviewAuthenticity || includeExperimentation) && reviewAuthenticity) {
      let relevanceScore = nextResult.relevance_score;
      if (includeReviewAuthenticity && reviewAuthenticity.suppression_applied) {
        const penalty = reviewAuthenticity.band === 'suspicious' ? 2.2 : 0.7;
        relevanceScore = Number(Math.max(0, relevanceScore - penalty).toFixed(4));
      }
      nextResult = {
        ...nextResult,
        review_authenticity: reviewAuthenticity,
        relevance_score: relevanceScore,
      };
    }

    return nextResult;
  });

  const recommendationRankedResults = applyRecommendationRanking({
    results,
    enablePersonalization: includePersonalizedRecommendations,
    enableBestValue: includeBestValueRanking,
    sessionProfile: sessionPreferenceProfile,
    commuteProfile: commute_profile,
    neighborhoodProfile: neighborhood_profile,
  });
  const rankedResults = applySearchExperimentAdjustments({
    results: recommendationRankedResults,
    assignments: experimentAssignments,
  });
  const responseResults = includeReviewAuthenticity
    ? rankedResults
    : rankedResults.map((result) => {
      const { review_authenticity: _omitReviewAuthenticity, ...rest } = result;
      return rest;
    });
  const comparison = flags.compare_mode
    ? buildComparisonPayload({
      rankedResults: responseResults,
      compare_event_ids,
    })
    : undefined;
  if (includeFraudRiskScoring) {
    for (const result of responseResults) {
      if (!result.fraud_risk) continue;
      enqueueFraudReviewCandidate({
        event_id: result.id,
        title: result.title,
        organizer_id: result.organizer_id,
        assessment: result.fraud_risk,
      });
    }
  }

  return c.json(
    {
      success: true,
      query,
      ...search,
      results: responseResults,
      ...(comparison ? { comparison } : {}),
      ...(experimentAssignments.length > 0
        ? { experiments: experimentAssignments }
        : {}),
    },
    200,
  );
});
