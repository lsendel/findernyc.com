export type TenantPortalConfig = {
  tenant_id: string;
  brand_name: string;
  theme: {
    primary_color: string;
    accent_color: string;
    logo_url?: string;
  };
  feature_overrides: Record<string, boolean>;
  updated_at: string;
};

const configs = new Map<string, TenantPortalConfig>();

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTenantId(raw: string): string {
  return raw.trim().toLowerCase();
}

function defaultConfig(tenant_id: string): TenantPortalConfig {
  return {
    tenant_id: normalizeTenantId(tenant_id),
    brand_name: 'LocalGems Partner Portal',
    theme: {
      primary_color: '#10324a',
      accent_color: '#f4b400',
    },
    feature_overrides: {},
    updated_at: nowIso(),
  };
}

export function getTenantPortalConfig(tenant_id: string): TenantPortalConfig {
  const normalized = normalizeTenantId(tenant_id);
  const current = configs.get(normalized) ?? defaultConfig(normalized);
  if (!configs.has(normalized)) {
    configs.set(normalized, current);
  }
  return {
    ...current,
    theme: { ...current.theme },
    feature_overrides: { ...current.feature_overrides },
  };
}

export function upsertTenantPortalConfig(input: {
  tenant_id: string;
  brand_name?: string;
  theme?: {
    primary_color?: string;
    accent_color?: string;
    logo_url?: string;
  };
  feature_overrides?: Record<string, boolean>;
}): TenantPortalConfig {
  const current = getTenantPortalConfig(input.tenant_id);
  const next: TenantPortalConfig = {
    tenant_id: current.tenant_id,
    brand_name: input.brand_name?.trim() || current.brand_name,
    theme: {
      primary_color: input.theme?.primary_color?.trim() || current.theme.primary_color,
      accent_color: input.theme?.accent_color?.trim() || current.theme.accent_color,
      ...(input.theme?.logo_url?.trim()
        ? { logo_url: input.theme.logo_url.trim() }
        : current.theme.logo_url
          ? { logo_url: current.theme.logo_url }
          : {}),
    },
    feature_overrides: {
      ...current.feature_overrides,
      ...(input.feature_overrides ?? {}),
    },
    updated_at: nowIso(),
  };
  configs.set(next.tenant_id, next);
  return {
    ...next,
    theme: { ...next.theme },
    feature_overrides: { ...next.feature_overrides },
  };
}

export type PartnerPilotPhase = {
  phase: 'sandbox_validation' | 'staging_dry_run' | 'limited_production' | 'general_availability';
  status: 'pending' | 'in_progress' | 'completed';
  checklist: string[];
  updated_at: string;
};

const pilotPhases: PartnerPilotPhase[] = [
  {
    phase: 'sandbox_validation',
    status: 'in_progress',
    checklist: [
      'Validate role templates with partner ops users.',
      'Validate webhook auth/signature/replay controls.',
      'Run tenant-theme isolation smoke checks.',
    ],
    updated_at: nowIso(),
  },
  {
    phase: 'staging_dry_run',
    status: 'pending',
    checklist: [
      'Replay two weeks of integration events in staging.',
      'Validate dashboard + insights parity with baseline metrics.',
      'Complete accessibility and localization acceptance tests.',
    ],
    updated_at: nowIso(),
  },
  {
    phase: 'limited_production',
    status: 'pending',
    checklist: [
      'Enable for pilot partners only via allowlist.',
      'Monitor error budget and rollback triggers.',
      'Run daily incident review + hardening patch cycle.',
    ],
    updated_at: nowIso(),
  },
  {
    phase: 'general_availability',
    status: 'pending',
    checklist: [
      'Publish partner rollout playbook and support runbook.',
      'Lift allowlist after stability target met for 14 days.',
      'Transition weekly hardening report to monthly cadence.',
    ],
    updated_at: nowIso(),
  },
];

export function listPartnerPilotPhases(): PartnerPilotPhase[] {
  return pilotPhases.map((phase) => ({ ...phase, checklist: [...phase.checklist] }));
}

export function updatePartnerPilotPhase(input: {
  phase: PartnerPilotPhase['phase'];
  status: PartnerPilotPhase['status'];
}): PartnerPilotPhase | undefined {
  const target = pilotPhases.find((phase) => phase.phase === input.phase);
  if (!target) return undefined;
  target.status = input.status;
  target.updated_at = nowIso();

  if (input.status === 'completed') {
    const order: PartnerPilotPhase['phase'][] = [
      'sandbox_validation',
      'staging_dry_run',
      'limited_production',
      'general_availability',
    ];
    const idx = order.indexOf(target.phase);
    const next = pilotPhases.find((phase) => phase.phase === order[idx + 1]);
    if (next && next.status === 'pending') {
      next.status = 'in_progress';
      next.updated_at = nowIso();
    }
  }

  return { ...target, checklist: [...target.checklist] };
}

export function __resetPortalConfigForTests(): void {
  configs.clear();
  for (const phase of pilotPhases) {
    phase.status = phase.phase === 'sandbox_validation' ? 'in_progress' : 'pending';
    phase.updated_at = nowIso();
  }
}
