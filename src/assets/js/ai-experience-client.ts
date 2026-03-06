type AiSearchFilters = {
  borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
  category?: 'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness';
  max_price?: number;
  starts_before_hour?: number;
  within_walk_minutes?: number;
};

type AiRequestError = {
  success: false;
  error: string;
  safety?: { safe: boolean; reason?: string };
};

type ApiResult<T> = {
  status: number;
  body: T | AiRequestError | null;
};

type AiConciergeResponse = {
  success: true;
  answer: string;
  citations: Array<{
    event_id: string;
    title: string;
    borough: string;
    category: string;
    reason: string;
  }>;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type AiShortlistResponse = {
  success: true;
  shortlist: Array<{
    event_id: string;
    title: string;
    borough: string;
    category: string;
    price: number;
    start_hour: number;
    walk_minutes: number;
    score: number;
    rationale: string;
  }>;
  summary: string;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type AiNegotiationPrepResponse = {
  success: true;
  summary: string;
  talking_points: string[];
  suggested_concessions: string[];
  red_flags: string[];
  opening_script: string;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type AiDocumentHelperResponse = {
  success: true;
  summary: string;
  checklist: Array<{
    item: string;
    status: 'present' | 'missing' | 'unclear';
    evidence?: string;
  }>;
  action_items: string[];
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type ExperienceI18nResponse = {
  success: true;
  requested_locale?: string;
  resolved_locale: 'en-US' | 'es-US' | 'zh-CN';
  rtl: boolean;
  labels: {
    smart_search_title: string;
    smart_search_subtitle: string;
    borough: string;
    category: string;
    max_price: string;
    starts_before: string;
    walk_distance: string;
    search_button: string;
  };
  taxonomy: {
    categories: Record<'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness', string>;
    boroughs: Record<'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island', string>;
  };
};

type AccessibilityPreferenceResponse = {
  success: true;
  preference: {
    session_id: string;
    high_contrast: boolean;
    reduced_motion: boolean;
    keyboard_first: boolean;
    updated_at: string;
  };
};

type AiFollowUpTemplateListResponse = {
  success: true;
  items: Array<{
    id: string;
    version: string;
    name: string;
    channel: 'email' | 'sms' | 'push';
    body_template: string;
  }>;
};

type AiFollowUpApproveResponse = {
  success: true;
  approval: {
    recipient_id: string;
    template_id: string;
    template_version: string;
    approved_by?: string;
    approved_at: string;
  };
};

type AiFollowUpAutomationResponse = {
  success: true;
  dispatch: {
    id: string;
    recipient_id: string;
    template_id: string;
    template_version: string;
    channel: 'email' | 'sms' | 'push';
    message: string;
    status: 'queued' | 'suppressed';
    suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
    created_at: string;
  };
  suppression: {
    recipient_id: string;
    quiet_hours_start: number;
    quiet_hours_end: number;
    frequency_cap_per_day: number;
    opt_out: boolean;
    updated_at: string;
  };
};

type AiNextBestActionResponse = {
  success: true;
  summary: string;
  actions: Array<{
    id: 'book_now' | 'schedule_visit' | 'send_inquiry' | 'request_discount' | 'save_alert' | 'ask_follow_up';
    priority: number;
    title: string;
    reason: string;
    suggested_channel: 'email' | 'sms' | 'push';
    suppressed: boolean;
    suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
  }>;
  suppression: {
    recipient_id: string;
    quiet_hours_start: number;
    quiet_hours_end: number;
    frequency_cap_per_day: number;
    opt_out: boolean;
    updated_at: string;
  };
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    retrieval_count: number;
  };
};

type AiSuppressionControls = {
  recipient_id: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
  frequency_cap_per_day: number;
  opt_out: boolean;
  updated_at: string;
};

type AiSuppressionControlsResponse = {
  success: true;
  controls: AiSuppressionControls;
};

type AiFollowUpDispatchesResponse = {
  success: true;
  items: Array<{
    id: string;
    recipient_id: string;
    template_id: string;
    template_version: string;
    channel: 'email' | 'sms' | 'push';
    message: string;
    status: 'queued' | 'suppressed';
    suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
    created_at: string;
  }>;
};

type AiReviewSampleStatus = 'pending' | 'approved' | 'needs_revision';

type AiReviewQueueItem = {
  id: string;
  feature: 'ai_concierge_chat' | 'ai_shortlist_builder' | 'ai_negotiation_prep_assistant' | 'ai_document_helper';
  output_type: string;
  session_id?: string;
  output_preview: string;
  rubric: {
    scores: Array<{
      category: 'grounding' | 'clarity' | 'actionability' | 'safety';
      score: number;
      rationale: string;
    }>;
    overall_score: number;
    band: 'high' | 'medium' | 'low';
  };
  sampling_reason: 'low_quality' | 'random_sample';
  status: AiReviewSampleStatus;
  reviewer?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type AiReviewQueueResponse = {
  success: true;
  items: AiReviewQueueItem[];
};

type AiReviewDecisionResponse = {
  success: true;
  item: AiReviewQueueItem;
};

async function requestJson<TSuccess>(url: string, init: RequestInit): Promise<ApiResult<TSuccess>> {
  try {
    const response = await fetch(url, init);
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export function requestAiConcierge(payload: {
  query: string;
  session_id?: string;
  retrieval_limit?: number;
  filters?: AiSearchFilters;
}): Promise<ApiResult<AiConciergeResponse>> {
  return requestJson('/api/ai/concierge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestAiShortlist(payload: {
  intent: string;
  session_id?: string;
  max_items?: number;
  filters?: AiSearchFilters;
}): Promise<ApiResult<AiShortlistResponse>> {
  return requestJson('/api/ai/shortlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestAiNegotiationPrep(payload: {
  goals: string[];
  event_id?: string;
  session_id?: string;
  filters?: AiSearchFilters;
  constraints?: {
    max_price?: number;
    preferred_contact_channel?: 'email' | 'sms' | 'phone';
    must_haves?: string[];
  };
}): Promise<ApiResult<AiNegotiationPrepResponse>> {
  return requestJson('/api/ai/negotiation-prep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestAiDocumentHelper(payload: {
  document_text: string;
  session_id?: string;
  extraction_mode?: 'summary_only' | 'summary_and_checklist';
}): Promise<ApiResult<AiDocumentHelperResponse>> {
  return requestJson('/api/ai/document-helper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestExperienceI18n(locale: string): Promise<ApiResult<ExperienceI18nResponse>> {
  return requestJson(`/api/experience/i18n/${encodeURIComponent(locale)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}

export function requestAccessibilityPreference(session_id: string): Promise<ApiResult<AccessibilityPreferenceResponse>> {
  return requestJson(`/api/experience/accessibility/preferences/${encodeURIComponent(session_id)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}

export function saveAccessibilityPreference(payload: {
  session_id: string;
  high_contrast?: boolean;
  reduced_motion?: boolean;
  keyboard_first?: boolean;
}): Promise<ApiResult<AccessibilityPreferenceResponse>> {
  return requestJson('/api/experience/accessibility/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestAiFollowUpTemplates(): Promise<ApiResult<AiFollowUpTemplateListResponse>> {
  return requestJson('/api/ai/follow-up/templates', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}

export function requestAiFollowUpApprove(payload: {
  template_id: string;
  recipient_id: string;
}): Promise<ApiResult<AiFollowUpApproveResponse>> {
  return requestJson(`/api/ai/follow-up/templates/${encodeURIComponent(payload.template_id)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient_id: payload.recipient_id,
    }),
  });
}

export function requestAiFollowUpAutomation(payload: {
  recipient_id: string;
  template_id: string;
  event_title: string;
  next_step: string;
  session_id?: string;
}): Promise<ApiResult<AiFollowUpAutomationResponse>> {
  return requestJson('/api/ai/follow-up-automation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient_id: payload.recipient_id,
      template_id: payload.template_id,
      session_id: payload.session_id,
      context: {
        event_title: payload.event_title,
        next_step: payload.next_step,
      },
    }),
  });
}

export function requestAiNextBestAction(payload: {
  recipient_id: string;
  funnel_stage: 'discovery' | 'consideration' | 'negotiation' | 'ready_to_book' | 'post_inquiry';
  event_id?: string;
  intent?: string;
  session_id?: string;
  max_actions?: number;
  filters?: AiSearchFilters;
}): Promise<ApiResult<AiNextBestActionResponse>> {
  return requestJson('/api/ai/next-best-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestAiSuppressionControls(recipient_id: string): Promise<ApiResult<AiSuppressionControlsResponse>> {
  return requestJson(`/api/ai/suppression-controls/${encodeURIComponent(recipient_id)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}

export function requestUpsertAiSuppressionControls(payload: {
  recipient_id: string;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  frequency_cap_per_day?: number;
  opt_out?: boolean;
}): Promise<ApiResult<AiSuppressionControlsResponse>> {
  return requestJson('/api/ai/suppression-controls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestAiFollowUpDispatches(recipient_id?: string): Promise<ApiResult<AiFollowUpDispatchesResponse>> {
  const query = recipient_id ? `?recipient_id=${encodeURIComponent(recipient_id)}` : '';
  return requestJson(`/api/ai/follow-up-automation/dispatches${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}

export function requestAiReviewQueue(): Promise<ApiResult<AiReviewQueueResponse>> {
  return requestJson('/api/ai/review-sampling/queue', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}

export function requestAiReviewDecision(payload: {
  sample_id: string;
  decision: 'approved' | 'needs_revision';
  reviewer?: string;
  notes?: string;
}): Promise<ApiResult<AiReviewDecisionResponse>> {
  return requestJson(`/api/ai/review-sampling/${encodeURIComponent(payload.sample_id)}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: payload.decision,
      ...(payload.reviewer ? { reviewer: payload.reviewer } : {}),
      ...(payload.notes ? { notes: payload.notes } : {}),
    }),
  });
}
