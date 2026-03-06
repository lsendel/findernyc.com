import { getCatalogEventById, runUnifiedSmartSearch, type SearchFilters } from '../search/unified-search';

export type FollowUpChannel = 'email' | 'sms' | 'push';

export type FollowUpTemplate = {
  id: string;
  version: string;
  name: string;
  channel: FollowUpChannel;
  body_template: string;
};

export type SuppressionControls = {
  recipient_id: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
  frequency_cap_per_day: number;
  opt_out: boolean;
  updated_at: string;
};

export type FollowUpDispatch = {
  id: string;
  recipient_id: string;
  template_id: string;
  template_version: string;
  channel: FollowUpChannel;
  message: string;
  status: 'queued' | 'suppressed';
  suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
  created_at: string;
};

export type NextBestAction = {
  id: 'book_now' | 'schedule_visit' | 'send_inquiry' | 'request_discount' | 'save_alert' | 'ask_follow_up';
  priority: number;
  title: string;
  reason: string;
  suggested_channel: FollowUpChannel;
  suppressed: boolean;
  suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
};

const templates: FollowUpTemplate[] = [
  {
    id: 'post_shortlist_check_in',
    version: 'v1',
    name: 'Post-shortlist check-in',
    channel: 'email',
    body_template:
      'Hi {{first_name}}, your shortlist for {{event_title}} is ready. Next best step: {{next_step}}. Reply if you want us to prepare a negotiation script before you decide.',
  },
  {
    id: 'price_drop_nudge',
    version: 'v1',
    name: 'Price-drop nudge',
    channel: 'push',
    body_template:
      'Good news: {{event_title}} is now closer to your target budget. Suggested action: {{next_step}}.',
  },
  {
    id: 'deadline_reminder',
    version: 'v1',
    name: 'Deadline reminder',
    channel: 'sms',
    body_template:
      'Reminder: {{event_title}} deadline is {{deadline}}. Recommended next step: {{next_step}}.',
  },
];

const approvals = new Map<string, {
  recipient_id: string;
  template_id: string;
  template_version: string;
  approved_by?: string;
  approved_at: string;
}>();

const suppressionByRecipient = new Map<string, SuppressionControls>();
const dispatchHistory = new Map<string, FollowUpDispatch[]>();

function nowIso(): string {
  return new Date().toISOString();
}

function toHour(value: number, fallback: number): number {
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 23) return fallback;
  return rounded;
}

function normalizeRecipientId(raw: string): string {
  return raw.trim().toLowerCase();
}

function approvalKey(recipient_id: string, template_id: string): string {
  return `${normalizeRecipientId(recipient_id)}::${template_id}`;
}

function defaultSuppression(recipient_id: string): SuppressionControls {
  return {
    recipient_id: normalizeRecipientId(recipient_id),
    quiet_hours_start: 21,
    quiet_hours_end: 8,
    frequency_cap_per_day: 2,
    opt_out: false,
    updated_at: nowIso(),
  };
}

function resolveSuppression(recipient_id: string): SuppressionControls {
  return suppressionByRecipient.get(normalizeRecipientId(recipient_id)) ?? defaultSuppression(recipient_id);
}

function isQuietHour(hour: number, controls: SuppressionControls): boolean {
  const normalizedHour = toHour(hour, new Date().getUTCHours());
  if (controls.quiet_hours_start === controls.quiet_hours_end) return false;
  if (controls.quiet_hours_start < controls.quiet_hours_end) {
    return normalizedHour >= controls.quiet_hours_start && normalizedHour < controls.quiet_hours_end;
  }
  return normalizedHour >= controls.quiet_hours_start || normalizedHour < controls.quiet_hours_end;
}

function countDispatchesLast24Hours(recipient_id: string): number {
  const now = Date.now();
  const history = dispatchHistory.get(normalizeRecipientId(recipient_id)) ?? [];
  return history.filter((item) => now - Date.parse(item.created_at) <= 24 * 60 * 60 * 1000).length;
}

function evaluateSuppression(input: {
  recipient_id: string;
  send_at_hour?: number;
}): {
  controls: SuppressionControls;
  blocked: boolean;
  reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
} {
  const controls = resolveSuppression(input.recipient_id);
  if (controls.opt_out) {
    return { controls, blocked: true, reason: 'opt_out' };
  }
  const sendAtHour = toHour(input.send_at_hour ?? new Date().getUTCHours(), new Date().getUTCHours());
  if (isQuietHour(sendAtHour, controls)) {
    return { controls, blocked: true, reason: 'quiet_hours' };
  }
  const attempts = countDispatchesLast24Hours(input.recipient_id);
  if (attempts >= controls.frequency_cap_per_day) {
    return { controls, blocked: true, reason: 'frequency_cap' };
  }
  return { controls, blocked: false };
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output.replace(/\{\{[^}]+\}\}/g, '').replace(/\s+/g, ' ').trim();
}

export function listFollowUpTemplates(): FollowUpTemplate[] {
  return templates.map((template) => ({ ...template }));
}

