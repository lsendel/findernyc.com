import { describe, it, expect } from 'vitest';
import { parseSearchIntent, runUnifiedSmartSearch } from '../../src/search/unified-search';

describe('unified search ranking calibration', () => {
  it('parses borough/category/price from natural language query', () => {
    const intent = parseSearchIntent('free jazz in brooklyn');
    expect(intent).toEqual({
      borough: 'brooklyn',
      category: 'music',
      max_price: 0,
    });
  });

  it('supports ranking-weight overrides for relevance tuning', () => {
    const baseline = runUnifiedSmartSearch({
      query: 'networking event',
      limit: 1,
    });

    const tuned = runUnifiedSmartSearch({
      query: 'networking event',
      limit: 1,
      ranking: {
        weights: {
          category_match: 10,
        },
      },
      filters: {
        category: 'networking',
      },
    });

    expect(baseline.results.length).toBeGreaterThan(0);
    expect(tuned.results.length).toBeGreaterThan(0);
    expect(tuned.results[0]?.category).toBe('networking');
  });
});
