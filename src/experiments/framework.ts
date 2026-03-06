export type ExperimentId = 'ranking_blend_v1' | 'trust_controls_v1';
export type ExperimentVariant = 'control' | 'treatment';
export type ExperimentStatus = 'active' | 'paused' | 'rolled_back';
export type GuardrailStatus = 'insufficient_sample' | 'healthy' | 'stop_loss_triggered';

type ExperimentDefinition = {
  id: ExperimentId;
  name: string;
  status: ExperimentStatus;
  treatment_share: number;
  min_sample_size: number;
  stop_loss_delta: number;
  forced_variant?: ExperimentVariant;
};

type VariantMetrics = {
  exposures: number;
  clicks: number;
};

type ExperimentMetrics = Record<ExperimentVariant, VariantMetrics>;

export type SearchExperimentAssignment = {
  id: ExperimentId;
  variant: ExperimentVariant;
  guardrail_status: GuardrailStatus;
  rollback_recommended: boolean;
  min_sample_size: number;
  observed_sample_size: number;
};

export type ExperimentStatusSnapshot = {
  id: ExperimentId;
  name: string;
  status: ExperimentStatus;
  settings: {
    treatment_share: number;
    min_sample_size: number;
    stop_loss_delta: number;
    forced_variant?: ExperimentVariant;
  };
  metrics: {
    control: VariantMetrics;
    treatment: VariantMetrics;
    control_ctr: number;
    treatment_ctr: number;
  };
  guardrail: {
    status: GuardrailStatus;
    rollback_recommended: boolean;
  };
};

export type ExperimentSearchResult = {
  id: string;
  relevance_score: number;
  start_hour: number;
  price: number;
  best_value?: {
    score: number;
  };
  verification?: {
    status: 'verified' | 'pending' | 'unverified';
  };
  fraud_risk?: {
    band: 'low' | 'medium' | 'high';
  };
  review_authenticity?: {
    score: number;
    band: 'trusted' | 'mixed' | 'suspicious';
  };
  experiment_tags?: string[];
};

const definitions: Record<ExperimentId, ExperimentDefinition> = {
  ranking_blend_v1: {
    id: 'ranking_blend_v1',
    name: 'Ranking Blend v1',
    status: 'active',
    treatment_share: 50,
    min_sample_size: 20,
    stop_loss_delta: 0.08,
  },
  trust_controls_v1: {
    id: 'trust_controls_v1',
    name: 'Trust Controls v1',
    status: 'active',
    treatment_share: 35,
    min_sample_size: 20,
    stop_loss_delta: 0.06,
  },
};

