import { runUnifiedSmartSearch, type SearchFilters } from '../search/unified-search';

export type AiConciergeResponse = {
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
};

export type AiShortlistItem = {
  event_id: string;
  title: string;
  borough: string;
  category: string;
  price: number;
  start_hour: number;
  walk_minutes: number;
  score: number;
  rationale: string;
};

export type AiShortlistResponse = {
  shortlist: AiShortlistItem[];
  summary: string;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
};

function normalizeBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw?.trim()) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return fallback;
}

function formatStartHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

function formatTitleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function computeShortlistScore(input: {
  relevance_score: number;
  price: number;
  walk_minutes: number;
}): number {
  const affordability = input.price <= 0 ? 20 : Math.max(0, 20 - input.price * 0.7);
  const walkability = Math.max(0, 18 - input.walk_minutes * 0.6);
  const relevance = input.relevance_score * 8;
  return Number((relevance + affordability + walkability).toFixed(2));
}

export function buildAiConciergeResponse(input: {
  query: string;
  model_available?: string;
  model_version?: string;
  retrieval_limit: number;
  filters?: SearchFilters;
}): AiConciergeResponse {
  const prompt_version = 'ai_concierge_prompt_v1';
  const model_version = input.model_version?.trim() || 'concierge-local-2026-03-01';
  const modelAvailable = normalizeBoolean(input.model_available, true);

  const search = runUnifiedSmartSearch({
    query: input.query,
    filters: input.filters,
    limit: Math.max(1, Math.min(8, input.retrieval_limit)),
  });

  const citations = search.results.slice(0, 3).map((item) => ({
    event_id: item.id,
    title: item.title,
    borough: item.borough,
    category: item.category,
    reason: `${formatTitleCase(item.borough)} ${formatTitleCase(item.category)} match, starts ${formatStartHour(item.start_hour)}`,
  }));

  if (!modelAvailable) {
    const recommendationText = citations.length > 0
      ? citations.map((item, index) => `${index + 1}. ${item.title} (${formatTitleCase(item.borough)}).`).join(' ')
      : 'No direct matches found, so broaden your query by borough or category.';

    return {
      answer: `Model availability is degraded right now, so here is a grounded fallback from live catalog results: ${recommendationText}`,
      citations,
      telemetry: {
        prompt_version,
        model_version,
        fallback_used: true,
        fallback_reason: 'model_unavailable',
        retrieval_count: search.results.length,
      },
    };
  }

  const noMatchesAnswer = 'I could not find enough strong event matches yet. Try adding borough, category, or budget details for a better shortlist.';
  if (citations.length === 0) {
    return {
      answer: noMatchesAnswer,
      citations,
      telemetry: {
        prompt_version,
        model_version,
        fallback_used: false,
        retrieval_count: search.results.length,
      },
    };
  }

  const top = citations[0];
  const alternates = citations.slice(1);
  const alternateText = alternates.length > 0
    ? ` Also consider ${alternates.map((item) => item.title).join(' and ')}.`
    : '';

  return {
    answer: `Top recommendation is ${top.title} in ${formatTitleCase(top.borough)} because it aligns with your request and schedule profile.${alternateText}`,
    citations,
    telemetry: {
      prompt_version,
      model_version,
      fallback_used: false,
      retrieval_count: search.results.length,
    },
  };
}

export function buildAiShortlistResponse(input: {
  intent: string;
  model_available?: string;
  model_version?: string;
  max_items: number;
  filters?: SearchFilters;
}): AiShortlistResponse {
  const prompt_version = 'ai_shortlist_prompt_v1';
  const model_version = input.model_version?.trim() || 'shortlist-local-2026-03-01';
  const modelAvailable = normalizeBoolean(input.model_available, true);

  const retrievalCap = Math.max(3, Math.min(12, input.max_items * 3));
  const search = runUnifiedSmartSearch({
    query: input.intent,
    filters: input.filters,
    limit: retrievalCap,
  });

  const shortlisted = search.results
    .map((item) => {
      const score = computeShortlistScore({
        relevance_score: item.relevance_score,
        price: item.price,
        walk_minutes: item.walk_minutes,
      });
      const rationale = item.price === 0
        ? 'Strong relevance with free entry and low effort to attend.'
        : `Balanced relevance, price (${item.price}), and walk distance (${item.walk_minutes}m).`;
      return {
        event_id: item.id,
        title: item.title,
        borough: item.borough,
        category: item.category,
        price: item.price,
        start_hour: item.start_hour,
        walk_minutes: item.walk_minutes,
        score,
        rationale,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(6, input.max_items)));

  const summary = shortlisted.length === 0
    ? 'No shortlist candidates found. Expand constraints or intent.'
    : `Generated ${shortlisted.length} shortlist candidates ranked by relevance, affordability, and walk effort.`;

  if (!modelAvailable) {
    return {
      shortlist: shortlisted,
      summary: `${summary} Returned deterministic fallback ranking because model availability is degraded.`,
      telemetry: {
        prompt_version,
        model_version,
        fallback_used: true,
        fallback_reason: 'model_unavailable',
        retrieval_count: search.results.length,
      },
    };
  }

  return {
    shortlist: shortlisted,
    summary,
    telemetry: {
      prompt_version,
      model_version,
      fallback_used: false,
      retrieval_count: search.results.length,
    },
  };
}
