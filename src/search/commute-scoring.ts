import type { Borough } from './unified-search';

export type CommuteBand = 'excellent' | 'good' | 'fair' | 'poor';
export type CommuteMode = 'walk' | 'subway' | 'multi_leg';

export type CommuteScore = {
  eta_minutes: number;
  score: number;
  band: CommuteBand;
  mode: CommuteMode;
  confidence: 'estimated';
  origin_borough?: Borough;
  profile_anchor?: 'home' | 'work' | 'balanced';
  personalized: boolean;
};

export type CommuteScoringOptions = {
  base_buffer_minutes: number;
  borough_base_minutes: Partial<Record<Borough, number>>;
};

const defaultBoroughBaseMinutes: Record<Borough, number> = {
  manhattan: 8,
  brooklyn: 12,
  queens: 16,
  bronx: 18,
  staten_island: 28,
};

export const defaultCommuteScoringOptions: CommuteScoringOptions = {
  base_buffer_minutes: 6,
  borough_base_minutes: defaultBoroughBaseMinutes,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveMode(etaMinutes: number): CommuteMode {
  if (etaMinutes <= 20) return 'walk';
  if (etaMinutes <= 45) return 'subway';
  return 'multi_leg';
}

function resolveBand(score: number): CommuteBand {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export function computeCommuteScore(input: {
  borough: Borough;
  walk_minutes: number;
  commute_profile?: {
    origin_borough?: Borough;
    profile_anchor?: 'home' | 'work' | 'balanced';
    departure_hour?: number;
  };
  options?: Partial<CommuteScoringOptions>;
}): CommuteScore {
  const options = {
    ...defaultCommuteScoringOptions,
    ...(input.options ?? {}),
    borough_base_minutes: {
      ...defaultCommuteScoringOptions.borough_base_minutes,
      ...(input.options?.borough_base_minutes ?? {}),
    },
  };

  const walkMinutes = clamp(Math.round(input.walk_minutes), 0, 180);
  const boroughBase = options.borough_base_minutes[input.borough] ?? defaultBoroughBaseMinutes[input.borough];
  let etaMinutes = options.base_buffer_minutes + boroughBase + walkMinutes;
  const originBorough = input.commute_profile?.origin_borough;
  if (originBorough && originBorough !== input.borough) {
    etaMinutes += 12;
  }
  const departureHour = input.commute_profile?.departure_hour;
  if (typeof departureHour === 'number' && ((departureHour >= 7 && departureHour <= 9) || (departureHour >= 17 && departureHour <= 19))) {
    etaMinutes += 5;
  }
  etaMinutes = clamp(Math.round(etaMinutes), 1, 180);
  const score = clamp(100 - etaMinutes * 1.7, 5, 100);

  return {
    eta_minutes: etaMinutes,
    score: Number(score.toFixed(1)),
    band: resolveBand(score),
    mode: resolveMode(etaMinutes),
    confidence: 'estimated',
    origin_borough: originBorough,
    profile_anchor: input.commute_profile?.profile_anchor,
    personalized: Boolean(originBorough),
  };
}
