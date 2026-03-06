import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { listRoleTemplates, assignWorkspaceRole, listWorkspaceAssignments } from '../../partners/workspace';
import {
  getTenantPortalConfig,
  listPartnerPilotPhases,
  updatePartnerPilotPhase,
  upsertTenantPortalConfig,
} from '../../partners/portal';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
  };
};

export const partnersRouter = new Hono<Env>();

const assignRoleBodySchema = z.object({
  role_id: z.enum(['workspace_admin', 'ops_manager', 'analyst', 'support_agent', 'viewer']),
  assigned_by: z.string().max(80).optional(),
});

const upsertPortalBodySchema = z.object({
  brand_name: z.string().min(2).max(80).optional(),
  theme: z.object({
    primary_color: z.string().min(4).max(20).optional(),
    accent_color: z.string().min(4).max(20).optional(),
    logo_url: z.string().url().optional(),
  }).optional(),
  feature_overrides: z.record(z.boolean()).optional(),
});

const updatePilotBodySchema = z.object({
  phase: z.enum(['sandbox_validation', 'staging_dry_run', 'limited_production', 'general_availability']),
  status: z.enum(['pending', 'in_progress', 'completed']),
});

partnersRouter.get('/workspaces/:workspace_id/roles', (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.partner_workspace_roles) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const workspace_id = c.req.param('workspace_id')?.trim();
  if (!workspace_id) {
    return c.json({ success: false, error: 'invalid_workspace_id' }, 422);
  }

  return c.json({
    success: true,
    workspace_id,
    role_templates: listRoleTemplates(),
    assignments: listWorkspaceAssignments(workspace_id),
  }, 200);
});

partnersRouter.post('/workspaces/:workspace_id/members/:member_id/role', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.partner_workspace_roles) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = assignRoleBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const workspace_id = c.req.param('workspace_id')?.trim();
  const member_id = c.req.param('member_id')?.trim();
  if (!workspace_id || !member_id) {
    return c.json({ success: false, error: 'invalid_workspace_or_member' }, 422);
  }

  const assigned = assignWorkspaceRole({
    workspace_id,
    member_id,
    role_id: parsed.data.role_id,
    assigned_by: parsed.data.assigned_by,
  });

  if (!assigned.success) {
    return c.json({ success: false, error: assigned.error ?? 'assignment_failed' }, 422);
  }

  return c.json({
    success: true,
    assignment: assigned.assignment,
    role_templates: listRoleTemplates(),
  }, 200);
});

partnersRouter.get('/portals/:tenant_id/config', (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.white_label_partner_portals) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const tenant_id = c.req.param('tenant_id')?.trim();
  if (!tenant_id) {
    return c.json({ success: false, error: 'invalid_tenant_id' }, 422);
  }

  return c.json({
    success: true,
    config: getTenantPortalConfig(tenant_id),
  }, 200);
});

partnersRouter.put('/portals/:tenant_id/config', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.white_label_partner_portals) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = upsertPortalBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const tenant_id = c.req.param('tenant_id')?.trim();
  if (!tenant_id) {
    return c.json({ success: false, error: 'invalid_tenant_id' }, 422);
  }

  return c.json({
    success: true,
    config: upsertTenantPortalConfig({
      tenant_id,
      ...parsed.data,
    }),
  }, 200);
});

partnersRouter.get('/pilot/rollout', (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.partner_workspace_roles || !flags.white_label_partner_portals) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  return c.json({
    success: true,
    phases: listPartnerPilotPhases(),
  }, 200);
});

partnersRouter.post('/pilot/rollout', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.partner_workspace_roles || !flags.white_label_partner_portals) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = updatePilotBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const updated = updatePartnerPilotPhase(parsed.data);
  if (!updated) {
    return c.json({ success: false, error: 'not_found' }, 404);
  }

  return c.json({
    success: true,
    phase: updated,
    phases: listPartnerPilotPhases(),
  }, 200);
});
