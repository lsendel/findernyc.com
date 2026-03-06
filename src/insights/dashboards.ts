export type DashboardMetric =
  | 'search_queries'
  | 'search_clicks'
  | 'inquiries_submitted'
  | 'schedules_confirmed'
  | 'ai_conversions';

export type DashboardCard = {
  id: string;
  metric: DashboardMetric;
  title: string;
  visualization: 'kpi' | 'line' | 'bar';
  window_days: number;
};

export type UserDashboard = {
  id: string;
  owner_id: string;
  name: string;
  cards: DashboardCard[];
  layout: {
    columns: number;
    density: 'comfortable' | 'compact';
  };
  created_at: string;
  updated_at: string;
};

const dashboards = new Map<string, UserDashboard>();

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOwnerId(raw: string): string {
  return raw.trim().toLowerCase();
}

function dashboardId(): string {
  return `dash_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listDashboards(owner_id: string): UserDashboard[] {
  const normalized = normalizeOwnerId(owner_id);
  return Array.from(dashboards.values())
    .filter((item) => item.owner_id === normalized)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((item) => ({
      ...item,
      cards: item.cards.map((card) => ({ ...card })),
      layout: { ...item.layout },
    }));
}

export function saveDashboard(input: {
  owner_id: string;
  dashboard_id?: string;
  name: string;
  cards: DashboardCard[];
  layout?: {
    columns?: number;
    density?: 'comfortable' | 'compact';
  };
}): UserDashboard {
  const owner_id = normalizeOwnerId(input.owner_id);
  const existing = input.dashboard_id ? dashboards.get(input.dashboard_id) : undefined;
  const id = existing?.id ?? input.dashboard_id ?? dashboardId();

  const next: UserDashboard = {
    id,
    owner_id,
    name: input.name.trim(),
    cards: input.cards.slice(0, 12).map((card) => ({
      id: card.id,
      metric: card.metric,
      title: card.title.trim().slice(0, 80),
      visualization: card.visualization,
      window_days: Math.max(1, Math.min(90, Math.round(card.window_days))),
    })),
    layout: {
      columns: Math.max(1, Math.min(4, Math.round(input.layout?.columns ?? existing?.layout.columns ?? 2))),
      density: input.layout?.density ?? existing?.layout.density ?? 'comfortable',
    },
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };

  dashboards.set(id, next);
  return {
    ...next,
    cards: next.cards.map((card) => ({ ...card })),
    layout: { ...next.layout },
  };
}

export function removeDashboard(input: {
  owner_id: string;
  dashboard_id: string;
}): boolean {
  const current = dashboards.get(input.dashboard_id);
  if (!current) return false;
  if (current.owner_id !== normalizeOwnerId(input.owner_id)) return false;
  dashboards.delete(input.dashboard_id);
  return true;
}

export function __resetDashboardsForTests(): void {
  dashboards.clear();
}
