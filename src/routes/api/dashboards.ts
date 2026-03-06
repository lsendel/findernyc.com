import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { listDashboards, removeDashboard, saveDashboard } from '../../insights/dashboards';
import { buildInsightsHubSummary } from '../../insights/hub';

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
  };
};

export const dashboardsRouter = new Hono<Env>();

const dashboardCardSchema = z.object({
  id: z.string().min(2).max(80),
  metric: z.enum(['search_queries', 'search_clicks', 'inquiries_submitted', 'schedules_confirmed', 'ai_conversions']),
  title: z.string().min(2).max(80),
  visualization: z.enum(['kpi', 'line', 'bar']),
  window_days: z.number().int().min(1).max(90),
});

const saveDashboardBodySchema = z.object({
  owner_id: z.string().min(2).max(80),
  dashboard_id: z.string().min(2).max(80).optional(),
  name: z.string().min(2).max(80),
  cards: z.array(dashboardCardSchema).min(1).max(12),
  layout: z.object({
    columns: z.number().int().min(1).max(4).optional(),
    density: z.enum(['comfortable', 'compact']).optional(),
  }).optional(),
});

const removeDashboardBodySchema = z.object({
  owner_id: z.string().min(2).max(80),
});

dashboardsRouter.get('/', (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.user_defined_dashboards) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const owner_id = c.req.query('owner_id')?.trim();
  if (!owner_id) {
    return c.json({ success: false, error: 'owner_id_required' }, 422);
  }

  return c.json({
    success: true,
    items: listDashboards(owner_id),
  }, 200);
});

dashboardsRouter.post('/', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.user_defined_dashboards) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = saveDashboardBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const item = saveDashboard(parsed.data);
  return c.json({ success: true, item }, 200);
});

dashboardsRouter.delete('/:dashboard_id', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.user_defined_dashboards) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = removeDashboardBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const dashboard_id = c.req.param('dashboard_id')?.trim();
  if (!dashboard_id) {
    return c.json({ success: false, error: 'invalid_dashboard_id' }, 422);
  }

  const removed = removeDashboard({
    owner_id: parsed.data.owner_id,
    dashboard_id,
  });
  if (!removed) {
    return c.json({ success: false, error: 'not_found' }, 404);
  }
  return c.json({ success: true, dashboard_id }, 200);
});

dashboardsRouter.get('/insights/hub', async (c) => {
  const env = c.env ?? {};
  const flags = resolveFeatureFlags(env);
  if (!flags.insights_hub) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const window_days = Number(c.req.query('window_days') ?? 14);
  const insights = await buildInsightsHubSummary({
    database_url: env.DATABASE_URL,
    window_days,
  });

  return c.json({
    success: true,
    ...insights,
  }, 200);
});
