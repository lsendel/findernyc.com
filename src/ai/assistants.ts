import { getCatalogEventById, runUnifiedSmartSearch, type SearchFilters } from '../search/unified-search';

function normalizeBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw?.trim()) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return fallback;
}

function titleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type Telemetry = {
  prompt_version: string;
  model_version: string;
  fallback_used: boolean;
  fallback_reason?: string;
  retrieval_count: number;
};

export type NegotiationPrepResponse = {
  summary: string;
  talking_points: string[];
  suggested_concessions: string[];
  red_flags: string[];
  opening_script: string;
  context: {
    event_id?: string;
    title?: string;
    borough?: string;
    category?: string;
    price?: number;
  };
  telemetry: Telemetry;
};

export type DocumentHelperResponse = {
  summary: string;
  checklist: Array<{
    item: string;
    status: 'present' | 'missing' | 'unclear';
    evidence?: string;
  }>;
  action_items: string[];
  telemetry: Telemetry;
};

function buildContextText(input: {
  event_id?: string;
  goals: string[];
  filters?: SearchFilters;
}): {
  context: NegotiationPrepResponse['context'];
  retrieval_count: number;
} {
  if (input.event_id) {
    const event = getCatalogEventById(input.event_id);
    if (event) {
      return {
        context: {
          event_id: event.id,
          title: event.title,
          borough: event.borough,
          category: event.category,
          price: event.price,
        },
        retrieval_count: 1,
      };
    }
  }

  const query = input.goals.join(' ');
  const search = runUnifiedSmartSearch({
    query,
    filters: input.filters,
    limit: 1,
  });
  const top = search.results[0];
  if (!top) {
    return {
      context: {},
      retrieval_count: search.results.length,
    };
  }

  return {
    context: {
      event_id: top.id,
      title: top.title,
      borough: top.borough,
      category: top.category,
      price: top.price,
    },
    retrieval_count: search.results.length,
  };
}

export function buildAiNegotiationPrepResponse(input: {
  goals: string[];
  constraints?: {
    max_price?: number;
    preferred_contact_channel?: 'email' | 'sms' | 'phone';
    must_haves?: string[];
  };
  event_id?: string;
  model_available?: string;
  model_version?: string;
  filters?: SearchFilters;
}): NegotiationPrepResponse {
  const prompt_version = 'ai_negotiation_prep_prompt_v1';
  const model_version = input.model_version?.trim() || 'negotiation-local-2026-03-01';
  const modelAvailable = normalizeBoolean(input.model_available, true);
  const contextResult = buildContextText({
    event_id: input.event_id,
    goals: input.goals,
    filters: input.filters,
  });

  const contextLabel = contextResult.context.title
    ? `${contextResult.context.title} (${titleCase(contextResult.context.borough ?? 'unknown')} • ${titleCase(contextResult.context.category ?? 'unknown')})`
    : 'this listing';

  const mustHaves = input.constraints?.must_haves ?? [];
  const talking_points = [
    `Open with fit: explain why ${contextLabel} aligns with your priorities (${input.goals.slice(0, 2).join(', ')}).`,
    `Ask for explicit pricing details, including fees${typeof input.constraints?.max_price === 'number' ? `, while targeting a ${input.constraints.max_price} USD cap` : ''}.`,
    'Request confirmation on schedule flexibility, cancellation terms, and capacity commitments before final agreement.',
    ...(mustHaves.length > 0 ? [`State non-negotiables clearly: ${mustHaves.join(', ')}.`] : []),
  ];

  const suggested_concessions = [
    'Offer schedule flexibility in exchange for better total pricing or included add-ons.',
    'Bundle multiple needs into one ask to trade scope for certainty.',
    'Accept phased commitments if risk protections are documented in writing.',
  ];

  const red_flags = [
    'Vague answers on fees, deposits, or refund policy.',
    'Pressure to commit without written terms.',
    'Conflicting information between listing details and organizer responses.',
  ];

  const opening_script = `Hi, I am interested in ${contextLabel}. My priorities are ${input.goals.join(', ')}. Can we review final pricing, inclusions, and booking terms before confirming?`;

  if (!modelAvailable) {
    return {
      summary: 'Model availability is degraded, so this negotiation prep is generated from deterministic playbooks and listing context.',
      talking_points,
      suggested_concessions,
      red_flags,
      opening_script,
      context: contextResult.context,
      telemetry: {
        prompt_version,
        model_version,
        fallback_used: true,
        fallback_reason: 'model_unavailable',
        retrieval_count: contextResult.retrieval_count,
      },
    };
  }

  return {
    summary: `Prepared negotiation strategy for ${contextLabel} using your goals and constraints.`,
    talking_points,
    suggested_concessions,
    red_flags,
    opening_script,
    context: contextResult.context,
    telemetry: {
      prompt_version,
      model_version,
      fallback_used: false,
      retrieval_count: contextResult.retrieval_count,
    },
  };
}

