export type RubricBand = 'high' | 'medium' | 'low';

export type RubricCategory = 'grounding' | 'clarity' | 'actionability' | 'safety';

export type RubricScore = {
  category: RubricCategory;
  score: number;
  rationale: string;
};

export type QualityRubric = {
  scores: RubricScore[];
  overall_score: number;
  band: RubricBand;
};

export type ReviewSample = {
  id: string;
  feature: 'ai_concierge_chat' | 'ai_shortlist_builder' | 'ai_negotiation_prep_assistant' | 'ai_document_helper';
  output_type: string;
  session_id?: string;
  output_preview: string;
  rubric: QualityRubric;
  sampling_reason: 'low_quality' | 'random_sample';
  status: 'pending' | 'approved' | 'needs_revision';
  reviewer?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

const reviewSamplesById = new Map<string, ReviewSample>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function deriveBand(score: number): RubricBand {
  if (score >= 4) return 'high';
  if (score >= 2.8) return 'medium';
  return 'low';
}

function evaluateGrounding(citationCount: number): RubricScore {
  const score = citationCount >= 3 ? 5 : citationCount === 2 ? 4 : citationCount === 1 ? 3 : 1.5;
  return {
    category: 'grounding',
    score,
    rationale: citationCount > 0
      ? `Response cites ${citationCount} grounded source item(s).`
      : 'Response has no grounding citations.',
  };
}

function evaluateClarity(text: string): RubricScore {
  const normalized = text.trim();
  const sentenceCount = normalized.split(/[.!?]+/g).map((part) => part.trim()).filter(Boolean).length;
  const hasBullets = /\n\s*[-*]\s+/.test(normalized);
  const score = clamp((sentenceCount >= 2 ? 3.4 : 2.2) + (hasBullets ? 1 : 0.4), 1, 5);
  return {
    category: 'clarity',
    score,
    rationale: `Detected ${sentenceCount} sentence block(s)${hasBullets ? ' with list structure' : ''}.`,
  };
}

function evaluateActionability(actionItemCount: number): RubricScore {
  const score = actionItemCount >= 4 ? 5 : actionItemCount === 3 ? 4.2 : actionItemCount === 2 ? 3.4 : actionItemCount === 1 ? 2.7 : 1.8;
  return {
    category: 'actionability',
    score,
    rationale: actionItemCount > 0
      ? `Response includes ${actionItemCount} actionable item(s).`
      : 'Response lacks explicit actions/checklist items.',
  };
}

function evaluateSafety(isSafe: boolean): RubricScore {
  return {
    category: 'safety',
    score: isSafe ? 5 : 1,
    rationale: isSafe ? 'No safety issues detected.' : 'Potential safety issue detected.',
  };
}

export function buildQualityRubric(input: {
  output_text: string;
  citation_count: number;
  action_item_count: number;
  safe: boolean;
}): QualityRubric {
  const scores: RubricScore[] = [
    evaluateGrounding(input.citation_count),
    evaluateClarity(input.output_text),
    evaluateActionability(input.action_item_count),
    evaluateSafety(input.safe),
  ];

  const overall_score = round(scores.reduce((acc, item) => acc + item.score, 0) / scores.length);
  return {
    scores,
    overall_score,
    band: deriveBand(overall_score),
  };
}

function normalizeRate(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, 0, 1);
}

export function maybeCreateReviewSample(input: {
  feature: ReviewSample['feature'];
  output_type: string;
  output_text: string;
  rubric: QualityRubric;
  session_id?: string;
  sampling_rate?: string;
}): ReviewSample | undefined {
  const randomRate = normalizeRate(input.sampling_rate, 0.15);
  const lowQuality = input.rubric.band === 'low' || input.rubric.overall_score < 2.8;
  const randomSample = Math.random() < randomRate;
  if (!lowQuality && !randomSample) return undefined;

  const id = `ai_sample_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const sample: ReviewSample = {
    id,
    feature: input.feature,
    output_type: input.output_type,
    ...(input.session_id ? { session_id: input.session_id } : {}),
    output_preview: input.output_text.trim().slice(0, 280),
    rubric: input.rubric,
    sampling_reason: lowQuality ? 'low_quality' : 'random_sample',
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  reviewSamplesById.set(id, sample);
  return { ...sample, rubric: { ...sample.rubric, scores: sample.rubric.scores.map((item) => ({ ...item })) } };
}

export function listReviewSamples(): ReviewSample[] {
  return Array.from(reviewSamplesById.values())
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((sample) => ({
      ...sample,
      rubric: {
        ...sample.rubric,
        scores: sample.rubric.scores.map((item) => ({ ...item })),
      },
    }));
}

export function decideReviewSample(input: {
  sample_id: string;
  decision: 'approved' | 'needs_revision';
  reviewer?: string;
  notes?: string;
}): ReviewSample | undefined {
  const existing = reviewSamplesById.get(input.sample_id);
  if (!existing) return undefined;

  const updated: ReviewSample = {
    ...existing,
    status: input.decision,
    reviewer: input.reviewer?.trim() || existing.reviewer,
    notes: input.notes?.trim() || existing.notes,
    updated_at: new Date().toISOString(),
  };
  reviewSamplesById.set(input.sample_id, updated);
  return {
    ...updated,
    rubric: {
      ...updated.rubric,
      scores: updated.rubric.scores.map((item) => ({ ...item })),
    },
  };
}
