import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMarketingPlaybookKey,
  readMarketingPlaybookCompletedSteps,
  readMarketingSnapshotPreferences,
  writeMarketingPlaybookCompletedSteps,
  writeMarketingSnapshotPreferences,
} from '../../src/assets/js/marketing-snapshot-state';

function createStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  } as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('marketing snapshot state', () => {
  it('builds deterministic playbook keys with normalized title/query values', () => {
    const key = buildMarketingPlaybookKey({
      title: '  Weekly  Ranking Plan  ',
      focus_query: '  Local Events Near Me  ',
      recommended_route: 'marketing_consult',
    });

    expect(key).toBe('marketing_consult|local events near me|weekly ranking plan');
  });

  it('reads default preferences when storage is unavailable or malformed', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readMarketingSnapshotPreferences('prefs-key')).toEqual({
      auto_run_top_opportunity: true,
      auto_run_recovery: true,
      auto_run_escalation: true,
      escalation_cooldown_hours: 24,
      auto_apply_recommended: true,
      auto_run_pause_until: null,
    });

    vi.stubGlobal('localStorage', createStorage({ 'prefs-key': 'not-json' }));
    expect(readMarketingSnapshotPreferences('prefs-key')).toEqual({
      auto_run_top_opportunity: true,
      auto_run_recovery: true,
      auto_run_escalation: true,
      escalation_cooldown_hours: 24,
      auto_apply_recommended: true,
      auto_run_pause_until: null,
    });
  });

  it('persists and reloads preferences by storage key', () => {
    const storage = createStorage();
    vi.stubGlobal('localStorage', storage);

    writeMarketingSnapshotPreferences('prefs-key', {
      auto_run_top_opportunity: false,
      auto_run_recovery: true,
      auto_run_escalation: false,
      escalation_cooldown_hours: 48,
      auto_apply_recommended: false,
      auto_run_pause_until: '2026-03-05T12:00:00.000Z',
    });

    expect(readMarketingSnapshotPreferences('prefs-key')).toEqual({
      auto_run_top_opportunity: false,
      auto_run_recovery: true,
      auto_run_escalation: false,
      escalation_cooldown_hours: 48,
      auto_apply_recommended: false,
      auto_run_pause_until: '2026-03-05T12:00:00.000Z',
    });
  });

  it('sanitizes read playbook completed steps to valid in-range integers', () => {
    const storage = createStorage({
      'progress-key': JSON.stringify({
        playbookA: {
          completed_steps: [0, 2, 2, -1, 8, 1.5, 'bad'],
          updated_at: '2026-03-05T00:00:00.000Z',
        },
      }),
    });
    vi.stubGlobal('localStorage', storage);

    const completed = readMarketingPlaybookCompletedSteps('progress-key', 'playbookA', 3);

    expect(Array.from(completed)).toEqual([0, 2]);
  });

  it('writes playbook completed steps as sorted persisted arrays', () => {
    const storage = createStorage();
    vi.stubGlobal('localStorage', storage);

    writeMarketingPlaybookCompletedSteps('progress-key', 'playbookA', new Set([3, 1, 2]));
    const persisted = JSON.parse(String(storage.getItem('progress-key'))) as Record<string, {
      completed_steps: number[];
      updated_at: string;
    }>;

    expect(persisted.playbookA.completed_steps).toEqual([1, 2, 3]);
    expect(typeof persisted.playbookA.updated_at).toBe('string');
  });
});
