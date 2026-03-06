import { describe, it, expect } from 'vitest';
import { featureFlagKeys } from '../../src/config/feature-flags';
import app from '../../src/index';

describe('GET /api/config', () => {
  it('returns 200 and all declared feature flags', async () => {
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);

    const json = await res.json() as {
      feature_flags: Record<string, boolean>;
      analytics: {
        ga4_measurement_id?: string;
        segment_write_key?: string;
        providers: {
          ga4: boolean;
          segment: boolean;
        };
      };
      generated_at: string;
    };

    expect(typeof json.generated_at).toBe('string');
    for (const key of featureFlagKeys) {
      expect(typeof json.feature_flags[key]).toBe('boolean');
    }
    expect(typeof json.analytics.providers.ga4).toBe('boolean');
    expect(typeof json.analytics.providers.segment).toBe('boolean');
  });

  it('applies env flag overrides', async () => {
    const res = await app.request(
      '/api/config',
      undefined,
      {
        FEATURE_FLAGS: 'unified_smart_search,+compare_mode,-experimentation_framework',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { feature_flags: Record<string, boolean> };

    expect(json.feature_flags.unified_smart_search).toBe(true);
    expect(json.feature_flags.compare_mode).toBe(true);
    expect(json.feature_flags.experimentation_framework).toBe(false);
  });

  it('returns normalized analytics provider config from env bindings', async () => {
    const res = await app.request(
      '/api/config',
      undefined,
      {
        ANALYTICS_GA4_MEASUREMENT_ID: '  G-TEST12345  ',
        ANALYTICS_SEGMENT_WRITE_KEY: '   ',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      analytics: {
        ga4_measurement_id?: string;
        segment_write_key?: string;
        providers: {
          ga4: boolean;
          segment: boolean;
        };
      };
    };

    expect(json.analytics.ga4_measurement_id).toBe('G-TEST12345');
    expect(json.analytics.segment_write_key).toBeUndefined();
    expect(json.analytics.providers.ga4).toBe(true);
    expect(json.analytics.providers.segment).toBe(false);
  });
});