export function approveFollowUpTemplate(input: {
  recipient_id: string;
  template_id: string;
  approved_by?: string;
  template_version?: string;
}): { success: boolean; error?: string; approval?: {
  recipient_id: string;
  template_id: string;
  template_version: string;
  approved_by?: string;
  approved_at: string;
} } {
  const template = templates.find((item) => item.id === input.template_id);
  if (!template) {
    return { success: false, error: 'template_not_found' };
  }

  const recipient_id = normalizeRecipientId(input.recipient_id);
  const approval = {
    recipient_id,
    template_id: template.id,
    template_version: input.template_version?.trim() || template.version,
    approved_by: input.approved_by?.trim() || undefined,
    approved_at: nowIso(),
  };
  approvals.set(approvalKey(recipient_id, template.id), approval);
  return { success: true, approval };
}

export function upsertSuppressionControls(input: {
  recipient_id: string;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  frequency_cap_per_day?: number;
  opt_out?: boolean;
}): SuppressionControls {
  const recipient_id = normalizeRecipientId(input.recipient_id);
  const previous = resolveSuppression(recipient_id);
  const next: SuppressionControls = {
    recipient_id,
    quiet_hours_start: toHour(input.quiet_hours_start ?? previous.quiet_hours_start, previous.quiet_hours_start),
    quiet_hours_end: toHour(input.quiet_hours_end ?? previous.quiet_hours_end, previous.quiet_hours_end),
    frequency_cap_per_day: Math.max(1, Math.min(24, Math.round(input.frequency_cap_per_day ?? previous.frequency_cap_per_day))),
    opt_out: typeof input.opt_out === 'boolean' ? input.opt_out : previous.opt_out,
    updated_at: nowIso(),
  };
  suppressionByRecipient.set(recipient_id, next);
  return next;
}

export function getSuppressionControls(recipient_id: string): SuppressionControls {
  return resolveSuppression(recipient_id);
}

