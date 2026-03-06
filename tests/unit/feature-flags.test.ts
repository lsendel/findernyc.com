import { describe, it, expect } from 'vitest';
import { defaultFeatureFlags, featureFlagKeys, resolveFeatureFlags } from '../../src/config/feature-flags';

describe('feature flags resolution', () => {
  it('returns defaults when no env bindings are provided', () => {
    const resolved = resolveFeatureFlags();
    expect(resolved).toEqual(defaultFeatureFlags);
  });

  it('applies JSON values for known keys only', () => {
    const resolved = resolveFeatureFlags({
      FEATURE_FLAGS_JSON: JSON.stringify({
        unified_smart_search: true,
        nonexistent_flag: true,
        experimentation_framework: false,
      }),
    });

    expect(resolved.unified_smart_search).toBe(true);
    expect(resolved.experimentation_framework).toBe(false);
    expect((resolved as Record<string, unknown>).nonexistent_flag).toBeUndefined();
  });

  it('applies list overrides after JSON values', () => {
    const resolved = resolveFeatureFlags({
      FEATURE_FLAGS_JSON: JSON.stringify({
        unified_smart_search: false,
        compare_mode: false,
      }),
      FEATURE_FLAGS: 'unified_smart_search,+compare_mode,-experimentation_framework',
    });

    expect(resolved.unified_smart_search).toBe(true);
    expect(resolved.compare_mode).toBe(true);
    expect(resolved.experimentation_framework).toBe(false);
  });

  it('supports all and -all list controls', () => {
    const resolved = resolveFeatureFlags({
      FEATURE_FLAGS: 'all,-insights_hub,-all,+insights_hub',
    });

    const enabledKeys = featureFlagKeys.filter((key) => resolved[key]);
    expect(enabledKeys).toEqual(['insights_hub']);
  });
});
