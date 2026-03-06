const FEATURE_FLAG_KEYS = [
  'unified_smart_search',
  'realtime_availability_sync',
  'price_transparency_breakdown',
  'commute_time_scoring',
  'neighborhood_fit_scoring',
  'personalized_recommendations',
  'saved_searches_alerts',
  'compare_mode',
  'best_value_ranking',
  'verified_listing_badges',
  'fraud_risk_scoring',
  'review_authenticity_scoring',
  'one_click_inquiry_application',
  'in_app_scheduling_calendar_sync',
  'ai_concierge_chat',
  'ai_shortlist_builder',
  'ai_negotiation_prep_assistant',
  'ai_document_helper',
  'ai_follow_up_automation',
  'ai_next_best_action',
  'multi_channel_notifications',
  'multi_language_ux',
  'accessibility_first_mode',
  'dynamic_filter_builder',
  'user_defined_dashboards',
  'api_webhook_access',
  'partner_workspace_roles',
  'white_label_partner_portals',
  'experimentation_framework',
  'insights_hub',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const featureFlagKeys = FEATURE_FLAG_KEYS;

export const defaultFeatureFlags: FeatureFlags = Object.freeze({
  unified_smart_search: true,
  realtime_availability_sync: false,
  price_transparency_breakdown: true,
  commute_time_scoring: true,
  neighborhood_fit_scoring: true,
  personalized_recommendations: true,
  saved_searches_alerts: true,
  compare_mode: true,
  best_value_ranking: true,
  verified_listing_badges: true,
  fraud_risk_scoring: false,
  review_authenticity_scoring: false,
  one_click_inquiry_application: true,
  in_app_scheduling_calendar_sync: true,
  ai_concierge_chat: false,
  ai_shortlist_builder: false,
  ai_negotiation_prep_assistant: false,
  ai_document_helper: false,
  ai_follow_up_automation: false,
  ai_next_best_action: false,
  multi_channel_notifications: false,
  multi_language_ux: false,
  accessibility_first_mode: false,
  dynamic_filter_builder: true,
  user_defined_dashboards: true,
  api_webhook_access: false,
  partner_workspace_roles: false,
  white_label_partner_portals: false,
  experimentation_framework: true,
  insights_hub: true,
});

const featureFlagSet = new Set<FeatureFlagKey>(featureFlagKeys);

type EnvBindings = {
  FEATURE_FLAGS?: string;
  FEATURE_FLAGS_JSON?: string;
};

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'on', 'yes', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'no', 'disabled'].includes(normalized)) return false;
  return undefined;
}

function cloneFlags(base: FeatureFlags): FeatureFlags {
  return { ...base };
}

function assignFlagIfKnown(flags: FeatureFlags, key: string, value: boolean): void {
  if (!featureFlagSet.has(key as FeatureFlagKey)) return;
  flags[key as FeatureFlagKey] = value;
}

function parseFeatureFlagsList(source: string, seed: FeatureFlags): FeatureFlags {
  const flags = cloneFlags(seed);
  const tokens = source
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (token === 'all') {
      for (const key of featureFlagKeys) flags[key] = true;
      continue;
    }
    if (token === '-all') {
      for (const key of featureFlagKeys) flags[key] = false;
      continue;
    }

    if (token.startsWith('-')) {
      assignFlagIfKnown(flags, token.slice(1), false);
      continue;
    }

    if (token.startsWith('+')) {
      assignFlagIfKnown(flags, token.slice(1), true);
      continue;
    }

    assignFlagIfKnown(flags, token, true);
  }

  return flags;
}

function parseFeatureFlagsJson(source: string, seed: FeatureFlags): FeatureFlags {
  const flags = cloneFlags(seed);

  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return flags;

    for (const [key, rawValue] of Object.entries(parsed)) {
      const bool = parseBoolean(rawValue);
      if (bool === undefined) continue;
      assignFlagIfKnown(flags, key, bool);
    }
    return flags;
  } catch {
    return flags;
  }
}

export function resolveFeatureFlags(bindings?: EnvBindings): FeatureFlags {
  let flags = cloneFlags(defaultFeatureFlags);

  if (bindings?.FEATURE_FLAGS_JSON?.trim()) {
    flags = parseFeatureFlagsJson(bindings.FEATURE_FLAGS_JSON, flags);
  }

  if (bindings?.FEATURE_FLAGS?.trim()) {
    flags = parseFeatureFlagsList(bindings.FEATURE_FLAGS, flags);
  }

  return flags;
}

export function isFeatureEnabled(flags: FeatureFlags, key: FeatureFlagKey): boolean {
  return flags[key] === true;
}
