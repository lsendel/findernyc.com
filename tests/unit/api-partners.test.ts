import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index';
import { __resetWorkspaceRolesForTests } from '../../src/partners/workspace';
import { __resetPortalConfigForTests } from '../../src/partners/portal';

describe('Partner workspace and white-label API routes (week 23)', () => {
  beforeEach(() => {
    __resetWorkspaceRolesForTests();
    __resetPortalConfigForTests();
  });

  it('lists role templates and assigns workspace role', async () => {
    const list = await app.request(
      '/api/partners/workspaces/ws_demo/roles',
      { method: 'GET' },
      { FEATURE_FLAGS: 'partner_workspace_roles' },
    );
    expect(list.status).toBe(200);
    const listBody = await list.json() as {
      success: boolean;
      role_templates: Array<{ id: string }>;
      assignments: unknown[];
    };
    expect(listBody.success).toBe(true);
    expect(listBody.role_templates.length).toBeGreaterThan(0);

    const assign = await app.request(
      '/api/partners/workspaces/ws_demo/members/member_1/role',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: 'analyst', assigned_by: 'ops-admin' }),
      },
      { FEATURE_FLAGS: 'partner_workspace_roles' },
    );
    expect(assign.status).toBe(200);

    const assignedBody = await assign.json() as {
      success: boolean;
      assignment: { member_id: string; role_id: string };
    };
    expect(assignedBody.success).toBe(true);
    expect(assignedBody.assignment.role_id).toBe('analyst');
  });

  it('gets and updates white-label portal config per tenant', async () => {
    const getDefault = await app.request(
      '/api/partners/portals/tenant_1/config',
      { method: 'GET' },
      { FEATURE_FLAGS: 'white_label_partner_portals' },
    );
    expect(getDefault.status).toBe(200);

    const update = await app.request(
      '/api/partners/portals/tenant_1/config',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: 'Acme Events Portal',
          theme: {
            primary_color: '#112233',
            accent_color: '#ffaa00',
          },
          feature_overrides: {
            insights_hub: true,
            ai_follow_up_automation: true,
          },
        }),
      },
      { FEATURE_FLAGS: 'white_label_partner_portals' },
    );
    expect(update.status).toBe(200);
    const updateBody = await update.json() as {
      success: boolean;
      config: { brand_name: string; theme: { primary_color: string }; feature_overrides: { insights_hub?: boolean } };
    };
    expect(updateBody.success).toBe(true);
    expect(updateBody.config.brand_name).toBe('Acme Events Portal');
    expect(updateBody.config.theme.primary_color).toBe('#112233');
    expect(updateBody.config.feature_overrides.insights_hub).toBe(true);
  });

  it('returns and updates partner pilot rollout phases', async () => {
    const getPhases = await app.request(
      '/api/partners/pilot/rollout',
      { method: 'GET' },
      { FEATURE_FLAGS: 'partner_workspace_roles,white_label_partner_portals' },
    );
    expect(getPhases.status).toBe(200);
    const initial = await getPhases.json() as {
      success: boolean;
      phases: Array<{ phase: string; status: string }>;
    };
    expect(initial.success).toBe(true);
    expect(initial.phases.length).toBe(4);

    const update = await app.request(
      '/api/partners/pilot/rollout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'sandbox_validation', status: 'completed' }),
      },
      { FEATURE_FLAGS: 'partner_workspace_roles,white_label_partner_portals' },
    );
    expect(update.status).toBe(200);
    const updateBody = await update.json() as {
      success: boolean;
      phase: { phase: string; status: string };
      phases: Array<{ phase: string; status: string }>;
    };
    expect(updateBody.success).toBe(true);
    expect(updateBody.phase.phase).toBe('sandbox_validation');
    expect(updateBody.phase.status).toBe('completed');

    const nextPhase = updateBody.phases.find((phase) => phase.phase === 'staging_dry_run');
    expect(nextPhase?.status).toBe('in_progress');
  });

  it('returns 503 for partner role endpoints when feature is disabled', async () => {
    const res = await app.request('/api/partners/workspaces/ws_demo/roles', { method: 'GET' });
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('feature_disabled');
  });

  it('returns 422 for invalid role assignment payload', async () => {
    const res = await app.request(
      '/api/partners/workspaces/ws_demo/members/member_2/role',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: 'invalid_role' }),
      },
      { FEATURE_FLAGS: 'partner_workspace_roles' },
    );
    expect(res.status).toBe(422);
  });

  it('returns 503 for portal config when feature is disabled', async () => {
    const res = await app.request('/api/partners/portals/tenant_2/config', { method: 'GET' });
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('feature_disabled');
  });

  it('returns 422 for invalid pilot rollout update payload', async () => {
    const res = await app.request(
      '/api/partners/pilot/rollout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'sandbox_validation', status: 'invalid_status' }),
      },
      { FEATURE_FLAGS: 'partner_workspace_roles,white_label_partner_portals' },
    );
    expect(res.status).toBe(422);
  });
});