function containsAny(text: string, terms: string[]): string | undefined {
  const normalized = text.toLowerCase();
  return terms.find((term) => normalized.includes(term));
}

export function buildAiDocumentHelperResponse(input: {
  document_text: string;
  extraction_mode: 'summary_only' | 'summary_and_checklist';
  model_available?: string;
  model_version?: string;
}): DocumentHelperResponse {
  const prompt_version = 'ai_document_helper_prompt_v1';
  const model_version = input.model_version?.trim() || 'doc-helper-local-2026-03-01';
  const modelAvailable = normalizeBoolean(input.model_available, true);

  const text = input.document_text.trim();
  const lines = text
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLines = lines.slice(0, 4);
  const summary = firstLines.length > 0
    ? firstLines.join(' ')
    : text.slice(0, 300);

  const checklist = [
    {
      item: 'Final price and fee breakdown',
      status: containsAny(text, ['fee', 'fees', 'tax', 'total', '$']) ? 'present' : 'missing',
      evidence: containsAny(text, ['fee', 'fees', 'tax', 'total', '$']),
    },
    {
      item: 'Cancellation or refund policy',
      status: containsAny(text, ['cancel', 'refund', 'reschedule']) ? 'present' : 'missing',
      evidence: containsAny(text, ['cancel', 'refund', 'reschedule']),
    },
    {
      item: 'Capacity or attendance limits',
      status: containsAny(text, ['capacity', 'limit', 'attendance', 'seats']) ? 'present' : 'missing',
      evidence: containsAny(text, ['capacity', 'limit', 'attendance', 'seats']),
    },
    {
      item: 'Insurance or permit requirements',
      status: containsAny(text, ['insurance', 'permit', 'license']) ? 'present' : 'unclear',
      evidence: containsAny(text, ['insurance', 'permit', 'license']),
    },
    {
      item: 'Primary organizer contact details',
      status: containsAny(text, ['@', 'phone', 'contact']) ? 'present' : 'missing',
      evidence: containsAny(text, ['@', 'phone', 'contact']),
    },
  ].map((item) => ({
    item: item.item,
    status: item.status as 'present' | 'missing' | 'unclear',
    ...(item.evidence ? { evidence: `Matched keyword: ${item.evidence}` } : {}),
  }));

  const action_items = checklist
    .filter((item) => item.status !== 'present')
    .map((item) => `Confirm ${item.item.toLowerCase()} with organizer.`);

  if (!modelAvailable) {
    return {
      summary: `Model availability is degraded; returning deterministic document parsing output. ${summary}`,
      checklist: input.extraction_mode === 'summary_only' ? [] : checklist,
      action_items: input.extraction_mode === 'summary_only' ? [] : action_items,
      telemetry: {
        prompt_version,
        model_version,
        fallback_used: true,
        fallback_reason: 'model_unavailable',
        retrieval_count: lines.length,
      },
    };
  }

  return {
    summary,
    checklist: input.extraction_mode === 'summary_only' ? [] : checklist,
    action_items: input.extraction_mode === 'summary_only' ? [] : action_items,
    telemetry: {
      prompt_version,
      model_version,
      fallback_used: false,
      retrieval_count: lines.length,
    },
  };
}
