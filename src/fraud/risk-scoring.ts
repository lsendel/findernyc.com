import type { ListingVerificationStatus } from '../search/verified-listings';
import type { EventCategory } from '../search/unified-search';

export type FraudRiskBand = 'low' | 'medium' | 'high';
export type FraudReviewRoute = 'allow' | 'review_queue' | 'block';

export type FraudRiskAssessment = {
  score: number;
  band: FraudRiskBand;
  review_route: FraudReviewRoute;
  reasons: string[];
  rules_triggered: string[];
  model_version: string;
};

const suspiciousKeywords = [
  'wire transfer',
  'crypto only',
  'guaranteed seat',
  'instant refund',
  'cash app only',
  'venmo only',
  'send deposit',
];

const categoryBaselineRisk: Record<EventCategory, number> = {
  music: 16,
  food: 12,
  arts: 11,
  networking: 20,
  family: 9,
  wellness: 10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveBand(score: number): FraudRiskBand {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export function computeFraudRisk(input: {
  event: {
    id: string;
    title: string;
    description: string;
    category: EventCategory;
    price: number;
  };
  query: string;
  verification_status?: ListingVerificationStatus;
}): FraudRiskAssessment {
  const rules: string[] = [];
  const reasons: string[] = [];
  let score = categoryBaselineRisk[input.event.category] ?? 12;
  const corpus = `${input.event.title} ${input.event.description} ${input.query}`.toLowerCase();

  for (const keyword of suspiciousKeywords) {
    if (corpus.includes(keyword)) {
      score += 22;
      rules.push(`keyword:${keyword}`);
    }
  }
  if (rules.length > 0) {
    reasons.push('Suspicious payment or guarantee language detected.');
  }

  if (input.event.price > 75) {
    score += 16;
    rules.push('high_price');
    reasons.push('High ticket value increases fraud exposure.');
  }
  if (input.event.price === 0 && (input.event.category === 'networking' || input.event.category === 'music')) {
    score += 9;
    rules.push('free_high_demand');
    reasons.push('Free high-demand listing requires extra review.');
  }

  if (input.verification_status === 'unverified') {
    score += 24;
    rules.push('organizer_unverified');
    reasons.push('Organizer is not verified.');
  } else if (input.verification_status === 'pending') {
    score += 12;
    rules.push('organizer_pending');
    reasons.push('Organizer verification is still pending.');
  } else if (input.verification_status === 'verified') {
    score -= 8;
    rules.push('organizer_verified');
  }

  const boundedScore = clamp(Math.round(score), 0, 100);
  const band = resolveBand(boundedScore);
  const reviewRoute: FraudReviewRoute = boundedScore >= 90
    ? 'block'
    : band === 'high' || band === 'medium'
      ? 'review_queue'
      : 'allow';

  return {
    score: boundedScore,
    band,
    review_route: reviewRoute,
    reasons: reasons.slice(0, 3),
    rules_triggered: rules.slice(0, 6),
    model_version: 'fraud-risk-v1.0.0',
  };
}
