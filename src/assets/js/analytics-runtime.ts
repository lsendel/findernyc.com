type WindowAnalytics = {
  track?: (eventName: string, properties?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    analytics?: WindowAnalytics;
  }
}

export type RuntimeAnalyticsConfig = {
  ga4_measurement_id?: string;
  segment_write_key?: string;
  providers: {
    ga4: boolean;
    segment: boolean;
  };
};

export type RuntimeAnalyticsEvent = {
  event_name: string;
  properties?: Record<string, unknown>;
  session_id?: string;
};

export function createDefaultRuntimeAnalyticsConfig(): RuntimeAnalyticsConfig {
  return {
    providers: {
      ga4: false,
      segment: false,
    },
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeProviderEnabled(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

export function parseRuntimeAnalyticsConfig(payload: unknown): RuntimeAnalyticsConfig {
  if (!payload || typeof payload !== 'object') return createDefaultRuntimeAnalyticsConfig();

  const record = payload as Record<string, unknown>;
  const ga4_measurement_id = normalizeOptionalString(record.ga4_measurement_id);
  const segment_write_key = normalizeOptionalString(record.segment_write_key);
  const providerRecord = (record.providers && typeof record.providers === 'object')
    ? record.providers as Record<string, unknown>
    : null;

  const ga4Enabled = normalizeProviderEnabled(providerRecord?.ga4, Boolean(ga4_measurement_id));
  const segmentEnabled = normalizeProviderEnabled(providerRecord?.segment, Boolean(segment_write_key));

  return {
    ...(ga4_measurement_id ? { ga4_measurement_id } : {}),
    ...(segment_write_key ? { segment_write_key } : {}),
    providers: {
      ga4: ga4Enabled,
      segment: segmentEnabled,
    },
  };
}

export function forwardAnalyticsToProviders(
  config: RuntimeAnalyticsConfig,
  payload: RuntimeAnalyticsEvent,
): void {
  const properties = {
    ...(payload.properties ?? {}),
    ...(payload.session_id ? { session_id: payload.session_id } : {}),
  };

  if (config.providers.ga4 && typeof window.gtag === 'function') {
    try {
      window.gtag('event', payload.event_name, properties);
    } catch {
      // provider forwarding is best effort only.
    }
  }

  if (config.providers.segment && typeof window.analytics?.track === 'function') {
    try {
      window.analytics.track(payload.event_name, properties);
    } catch {
      // provider forwarding is best effort only.
    }
  }
}