const metrics: Record<ExperimentId, ExperimentMetrics> = {
  ranking_blend_v1: {
    control: { exposures: 0, clicks: 0 },
    treatment: { exposures: 0, clicks: 0 },
  },
  trust_controls_v1: {
    control: { exposures: 0, clicks: 0 },
    treatment: { exposures: 0, clicks: 0 },
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function deriveCtr(variantMetrics: VariantMetrics): number {
  if (variantMetrics.exposures <= 0) return 0;
  return variantMetrics.clicks / variantMetrics.exposures;
}

function evaluateGuardrail(definition: ExperimentDefinition): {
  status: GuardrailStatus;
  rollback_recommended: boolean;
  observed_sample_size: number;
} {
  const experimentMetrics = metrics[definition.id];
  const controlExposures = experimentMetrics.control.exposures;
  const treatmentExposures = experimentMetrics.treatment.exposures;
  const observedSample = Math.min(controlExposures, treatmentExposures);
  if (observedSample < definition.min_sample_size) {
    return {
      status: 'insufficient_sample',
      rollback_recommended: false,
      observed_sample_size: observedSample,
    };
  }

  const controlCtr = deriveCtr(experimentMetrics.control);
  const treatmentCtr = deriveCtr(experimentMetrics.treatment);
  if (treatmentCtr + definition.stop_loss_delta < controlCtr) {
    return {
      status: 'stop_loss_triggered',
      rollback_recommended: true,
      observed_sample_size: observedSample,
    };
  }

  return {
    status: 'healthy',
    rollback_recommended: false,
    observed_sample_size: observedSample,
  };
}

function assignVariant(definition: ExperimentDefinition, sessionId: string): ExperimentVariant {
  if (definition.forced_variant) return definition.forced_variant;
  const bucket = hashString(`${definition.id}:${sessionId}`) % 100;
  return bucket < definition.treatment_share ? 'treatment' : 'control';
}

export function assignSearchExperiments(input: {
  session_id?: string;
  enabled: boolean;
}): SearchExperimentAssignment[] {
  if (!input.enabled) return [];
  const sessionId = input.session_id?.trim();
  if (!sessionId) return [];

  const assignments: SearchExperimentAssignment[] = [];
  for (const definition of Object.values(definitions)) {
    if (definition.status === 'paused') continue;
    const variant = assignVariant(definition, sessionId);
    metrics[definition.id][variant].exposures += 1;
    const guardrail = evaluateGuardrail(definition);
    assignments.push({
      id: definition.id,
      variant,
      guardrail_status: guardrail.status,
      rollback_recommended: guardrail.rollback_recommended,
      min_sample_size: definition.min_sample_size,
      observed_sample_size: guardrail.observed_sample_size,
    });
  }
  return assignments;
}

function scoreForRankingBlend(result: ExperimentSearchResult): number {
  const bestValueScore = result.best_value?.score ?? clamp(100 - result.price * 2.5, 10, 100);
  return result.relevance_score * 0.72 + bestValueScore * 0.28;
}

function scoreForTrustControls(result: ExperimentSearchResult): number {
  let trustBoost = 0;
  if (result.verification?.status === 'verified') trustBoost += 2.2;
  if (result.verification?.status === 'pending') trustBoost += 0.8;
  if (result.verification?.status === 'unverified') trustBoost -= 0.9;
  if (result.fraud_risk?.band === 'low') trustBoost += 0.8;
  if (result.fraud_risk?.band === 'medium') trustBoost -= 0.7;
  if (result.fraud_risk?.band === 'high') trustBoost -= 2.2;
  if (result.review_authenticity?.band === 'trusted') trustBoost += 1.1;
  if (result.review_authenticity?.band === 'suspicious') trustBoost -= 1.6;
  return result.relevance_score + trustBoost;
}

export function applySearchExperimentAdjustments<T extends ExperimentSearchResult>(input: {
  results: T[];
  assignments: SearchExperimentAssignment[];
}): T[] {
  const rankingTreatment = input.assignments.find((item) => item.id === 'ranking_blend_v1' && item.variant === 'treatment');
  const trustTreatment = input.assignments.find((item) => item.id === 'trust_controls_v1' && item.variant === 'treatment');
  if (!rankingTreatment && !trustTreatment) {
    return input.results.map((result) => ({
      ...result,
      ...(input.assignments.length > 0
        ? { experiment_tags: input.assignments.map((item) => `${item.id}:${item.variant}`) }
        : {}),
    }));
  }

  return input.results
    .map((result) => {
      let score = result.relevance_score;
      if (rankingTreatment) score = scoreForRankingBlend(result);
      if (trustTreatment) score = scoreForTrustControls({ ...result, relevance_score: score });
      return {
        ...result,
        experiment_score: score,
        experiment_tags: input.assignments.map((item) => `${item.id}:${item.variant}`),
      } as T & { experiment_score: number };
    })
    .sort((a, b) => {
      const scoreA = (a as T & { experiment_score: number }).experiment_score;
      const scoreB = (b as T & { experiment_score: number }).experiment_score;
      return scoreB - scoreA || b.relevance_score - a.relevance_score || a.start_hour - b.start_hour;
    })
    .map((result) => {
      const { experiment_score: _unused, ...rest } = result as T & { experiment_score?: number };
      return rest as T;
    });
}

export function recordExperimentClickOutcomes(tokens: unknown): void {
  if (!Array.isArray(tokens)) return;
  for (const token of tokens) {
    if (typeof token !== 'string') continue;
    const [idRaw, variantRaw] = token.split(':');
    if ((idRaw !== 'ranking_blend_v1' && idRaw !== 'trust_controls_v1')) continue;
    if (variantRaw !== 'control' && variantRaw !== 'treatment') continue;
    const id = idRaw as ExperimentId;
    const variant = variantRaw as ExperimentVariant;
    metrics[id][variant].clicks += 1;
  }
}

export function getExperimentStatusSnapshot(): ExperimentStatusSnapshot[] {
  return (Object.values(definitions) as ExperimentDefinition[]).map((definition) => {
    const experimentMetrics = metrics[definition.id];
    const guardrail = evaluateGuardrail(definition);
    return {
      id: definition.id,
      name: definition.name,
      status: definition.status,
      settings: {
        treatment_share: definition.treatment_share,
        min_sample_size: definition.min_sample_size,
        stop_loss_delta: definition.stop_loss_delta,
        ...(definition.forced_variant ? { forced_variant: definition.forced_variant } : {}),
      },
      metrics: {
        control: { ...experimentMetrics.control },
        treatment: { ...experimentMetrics.treatment },
        control_ctr: Number(deriveCtr(experimentMetrics.control).toFixed(4)),
        treatment_ctr: Number(deriveCtr(experimentMetrics.treatment).toFixed(4)),
      },
      guardrail: {
        status: guardrail.status,
        rollback_recommended: guardrail.rollback_recommended,
      },
    };
  });
}

export function rollbackExperiment(input: {
  experiment_id: ExperimentId;
  reason?: string;
}): {
  success: boolean;
  experiment?: ExperimentStatusSnapshot;
  reason?: string;
} {
  const definition = definitions[input.experiment_id];
  if (!definition) {
    return { success: false, reason: 'not_found' };
  }
  definition.status = 'rolled_back';
  definition.forced_variant = 'control';
  const [snapshot] = getExperimentStatusSnapshot().filter((item) => item.id === input.experiment_id);
  return {
    success: true,
    experiment: snapshot,
    reason: input.reason,
  };
}

export function __resetExperimentFrameworkForTests(): void {
  for (const definition of Object.values(definitions)) {
    definition.status = 'active';
    delete definition.forced_variant;
  }
  for (const experimentMetrics of Object.values(metrics)) {
    experimentMetrics.control.exposures = 0;
    experimentMetrics.control.clicks = 0;
    experimentMetrics.treatment.exposures = 0;
    experimentMetrics.treatment.clicks = 0;
  }
}
