import type { EventCategory } from './unified-search';

export type ReviewAuthenticityBand = 'trusted' | 'mixed' | 'suspicious';

export type ReviewAuthenticityScore = {
  score: number;
  band: ReviewAuthenticityBand;
  review_count: number;
  visible_review_count: number;
  suppressed_review_count: number;
  suppression_applied: boolean;
  reasons: string[];
};

type ReviewSignal = {
  review_count: number;
  suspicious_review_count: number;
  trusted_reviewer_ratio: number;
  velocity_spike: boolean;
};

const reviewSignalsByEventId: Record<string, ReviewSignal> = {
  evt_001: { review_count: 34, suspicious_review_count: 2, trusted_reviewer_ratio: 0.82, velocity_spike: false },
  evt_002: { review_count: 21, suspicious_review_count: 9, trusted_reviewer_ratio: 0.33, velocity_spike: true },
  evt_003: { review_count: 47, suspicious_review_count: 3, trusted_reviewer_ratio: 0.86, velocity_spike: false },
  evt_004: { review_count: 18, suspicious_review_count: 2, trusted_reviewer_ratio: 0.74, velocity_spike: false },
  evt_005: { review_count: 29, suspicious_review_count: 1, trusted_reviewer_ratio: 0.91, velocity_spike: false },
  evt_006: { review_count: 16, suspicious_review_count: 4, trusted_reviewer_ratio: 0.58, velocity_spike: false },
};

const categoryBaseAuthenticity: Record<EventCategory, number> = {
  music: 72,
  food: 76,
  arts: 74,
  networking: 63,
  family: 79,
  wellness: 78,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveBand(score: number): ReviewAuthenticityBand {
  if (score >= 80) return 'trusted';
  if (score >= 58) return 'mixed';
  return 'suspicious';
}

export function computeReviewAuthenticity(input: {
  event_id: string;
  category: EventCategory;
}): ReviewAuthenticityScore {
  const signal = reviewSignalsByEventId[input.event_id] ?? {
    review_count: 12,
    suspicious_review_count: 2,
    trusted_reviewer_ratio: 0.65,
    velocity_spike: false,
  };

  const suspiciousRatio = signal.review_count > 0
    ? signal.suspicious_review_count / signal.review_count
    : 0;
  let score = categoryBaseAuthenticity[input.category];
  score += signal.trusted_reviewer_ratio * 24;
  score -= suspiciousRatio * 48;
  if (signal.velocity_spike) score -= 8;
  score += Math.min(10, signal.review_count / 8);
  const boundedScore = clamp(Math.round(score), 5, 100);
  const band = resolveBand(boundedScore);

  let suppressedReviewCount = 0;
  if (band === 'suspicious') {
    suppressedReviewCount = signal.suspicious_review_count;
  } else if (band === 'mixed') {
    suppressedReviewCount = Math.min(signal.suspicious_review_count, Math.floor(signal.suspicious_review_count / 2));
  }

  const visibleReviewCount = Math.max(0, signal.review_count - suppressedReviewCount);
  const reasons: string[] = [];
  if (signal.suspicious_review_count > 0) {
    reasons.push('Detected suspicious review patterns.');
  }
  if (signal.velocity_spike) {
    reasons.push('Recent review velocity spike under inspection.');
  }
  if (signal.trusted_reviewer_ratio >= 0.75) {
    reasons.push('Strong trusted-reviewer participation.');
  }

  return {
    score: boundedScore,
    band,
    review_count: signal.review_count,
    visible_review_count: visibleReviewCount,
    suppressed_review_count: suppressedReviewCount,
    suppression_applied: suppressedReviewCount > 0,
    reasons: reasons.slice(0, 2),
  };
}
