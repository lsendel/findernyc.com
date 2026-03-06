import { Hono } from 'hono';
import { resolveFeatureFlags } from '../../config/feature-flags';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    ANALYTICS_GA4_MEASUREMENT_ID?: string;
    ANALYTICS_SEGMENT_WRITE_KEY?: string;
  };
};

export const configRouter = new Hono<Env>();

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

configRouter.get('/', (c) => {
  let bindings: Env['Bindings'] = {};
  try {
    const maybeEnv = c.env;
    if (maybeEnv && typeof maybeEnv === 'object') {
      bindings = maybeEnv;
    }
  } catch {
    bindings = {};
  }
  const feature_flags = resolveFeatureFlags(bindings);
  const ga4_measurement_id = normalizeOptionalString(bindings.ANALYTICS_GA4_MEASUREMENT_ID);
  const segment_write_key = normalizeOptionalString(bindings.ANALYTICS_SEGMENT_WRITE_KEY);
  return c.json(
    {
      feature_flags,
      analytics: {
        ga4_measurement_id,
        segment_write_key,
        providers: {
          ga4: Boolean(ga4_measurement_id),
          segment: Boolean(segment_write_key),
        },
      },
      generated_at: new Date().toISOString(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  );
});