function createDispatchRecord(input: {
  recipient_id: string;
  template: FollowUpTemplate;
  message: string;
  status: 'queued' | 'suppressed';
  suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
}): FollowUpDispatch {
  return {
    id: `fup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    recipient_id: normalizeRecipientId(input.recipient_id),
    template_id: input.template.id,
    template_version: input.template.version,
    channel: input.template.channel,
    message: input.message,
    status: input.status,
    ...(input.suppression_reason ? { suppression_reason: input.suppression_reason } : {}),
    created_at: nowIso(),
  };
}

export function runFollowUpAutomation(input: {
  recipient_id: string;
  template_id: string;
  channel?: FollowUpChannel;
  context: {
    first_name?: string;
    event_title: string;
    next_step: string;
    deadline?: string;
  };
  send_at_hour?: number;
}): {
  success: boolean;
  error?: string;
  dispatch?: FollowUpDispatch;
  suppression?: SuppressionControls;
} {
  const template = templates.find((item) => item.id === input.template_id);
  if (!template) {
    return { success: false, error: 'template_not_found' };
  }

  const recipient_id = normalizeRecipientId(input.recipient_id);
  const approval = approvals.get(approvalKey(recipient_id, template.id));
  if (!approval) {
    return { success: false, error: 'template_not_approved' };
  }

  if (input.channel && input.channel !== template.channel) {
    return { success: false, error: 'channel_template_mismatch' };
  }

  const suppressionState = evaluateSuppression({
    recipient_id,
    send_at_hour: input.send_at_hour,
  });

  const message = interpolateTemplate(template.body_template, {
    first_name: input.context.first_name?.trim() || 'there',
    event_title: input.context.event_title.trim(),
    next_step: input.context.next_step.trim(),
    deadline: input.context.deadline?.trim() || 'soon',
  });

  if (suppressionState.blocked) {
    const dispatch = createDispatchRecord({
      recipient_id,
      template,
      message,
      status: 'suppressed',
      suppression_reason: suppressionState.reason,
    });
    const existing = dispatchHistory.get(recipient_id) ?? [];
    dispatchHistory.set(recipient_id, [dispatch, ...existing].slice(0, 50));
    return {
      success: true,
      dispatch,
      suppression: suppressionState.controls,
    };
  }

  const dispatch = createDispatchRecord({
    recipient_id,
    template,
    message,
    status: 'queued',
  });
  const existing = dispatchHistory.get(recipient_id) ?? [];
  dispatchHistory.set(recipient_id, [dispatch, ...existing].slice(0, 50));
  return {
    success: true,
    dispatch,
    suppression: suppressionState.controls,
  };
}

export function listFollowUpDispatches(recipient_id?: string): FollowUpDispatch[] {
  if (recipient_id) {
    return [...(dispatchHistory.get(normalizeRecipientId(recipient_id)) ?? [])];
  }
  return Array.from(dispatchHistory.values()).flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function stageFromSignals(input: {
  funnel_stage?: 'discovery' | 'consideration' | 'negotiation' | 'ready_to_book' | 'post_inquiry';
  signals?: {
    shortlisted?: boolean;
    inquiry_sent?: boolean;
    schedule_requested?: boolean;
    schedule_confirmed?: boolean;
    docs_reviewed?: boolean;
    price_drop_seen?: boolean;
  };
}): 'discovery' | 'consideration' | 'negotiation' | 'ready_to_book' | 'post_inquiry' {
  if (input.funnel_stage) return input.funnel_stage;
  if (input.signals?.schedule_confirmed) return 'post_inquiry';
  if (input.signals?.schedule_requested) return 'ready_to_book';
  if (input.signals?.inquiry_sent) return 'negotiation';
  if (input.signals?.shortlisted) return 'consideration';
  return 'discovery';
}

function inferEventTitle(input: {
  event_id?: string;
  intent?: string;
  filters?: SearchFilters;
}): string {
  if (input.event_id) {
    const event = getCatalogEventById(input.event_id);
    if (event) return event.title;
  }
  const query = input.intent?.trim() || 'local events';
  const search = runUnifiedSmartSearch({
    query,
    filters: input.filters,
    limit: 1,
  });
  return search.results[0]?.title ?? 'your shortlisted event';
}

export function buildNextBestActions(input: {
  recipient_id: string;
  event_id?: string;
  intent?: string;
  filters?: SearchFilters;
  funnel_stage?: 'discovery' | 'consideration' | 'negotiation' | 'ready_to_book' | 'post_inquiry';
  signals?: {
    shortlisted?: boolean;
    inquiry_sent?: boolean;
    schedule_requested?: boolean;
    schedule_confirmed?: boolean;
    docs_reviewed?: boolean;
    price_drop_seen?: boolean;
  };
  max_actions?: number;
  send_at_hour?: number;
}): {
  summary: string;
  actions: NextBestAction[];
  suppression: SuppressionControls;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    retrieval_count: number;
  };
} {
  const stage = stageFromSignals({
    funnel_stage: input.funnel_stage,
    signals: input.signals,
  });
  const eventTitle = inferEventTitle({
    event_id: input.event_id,
    intent: input.intent,
    filters: input.filters,
  });

  const suppressionState = evaluateSuppression({
    recipient_id: input.recipient_id,
    send_at_hour: input.send_at_hour,
  });

  const candidates: NextBestAction[] = [
    {
      id: 'save_alert',
      priority: stage === 'discovery' ? 95 : 60,
      title: 'Save Search Alert',
      reason: `Create a monitoring alert for ${eventTitle} so new fits are surfaced automatically.`,
      suggested_channel: 'push',
      suppressed: suppressionState.blocked,
      ...(suppressionState.reason ? { suppression_reason: suppressionState.reason } : {}),
    },
    {
      id: 'send_inquiry',
      priority: stage === 'consideration' ? 98 : 65,
      title: 'Send One-Click Inquiry',
      reason: `Contact the organizer of ${eventTitle} to confirm fit, availability, and final terms.`,
      suggested_channel: 'email',
      suppressed: suppressionState.blocked,
      ...(suppressionState.reason ? { suppression_reason: suppressionState.reason } : {}),
    },
    {
      id: 'request_discount',
      priority: stage === 'negotiation' ? 97 : 62,
      title: 'Request Fee Adjustment',
      reason: 'Use negotiation prep to ask for total-cost concessions tied to commitment timing.',
      suggested_channel: 'email',
      suppressed: suppressionState.blocked,
      ...(suppressionState.reason ? { suppression_reason: suppressionState.reason } : {}),
    },
    {
      id: 'schedule_visit',
      priority: stage === 'ready_to_book' ? 99 : 70,
      title: 'Schedule In-App',
      reason: 'Lock a calendar hold to reduce drop-off between inquiry and booking.',
      suggested_channel: 'push',
      suppressed: suppressionState.blocked,
      ...(suppressionState.reason ? { suppression_reason: suppressionState.reason } : {}),
    },
    {
      id: 'book_now',
      priority: stage === 'ready_to_book' ? 96 : 50,
      title: 'Book Now',
      reason: 'Proceed with booking while terms and availability are still favorable.',
      suggested_channel: 'sms',
      suppressed: suppressionState.blocked,
      ...(suppressionState.reason ? { suppression_reason: suppressionState.reason } : {}),
    },
    {
      id: 'ask_follow_up',
      priority: stage === 'post_inquiry' ? 90 : 55,
      title: 'Send Follow-Up',
      reason: 'Trigger a concise follow-up to keep momentum and close outstanding questions.',
      suggested_channel: 'email',
      suppressed: suppressionState.blocked,
      ...(suppressionState.reason ? { suppression_reason: suppressionState.reason } : {}),
    },
  ];

  const ranked = candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(1, Math.min(6, Math.round(input.max_actions ?? 3))));

  return {
    summary: `Generated ${ranked.length} next-best actions for ${eventTitle} at stage ${stage}.`,
    actions: ranked,
    suppression: suppressionState.controls,
    telemetry: {
      prompt_version: 'ai_next_best_action_prompt_v1',
      model_version: 'next-best-action-local-2026-03-01',
      fallback_used: false,
      retrieval_count: 1,
    },
  };
}

export function __resetFollowUpAutomationForTests(): void {
  approvals.clear();
  suppressionByRecipient.clear();
  dispatchHistory.clear();
}
