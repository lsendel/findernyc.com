type UserDashboardMetric =
  | 'search_queries'
  | 'search_clicks'
  | 'inquiries_submitted'
  | 'schedules_confirmed'
  | 'ai_conversions';

type UserDashboardVisualization = 'kpi' | 'line' | 'bar';

type PartnerRoleId = 'workspace_admin' | 'ops_manager' | 'analyst' | 'support_agent' | 'viewer';

type PartnerPilotPhaseId = 'sandbox_validation' | 'staging_dry_run' | 'limited_production' | 'general_availability';
type PartnerPilotPhaseStatus = 'pending' | 'in_progress' | 'completed';

type AvailabilityOpsStatus = 'available' | 'limited' | 'sold_out';

type FraudReviewDecision = 'cleared' | 'confirmed_fraud' | 'false_positive';
type FraudReviewQueueStatus = 'pending' | FraudReviewDecision;

type WebhookRequestPayload = {
  partner: string;
  shared_secret: string;
  event_id: string;
  event_type: string;
  occurred_at?: string;
  event_payload: Record<string, unknown>;
  timestamp: string;
  nonce: string;
};

export async function requestInsightsHub(window_days = 14): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/dashboards/insights/hub?window_days=${window_days}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestExperimentStatus(): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch('/api/experiments/status', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestExperimentRollback(payload: {
  id: 'ranking_blend_v1' | 'trust_controls_v1';
  reason?: string;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/experiments/${encodeURIComponent(payload.id)}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(payload.reason ? { reason: payload.reason } : {}),
      }),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestUserDashboards(owner_id: string): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/dashboards?owner_id=${encodeURIComponent(owner_id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestSaveUserDashboard(payload: {
  owner_id: string;
  name: string;
  metric: UserDashboardMetric;
  visualization: UserDashboardVisualization;
  window_days: number;
}): Promise<{ status: number; body: any }> {
  const cardId = `card_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const response = await fetch('/api/dashboards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_id: payload.owner_id,
        name: payload.name,
        cards: [{
          id: cardId,
          metric: payload.metric,
          title: `${payload.metric.replaceAll('_', ' ')} (${payload.window_days}d)`,
          visualization: payload.visualization,
          window_days: payload.window_days,
        }],
        layout: {
          columns: 2,
          density: 'comfortable',
        },
      }),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestDeleteUserDashboard(payload: {
  owner_id: string;
  dashboard_id: string;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/dashboards/${encodeURIComponent(payload.dashboard_id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_id: payload.owner_id,
      }),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestPartnerRoles(workspace_id: string): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/partners/workspaces/${encodeURIComponent(workspace_id)}/roles`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestPartnerPilot(): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch('/api/partners/pilot/rollout', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestAssignPartnerRole(payload: {
  workspace_id: string;
  member_id: string;
  role_id: PartnerRoleId;
  assigned_by?: string;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/partners/workspaces/${encodeURIComponent(payload.workspace_id)}/members/${encodeURIComponent(payload.member_id)}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role_id: payload.role_id,
        ...(payload.assigned_by ? { assigned_by: payload.assigned_by } : {}),
      }),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestPartnerPortalConfig(tenant_id: string): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/partners/portals/${encodeURIComponent(tenant_id)}/config`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestUpdatePartnerPortalConfig(payload: {
  tenant_id: string;
  brand_name?: string;
  theme?: {
    primary_color?: string;
    accent_color?: string;
    logo_url?: string;
  };
  feature_overrides?: Record<string, boolean>;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/partners/portals/${encodeURIComponent(payload.tenant_id)}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(payload.brand_name ? { brand_name: payload.brand_name } : {}),
        ...(payload.theme ? { theme: payload.theme } : {}),
        ...(payload.feature_overrides ? { feature_overrides: payload.feature_overrides } : {}),
      }),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestUpdatePartnerPilot(payload: {
  phase: PartnerPilotPhaseId;
  status: PartnerPilotPhaseStatus;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch('/api/partners/pilot/rollout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestAvailabilitySync(payload: {
  updates: Array<{
    event_id: string;
    status?: AvailabilityOpsStatus;
    seats_total?: number;
    seats_remaining?: number;
    updated_at?: string;
  }>;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch('/api/availability/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestAvailabilityWebhook(payload: {
  provider: string;
  token: string;
  records: Array<{
    id: string;
    availability?: AvailabilityOpsStatus;
    seats?: {
      total?: number;
      remaining?: number;
    };
    updated_at?: string;
  }>;
  sent_at?: string;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/availability/webhook/${encodeURIComponent(payload.provider)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-inventory-token': payload.token,
      },
      body: JSON.stringify({
        records: payload.records,
        ...(payload.sent_at ? { sent_at: payload.sent_at } : {}),
      }),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestFraudReviewQueue(payload: {
  status: 'all' | FraudReviewQueueStatus;
  limit: number;
}): Promise<{ status: number; body: any }> {
  try {
    const query = new URLSearchParams({
      status: payload.status,
      limit: String(payload.limit),
    });
    const response = await fetch(`/api/fraud/review-queue?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestFraudReviewDecision(payload: {
  event_id: string;
  decision: FraudReviewDecision;
  reviewer?: string;
  notes?: string;
}): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(`/api/fraud/review-queue/${encodeURIComponent(payload.event_id)}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: payload.decision,
        ...(payload.reviewer ? { reviewer: payload.reviewer } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      }),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export function generateWebhookNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `nonce_${crypto.randomUUID()}`;
  }
  return `nonce_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('web_crypto_unavailable');
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function requestSignedWebhookEvent(payload: WebhookRequestPayload): Promise<{ status: number; body: any }> {
  const bodyPayload = {
    event_id: payload.event_id,
    event_type: payload.event_type,
    ...(payload.occurred_at ? { occurred_at: payload.occurred_at } : {}),
    payload: payload.event_payload,
  };
  const bodyText = JSON.stringify(bodyPayload);

  try {
    const signature = await sha256Hex(`${payload.shared_secret}.${payload.timestamp}.${payload.nonce}.${bodyText}`);
    const response = await fetch(`/api/integrations/webhooks/${encodeURIComponent(payload.partner)}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-timestamp': payload.timestamp,
        'x-webhook-nonce': payload.nonce,
      },
      body: bodyText,
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}
