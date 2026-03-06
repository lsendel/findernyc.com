import type { Borough, EventCategory, SearchFilters } from './unified-search';

export type NeighborhoodVibe =
  | 'creative'
  | 'family'
  | 'foodie'
  | 'professional'
  | 'quiet'
  | 'nightlife'
  | 'wellness';

export type NeighborhoodFitBand = 'strong' | 'moderate' | 'weak';

export type NeighborhoodProfile = {
  preferred_vibes?: NeighborhoodVibe[];
  preferred_boroughs?: Borough[];
  crowd_tolerance?: 'low' | 'medium' | 'high';
  budget_preference?: 'free' | 'value' | 'premium';
};

export type NeighborhoodFitWeights = {
  vibe_match: number;
  borough_preference: number;
  crowd_alignment: number;
  budget_alignment: number;
  query_vibe_match: number;
  walkability_bonus: number;
  filter_alignment: number;
};

export type NeighborhoodFitScore = {
  score: number;
  band: NeighborhoodFitBand;
  dominant_vibe: NeighborhoodVibe;
  reasons: string[];
  personalized: boolean;
};

const categoryToVibes: Record<EventCategory, NeighborhoodVibe[]> = {
  music: ['creative', 'nightlife'],
  food: ['foodie', 'creative'],
  arts: ['creative', 'quiet'],
  networking: ['professional', 'nightlife'],
  family: ['family', 'quiet'],
  wellness: ['wellness', 'quiet'],
};

const vibeKeywords: Record<NeighborhoodVibe, string[]> = {
  creative: ['creative', 'arts', 'gallery', 'indie'],
  family: ['family', 'kids', 'children'],
  foodie: ['food', 'dinner', 'market', 'brunch'],
  professional: ['networking', 'startup', 'founder', 'business'],
  quiet: ['quiet', 'calm', 'relaxed'],
  nightlife: ['night', 'late', 'rooftop', 'bar', 'dj'],
  wellness: ['wellness', 'fitness', 'run', 'yoga'],
};

const defaultWeights: NeighborhoodFitWeights = {
  vibe_match: 22,
  borough_preference: 16,
  crowd_alignment: 12,
  budget_alignment: 12,
  query_vibe_match: 18,
  walkability_bonus: 10,
  filter_alignment: 10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function inferQueryVibes(query: string): NeighborhoodVibe[] {
  const normalized = normalize(query);
  const matches: NeighborhoodVibe[] = [];
  for (const [vibe, keywords] of Object.entries(vibeKeywords) as Array<[NeighborhoodVibe, string[]]>) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      matches.push(vibe);
    }
  }
  return matches;
}

function deriveCrowd(event: { category: EventCategory; start_hour: number }): 'low' | 'medium' | 'high' {
  if (event.category === 'networking' || event.start_hour >= 19) return 'high';
  if (event.start_hour >= 14) return 'medium';
  return 'low';
}

function deriveBudget(eventPrice: number): 'free' | 'value' | 'premium' {
  if (eventPrice <= 0) return 'free';
  if (eventPrice <= 20) return 'value';
  return 'premium';
}

function resolveBand(score: number): NeighborhoodFitBand {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'moderate';
  return 'weak';
}

export function computeNeighborhoodFit(input: {
  event: {
    borough: Borough;
    category: EventCategory;
    price: number;
    start_hour: number;
    walk_minutes: number;
  };
  query: string;
  applied_filters: SearchFilters;
  profile?: NeighborhoodProfile;
  weights?: Partial<NeighborhoodFitWeights>;
}): NeighborhoodFitScore {
  const weights: NeighborhoodFitWeights = {
    ...defaultWeights,
    ...(input.weights ?? {}),
  };

  let score = 20;
  const reasons: string[] = [];
  const eventVibes = categoryToVibes[input.event.category];
  const queryVibes = inferQueryVibes(input.query);
  const profileVibes = input.profile?.preferred_vibes ?? [];

  if (profileVibes.some((vibe) => eventVibes.includes(vibe))) {
    score += weights.vibe_match;
    reasons.push('Matches your preferred neighborhood vibe.');
  } else if (queryVibes.some((vibe) => eventVibes.includes(vibe))) {
    score += weights.query_vibe_match;
    reasons.push('Aligned with the vibe in your search query.');
  }

  if (input.profile?.preferred_boroughs?.includes(input.event.borough)) {
    score += weights.borough_preference;
    reasons.push('Located in your preferred borough.');
  } else if (input.applied_filters.borough && input.applied_filters.borough === input.event.borough) {
    score += weights.filter_alignment;
    reasons.push('Matches your borough filter.');
  }

  const eventCrowd = deriveCrowd(input.event);
  if (input.profile?.crowd_tolerance && input.profile.crowd_tolerance === eventCrowd) {
    score += weights.crowd_alignment;
    reasons.push('Crowd level fits your preference.');
  }

  const eventBudget = deriveBudget(input.event.price);
  if (input.profile?.budget_preference && input.profile.budget_preference === eventBudget) {
    score += weights.budget_alignment;
    reasons.push('Price point aligns with your budget preference.');
  }

  const walkBonus = clamp((30 - input.event.walk_minutes) / 30, 0, 1) * weights.walkability_bonus;
  score += walkBonus;
  if (walkBonus >= weights.walkability_bonus * 0.5) {
    reasons.push('Easy to reach within your local radius.');
  }

  const finalScore = clamp(score, 5, 100);
  return {
    score: Number(finalScore.toFixed(1)),
    band: resolveBand(finalScore),
    dominant_vibe: eventVibes[0],
    reasons: reasons.slice(0, 2),
    personalized: Boolean(input.profile && (
      (input.profile.preferred_vibes && input.profile.preferred_vibes.length > 0)
      || (input.profile.preferred_boroughs && input.profile.preferred_boroughs.length > 0)
      || input.profile.crowd_tolerance
      || input.profile.budget_preference
    )),
  };
}
