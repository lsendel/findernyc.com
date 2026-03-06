import { describe, expect, it } from 'vitest';
import { computeReviewAuthenticity } from '../../src/search/review-authenticity';

describe('review authenticity scoring', () => {
  it('marks high-quality review signals as trusted', () => {
    const score = computeReviewAuthenticity({
      event_id: 'evt_003',
      category: 'food',
    });

    expect(score.band).toBe('trusted');
    expect(score.suppression_applied).toBe(false);
    expect(score.visible_review_count).toBe(score.review_count);
    expect(score.score).toBeGreaterThanOrEqual(80);
  });

  it('suppresses suspicious reviews for risky signals', () => {
    const score = computeReviewAuthenticity({
      event_id: 'evt_002',
      category: 'networking',
    });

    expect(score.band).toBe('suspicious');
    expect(score.suppression_applied).toBe(true);
    expect(score.suppressed_review_count).toBeGreaterThan(0);
    expect(score.visible_review_count).toBeLessThan(score.review_count);
  });
});
