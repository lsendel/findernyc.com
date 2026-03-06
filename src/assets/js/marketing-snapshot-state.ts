import type { WaitlistFollowUpRoute } from './intake-routing';

type MarketingSnapshotPlaybookProgressStore = Record<string, {
  completed_steps: number[];
  updated_at: string;
}>;

export type MarketingSnapshotPreferences = {
  auto_run_top_opportunity: boolean;
  auto_run_recovery: boolean;
  auto_run_escalation: boolean;
  escalation_cooldown_hours: 6 | 12 | 24 | 48;
  auto_apply_recommended: boolean;
  auto_run_pause_until: string | null;
};

const DEFAULT_MARKETING_SNAPSHOT_PREFERENCES: MarketingSnapshotPreferences = {
  auto_run_top_opportunity: true,
  auto_run_recovery: true,
  auto_run_escalation: true,
  escalation_cooldown_hours: 24,
  auto_apply_recommended: true,
  auto_run_pause_until: null,
};

export function buildMarketingPlaybookKey(playbook: {
  title: string;
  focus_query: string;
  recommended_route: WaitlistFollowUpRoute;
}): string {
  const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
  return `${playbook.recommended_route}|${normalize(playbook.focus_query)}|${normalize(playbook.title)}`;
}

function readMarketingPlaybookProgressStore(storageKey: string): MarketingSnapshotPlaybookProgressStore {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as MarketingSnapshotPlaybookProgressStore;
  } catch {
    return {};
  }
}

export function readMarketingPlaybookCompletedSteps(
  storageKey: string,
  playbookKey: string,
  stepCount: number,
): Set<number> {
  const store = readMarketingPlaybookProgressStore(storageKey);
  const record = store[playbookKey];
  if (!record || !Array.isArray(record.completed_steps)) return new Set<number>();
  const next = new Set<number>();
  for (const value of record.completed_steps) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < stepCount) {
      next.add(value);
    }
  }
  return next;
}

export function writeMarketingPlaybookCompletedSteps(
  storageKey: string,
  playbookKey: string,
  completedSteps: Set<number>,
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const store = readMarketingPlaybookProgressStore(storageKey);
    store[playbookKey] = {
      completed_steps: Array.from(completedSteps).sort((a, b) => a - b),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // Best-effort only.
  }
}

export function readMarketingSnapshotPreferences(storageKey: string): MarketingSnapshotPreferences {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_MARKETING_SNAPSHOT_PREFERENCES };
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { ...DEFAULT_MARKETING_SNAPSHOT_PREFERENCES };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_MARKETING_SNAPSHOT_PREFERENCES };
    }
    const record = parsed as {
      auto_run_top_opportunity?: unknown;
      auto_run_recovery?: unknown;
      auto_run_escalation?: unknown;
      escalation_cooldown_hours?: unknown;
      auto_apply_recommended?: unknown;
      auto_run_pause_until?: unknown;
    };
    const cooldownRaw = record.escalation_cooldown_hours;
    const cooldown = (
      cooldownRaw === 6
      || cooldownRaw === 12
      || cooldownRaw === 24
      || cooldownRaw === 48
    )
      ? cooldownRaw
      : 24;
    const pauseRaw = record.auto_run_pause_until;
    const pauseUntil = (
      typeof pauseRaw === 'string'
      && Number.isFinite(new Date(pauseRaw).getTime())
    )
      ? pauseRaw
      : null;
    return {
      auto_run_top_opportunity: typeof record.auto_run_top_opportunity === 'boolean'
        ? record.auto_run_top_opportunity
        : true,
      auto_run_recovery: typeof record.auto_run_recovery === 'boolean'
        ? record.auto_run_recovery
        : true,
      auto_run_escalation: typeof record.auto_run_escalation === 'boolean'
        ? record.auto_run_escalation
        : true,
      escalation_cooldown_hours: cooldown,
      auto_apply_recommended: typeof record.auto_apply_recommended === 'boolean'
        ? record.auto_apply_recommended
        : true,
      auto_run_pause_until: pauseUntil,
    };
  } catch {
    return { ...DEFAULT_MARKETING_SNAPSHOT_PREFERENCES };
  }
}

export function writeMarketingSnapshotPreferences(
  storageKey: string,
  preferences: MarketingSnapshotPreferences,
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      auto_run_top_opportunity: preferences.auto_run_top_opportunity,
      auto_run_recovery: preferences.auto_run_recovery,
      auto_run_escalation: preferences.auto_run_escalation,
      escalation_cooldown_hours: preferences.escalation_cooldown_hours,
      auto_apply_recommended: preferences.auto_apply_recommended,
      auto_run_pause_until: preferences.auto_run_pause_until,
      updated_at: new Date().toISOString(),
    }));
  } catch {
    // Best-effort only.
  }
}
