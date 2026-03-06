import type { FraudRiskAssessment, FraudRiskBand, FraudReviewRoute } from './risk-scoring';

export type FraudReviewDecision = 'cleared' | 'confirmed_fraud' | 'false_positive';
export type FraudQueueStatus = 'pending' | FraudReviewDecision;

export type FraudReviewQueueItem = {
  event_id: string;
  title: string;
  organizer_id: string;
  risk_score: number;
  risk_band: FraudRiskBand;
  review_route: FraudReviewRoute;
  reasons: string[];
  status: FraudQueueStatus;
  reviewer?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

const reviewQueue = new Map<string, FraudReviewQueueItem>();

function nowIso(): string {
  return new Date().toISOString();
}

function toSortedArray(items: Iterable<FraudReviewQueueItem>): FraudReviewQueueItem[] {
  return Array.from(items).sort((a, b) => (
    b.risk_score - a.risk_score
    || a.created_at.localeCompare(b.created_at)
  ));
}

export function enqueueFraudReviewCandidate(input: {
  event_id: string;
  title: string;
  organizer_id: string;
  assessment: FraudRiskAssessment;
}): FraudReviewQueueItem | undefined {
  if (input.assessment.review_route !== 'review_queue' && input.assessment.review_route !== 'block') {
    return undefined;
  }

  const existing = reviewQueue.get(input.event_id);
  const timestamp = nowIso();
  const nextItem: FraudReviewQueueItem = {
    event_id: input.event_id,
    title: input.title,
    organizer_id: input.organizer_id,
    risk_score: input.assessment.score,
    risk_band: input.assessment.band,
    review_route: input.assessment.review_route,
    reasons: input.assessment.reasons,
    status: existing?.status === 'pending' ? 'pending' : (existing?.status ?? 'pending'),
    reviewer: existing?.reviewer,
    notes: existing?.notes,
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
  };
  reviewQueue.set(input.event_id, nextItem);
  return nextItem;
}

export function listFraudReviewQueue(input?: {
  status?: FraudQueueStatus | 'all';
  limit?: number;
}): FraudReviewQueueItem[] {
  const status = input?.status ?? 'pending';
  const limit = Math.max(1, Math.min(200, Math.floor(input?.limit ?? 50)));
  const items = toSortedArray(reviewQueue.values()).filter((item) => (
    status === 'all' ? true : item.status === status
  ));
  return items.slice(0, limit);
}

export function resolveFraudReview(input: {
  event_id: string;
  decision: FraudReviewDecision;
  reviewer?: string;
  notes?: string;
}): FraudReviewQueueItem | undefined {
  const current = reviewQueue.get(input.event_id);
  if (!current) return undefined;

  const nextItem: FraudReviewQueueItem = {
    ...current,
    status: input.decision,
    reviewer: input.reviewer?.trim() || current.reviewer,
    notes: input.notes?.trim() || current.notes,
    updated_at: nowIso(),
  };
  reviewQueue.set(input.event_id, nextItem);
  return nextItem;
}

export function getFraudDashboardSlice(): {
  queue_size: number;
  pending_count: number;
  high_risk_pending_count: number;
  reviewed_count: number;
  false_positive_count: number;
  false_positive_rate: number;
  outcomes: {
    cleared: number;
    confirmed_fraud: number;
    false_positive: number;
  };
} {
  const items = Array.from(reviewQueue.values());
  const pending = items.filter((item) => item.status === 'pending');
  const reviewed = items.filter((item) => item.status !== 'pending');
  const falsePositiveCount = items.filter((item) => item.status === 'false_positive').length;
  const clearedCount = items.filter((item) => item.status === 'cleared').length;
  const confirmedFraudCount = items.filter((item) => item.status === 'confirmed_fraud').length;
  const falsePositiveRate = reviewed.length > 0
    ? Number((falsePositiveCount / reviewed.length).toFixed(4))
    : 0;

  return {
    queue_size: items.length,
    pending_count: pending.length,
    high_risk_pending_count: pending.filter((item) => item.risk_band === 'high').length,
    reviewed_count: reviewed.length,
    false_positive_count: falsePositiveCount,
    false_positive_rate: falsePositiveRate,
    outcomes: {
      cleared: clearedCount,
      confirmed_fraud: confirmedFraudCount,
      false_positive: falsePositiveCount,
    },
  };
}

export function __resetFraudReviewQueueForTests(): void {
  reviewQueue.clear();
}
